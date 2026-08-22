"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  animate,
  curva,
  mola,
  preferemenosMovimento,
  utils,
} from "../movimento/movimento";
import { curvas, tempos } from "../tokens/tokens";

import "./cartao-de-decisao.css";

/** O que foi decidido. `null` = ainda em aberto. */
export type Resultado = "aprovada" | "reprovada";

type EstadoDoCartao = {
  resultado: Resultado | null;
  /**
   * Se a coreografia já terminou.
   *
   * ⭐ **Diferente de `resultado`, e a diferença é o desenho da sequência.** O
   * estado muda no clique; a CONFIRMAÇÃO chega quando o contorno fecha a volta.
   * Os botões só preenchem aí — antes disso mostram que algo está acontecendo,
   * sem afirmar que acabou.
   *
   * ⚠️ Visual e só visual: `aria-pressed` acompanha `resultado`, não isto.
   * Adiar o estado ANUNCIADO faria o leitor de tela mentir por 700ms.
   */
  confirmado: boolean;
  pendente: boolean;
  decidir: (resultado: Resultado) => void;
};

const Contexto = createContext<EstadoDoCartao | null>(null);

function usarCartao(): EstadoDoCartao {
  const estado = useContext(Contexto);
  if (!estado) {
    throw new Error("Os controles precisam estar dentro de um <CartaoDeDecisao>.");
  }
  return estado;
}

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

  const [confirmado, setConfirmado] = useState(resultado !== null);

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
      setConfirmado(false);
      return;
    }
    if (!contorno) return;

    if (!veioDeGesto.current || preferemenosMovimento()) {
      utils.set(contorno, { strokeDashoffset: 0 });
      if (malha) utils.set(malha, { opacity: 1 });
      setConfirmado(true);
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
      /* Os botões só confirmam quando a volta fecha — ver a nota de `confirmado`. */
      onComplete: () => setConfirmado(true),
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
            {/* O inset de metade da espessura mantém o traço INTEIRO dentro da
                caixa — um stroke é centrado no caminho. O `rx` é o raio do
                cartão menos esse mesmo inset. */}
            <rect
              ref={contornoRef}
              x="1.5"
              y="1.5"
              rx="14.5"
              style={{ width: "calc(100% - 3px)", height: "calc(100% - 3px)" }}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
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
 * Os dois botões da decisão — aprovar e reprovar.
 *
 * ⭐ **Dois controles, e não um alternador.** Aprovar e reprovar são escolhas
 * opostas, não os dois lados de um interruptor: um `switch` obrigaria a pessoa a
 * passar por um estado para chegar ao outro, e não teria como representar "ainda
 * não decidi". Com dois botões, o estado aberto é simplesmente nenhum
 * pressionado.
 *
 * ⭐ **Alvo de 44px com desenho de 24px.** A margem negativa devolve ao cartão o
 * espaço extra, para os círculos alinharem com a primeira linha de texto sem
 * esticá-la.
 */
export function ControlesDeDecisao({ className }: { className?: string }) {
  const { resultado, confirmado, pendente, decidir } = usarCartao();

  return (
    <div
      role="group"
      aria-label="Decisão da tarefa"
      className={["cui-decisao__controles", className].filter(Boolean).join(" ")}
    >
      <Botao
        tipo="aprovada"
        rotulo="Aprovar tarefa"
        titulo={resultado === "aprovada" ? "Aprovada" : "Aprovar"}
        ativo={resultado === "aprovada"}
        confirmado={confirmado}
        pendente={pendente}
        aoClicar={() => decidir("aprovada")}
      >
        <path d="M20 6 9 17l-5-5" />
      </Botao>

      <Botao
        tipo="reprovada"
        rotulo="Reprovar tarefa"
        titulo={resultado === "reprovada" ? "Reprovada" : "Reprovar"}
        ativo={resultado === "reprovada"}
        confirmado={confirmado}
        pendente={pendente}
        aoClicar={() => decidir("reprovada")}
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </Botao>
    </div>
  );
}

function Botao({
  tipo,
  rotulo,
  titulo,
  ativo,
  confirmado,
  pendente,
  aoClicar,
  children,
}: {
  tipo: Resultado;
  rotulo: string;
  titulo: string;
  ativo: boolean;
  confirmado: boolean;
  pendente: boolean;
  aoClicar: () => void;
  children: ReactNode;
}) {
  const circuloRef = useRef<HTMLSpanElement>(null);
  const primeiro = useRef(true);
  const cheio = ativo && confirmado;

  /* O estalo acompanha a CONFIRMAÇÃO, não o clique: é o instante em que o
     contorno fecha a volta, e o círculo pousa junto com ele. */
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    const circulo = circuloRef.current;
    if (!circulo || !cheio || preferemenosMovimento()) return;
    animate(circulo, { scale: [0.82, 1], ease: mola("pulso") });
  }, [cheio]);

  return (
    <button
      type="button"
      onClick={aoClicar}
      /* Nome ESTÁVEL + `aria-pressed`: o padrão de toggle. Um rótulo que trocasse
         para "Desfazer" junto com `aria-pressed=true` leria como "Desfazer,
         pressionado" — o oposto do estado real. */
      aria-label={rotulo}
      aria-pressed={ativo}
      aria-busy={pendente || undefined}
      title={titulo}
      data-tipo={tipo}
      data-pendente={pendente ? "true" : undefined}
      /* O CSS pinta por `data-cheio` (visual, espera a volta fechar) e não por
         `aria-pressed` (anunciado, muda no clique). */
      data-cheio={cheio ? "true" : "false"}
      data-aguardando={ativo && !confirmado ? "true" : undefined}
      className="cui-decisao__botao"
    >
      <span ref={circuloRef} aria-hidden="true" className="cui-decisao__circulo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          {children}
        </svg>
      </span>
    </button>
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
