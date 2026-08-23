"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  animate,
  curva,
  preferemenosMovimento,
  utils,
} from "../movimento/movimento";
import { curvas, tempos } from "../tokens/tokens";
import { Contexto, usarCartao } from "./contexto";
import type { Resultado } from "./contexto";

import "./cartao-de-decisao.css";

export type { Resultado };

export type PropsDoCartaoDeDecisao = {
  /** O estado. Controlado — quem manda é quem usa. `null` = em aberto. */
  resultado: Resultado | null;
  /**
   * A decisão pedida pelo gesto. Recebe `null` quando o botão já ativo é
   * clicado de novo — desfazer é voltar ao aberto, não trocar de lado.
   */
  aoDecidir: (resultado: Resultado | null) => void;
  /** Enquanto grava: os controles ficam em `aria-busy` e recusam cliques. */
  pendente?: boolean;
  /** "Aprovada por Ana em 03/08" — vira `title` e pode ir ao rodapé. */
  detalhe?: string | null;
  children: ReactNode;
  className?: string;
};

/**
 * **Cartão de decisão** — o contorno que se desenha ao aprovar ou reprovar.
 *
 * Decidir faz três coisas ao mesmo tempo: uma lavagem de cor toma o fundo, uma
 * malha de pontos finos aparece por trás em varredura, e a borda **percorre** o
 * cartão de ponta a ponta. Verde para aprovada, vermelho para reprovada — os
 * dois caminhos têm exatamente o mesmo desenho, só a família de cor muda.
 *
 * ## As decisões que fazem isto funcionar
 *
 * ⭐ **`pathLength={100}` normaliza o perímetro.** É o que permite a MESMA
 * animação servir a um cartão de três linhas e a um de trinta: seja qual for o
 * tamanho real, o contorno tem "comprimento 100". Sem isso, cada altura
 * precisaria do próprio `strokeDasharray` medido.
 *
 * ⭐ **São DUAS camadas de borda.** A borda CSS de 1px é o TRILHO — fraca, já
 * presente desde o primeiro quadro. O `<rect>` SVG por cima é a borda de
 * verdade. Com uma só, o traço se desenha sobre o nada e o cartão pisca de
 * sem-borda para com-borda.
 *
 * ⭐ **A malha é UM elemento, não centenas.** Os pontos são um
 * `background-image` de gradientes radiais em ladrilho, e o degradê de
 * densidade vem de uma máscara. Uma versão anterior usava 70 `<span>` — com
 * pontos do tamanho pedido seriam mais de quinhentos por cartão, e uma lista de
 * tarefas resolvidas viraria dezenas de milhares de nós.
 *
 * ⛔ **A animação pertence ao GESTO, não ao estado.** Um cartão que já chega
 * decidido renderiza tudo PRONTO. Sem isso, abrir uma lista de vinte e cinco
 * tarefas resolvidas dispara vinte e cinco coreografias em coro — circo, não
 * retorno. Desfazer também não anima.
 */
export function CartaoDeDecisao({
  resultado,
  aoDecidir,
  pendente = false,
  detalhe = null,
  children,
  className,
}: PropsDoCartaoDeDecisao) {
  const contornoRef = useRef<SVGRectElement>(null);
  const malhaRef = useRef<HTMLDivElement>(null);

  /* Separa "o servidor disse que está decidido" de "a pessoa acabou de decidir"
     — e só o segundo merece a coreografia. */
  const veioDeGesto = useRef(false);

  /*
    ⭐ **`confirmado` é DERIVADO de qual resultado já foi confirmado — não é um
    booleano próprio.** A diferença aparece ao trocar de lado com o cartão já
    decidido.

    Com um booleano, ele continuava `true` do estado anterior enquanto a nova
    coreografia rodava: o interruptor via "já confirmou" no mesmo instante do
    clique e se recolhia na hora, sem a alavanca atravessar nem o contorno
    percorrer. A segunda decisão não tinha animação nenhuma.

    ⛔ E zerá-lo dentro do efeito NÃO resolve: efeitos de FILHO rodam antes dos
    do pai, então o interruptor já teria lido `true` e fechado antes de o cartão
    corrigir. Guardando *para qual resultado* a confirmação vale, a comparação
    dá `false` no MESMO render em que o novo resultado chega — sem intervalo em
    que alguém possa ler o estado antigo.
  */
  const [confirmadoPara, setConfirmadoPara] = useState<Resultado | null>(resultado);
  const confirmado = resultado !== null && confirmadoPara === resultado;

  function decidir(escolha: Resultado) {
    if (pendente) return;
    veioDeGesto.current = true;
    /* Clicar de novo no lado já ativo desfaz — voltar ao aberto, não trocar. */
    aoDecidir(resultado === escolha ? null : escolha);
  }

  useEffect(() => {
    const contorno = contornoRef.current;
    const malha = malhaRef.current;

    if (resultado === null) {
      veioDeGesto.current = false;
      setConfirmadoPara(null);
      return;
    }
    if (!contorno) return;

    if (!veioDeGesto.current || preferemenosMovimento()) {
      utils.set(contorno, { strokeDashoffset: 0 });
      if (malha) utils.set(malha, { opacity: 1 });
      setConfirmadoPara(resultado);
      return;
    }

    veioDeGesto.current = false;

    /*
      ⭐ **A malha varre, e a varredura é uma custom property.** `--cui-varredura`
      vai de 0 a 1 e move o gradiente da máscara: os pontos aparecem em frente,
      do canto oposto ao texto na direção dele. Animar a propriedade em vez de
      cada ponto é o que mantém o efeito em UM elemento.
    */
    if (malha) {
      utils.set(malha, { opacity: 1 });
      animate(malha, {
        "--cui-varredura": [0, 1],
        duration: tempos.acenderDaMalha,
        ease: curva(curvas.percurso),
      });
    }

    animate(contorno, {
      strokeDashoffset: [100, 0],
      duration: tempos.desenhoDoContorno,
      ease: curva(curvas.percurso),
      /* Os controles só confirmam quando a volta fecha — ver a nota de
         `confirmadoPara`. */
      onComplete: () => setConfirmadoPara(resultado),
    });
  }, [resultado]);

  return (
    <Contexto.Provider value={{ resultado, confirmado, pendente, decidir }}>
      <article
        data-resultado={resultado ?? "aberta"}
        title={detalhe ?? undefined}
        className={["cui-decisao", className].filter(Boolean).join(" ")}
      >
        {/*
          A lavagem de cor. Um irmão em vez do `background` do cartão porque ele
          precisa de opacidade própria para entrar suave — mexer na opacidade do
          cartão levaria o texto junto.
        */}
        {resultado ? (
          <div aria-hidden="true" className="cui-decisao__vidro" />
        ) : null}

        {/*
          ⭐ **A malha de pontos, em UM elemento.** Os pontos são um
          `background-image` de gradientes radiais em ladrilho de 6px; a
          densidade aparente vem da máscara, que os apaga em degradê na direção
          do texto. É o que permite pontos de 1px — com elementos reais seriam
          mais de quinhentos nós por cartão.
        */}
        {resultado ? (
          <div ref={malhaRef} aria-hidden="true" className="cui-decisao__malha" />
        ) : null}

        {resultado ? (
          <svg
            aria-hidden="true"
            className="cui-decisao__contorno"
            /* Sem `viewBox`, o `<rect>` usa porcentagem e acompanha a caixa
               real; sem isto o SVG manteria proporção e o traço sairia oval. */
            preserveAspectRatio="none"
          >
            {/*
              O inset de metade da espessura mantém o traço INTEIRO dentro da
              caixa — um stroke é centrado no caminho. O `rx` é o raio do cartão
              (16) menos esse mesmo inset.

              ⚠️ **1,5px, e não 3.** O traço não é a única cor na borda: o cartão
              decidido já tinge o próprio `border` de 1px com `--tom-borda`, e
              as duas somadas liam como uma faixa de 4px em volta do conteúdo —
              grossa demais para um sistema cujo vocabulário de borda é 1px. Com
              1,5px o traço continua sendo o elemento mais forte da moldura (é
              ele que percorre o cartão), sem virar contorno de destaque.

              ⛔ Os quatro números andam juntos: mudar a espessura sem mudar o
              inset joga metade do traço para fora da caixa, e o `overflow:
              hidden` do cartão corta essa metade — o traço fica com aparência
              de 0,75px em cima e 1,5px no meio das laterais.
            */}
            <rect
              ref={contornoRef}
              x="0.75"
              y="0.75"
              rx="15.25"
              style={{ width: "calc(100% - 1.5px)", height: "calc(100% - 1.5px)" }}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={100}
            />
          </svg>
        ) : null}

        {children}
      </article>
    </Contexto.Provider>
  );
}

/**
 * A linha de rodapé — some enquanto não há decisão.
 *
 * Existe para o estado ser LEGÍVEL, e não só colorido: contorno e lavagem
 * comunicam por cor, e cor não chega a quem usa leitor de tela nem distingue
 * verde de vermelho — que é exatamente o par mais comum de daltonismo.
 */
export function RodapeDaDecisao({ children }: { children?: ReactNode }) {
  const { resultado } = usarCartao();
  if (!resultado) return null;

  return (
    <p className="cui-decisao__rodape">
      {children ?? (resultado === "aprovada" ? "Aprovada" : "Reprovada")}
    </p>
  );
}
