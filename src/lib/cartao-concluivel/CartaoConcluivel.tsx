"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";

import {
  animate,
  curva,
  mola,
  ondaEmMalha,
  preferemenosMovimento,
  utils,
} from "../movimento/movimento";
import { contagens, curvas, tempos } from "../tokens/tokens";

import "./cartao-concluivel.css";

type EstadoDoCartao = {
  concluido: boolean;
  /**
   * Se a coreografia já terminou.
   *
   * ⭐ **Diferente de `concluido`, e a diferença é o desenho da sequência.** O
   * estado muda no clique; a CONFIRMAÇÃO chega quando o contorno fecha a volta.
   * O check preenche só aí — antes disso ele mostra que algo está acontecendo,
   * sem afirmar que acabou.
   *
   * ⚠️ Isto é visual e só visual: `aria-pressed` acompanha `concluido`, não
   * isto. Adiar o estado ANUNCIADO faria o leitor de tela mentir por 700ms.
   */
  confirmado: boolean;
  pendente: boolean;
  alternar: () => void;
  rotulo: string;
  detalhe: string | null;
};

/** Blocos da malha, na ordem em que o grid os desenha. */
const COLUNAS = contagens.malhaColunas;
const LINHAS = contagens.malhaLinhas;
const TOTAL_DE_BLOCOS = COLUNAS * LINHAS;

/**
 * O peso de cada bloco — entre 0 e 1, e sempre o MESMO para o mesmo índice.
 *
 * ⛔ **Determinístico, nunca `Math.random()`.** Sorteio no render dá pesos
 * diferentes a cada repintura: a malha "ferve" ao rolar a lista, e em SSR o
 * servidor sorteia um valor e o cliente outro — erro de hidratação garantido.
 * Esta é a função de ruído mais barata que existe: seno multiplicado por um
 * primo grande, com a parte inteira descartada.
 */
function pesoDoBloco(indice: number): number {
  const bruto = Math.sin(indice * 12.9898) * 43758.5453;
  return bruto - Math.floor(bruto);
}

const Contexto = createContext<EstadoDoCartao | null>(null);

function usarCartao(): EstadoDoCartao {
  const estado = useContext(Contexto);
  if (!estado) {
    throw new Error(
      "CheckDeConclusao precisa estar dentro de um <CartaoConcluivel>.",
    );
  }
  return estado;
}

export type PropsDoCartaoConcluivel = {
  /** O estado. Controlado — quem manda é quem usa. */
  concluido: boolean;
  /** O novo valor pedido pelo gesto. Gravar (ou não) é decisão de quem usa. */
  aoAlternar: (concluido: boolean) => void;
  /** Enquanto grava: o controle fica em `aria-busy` e recusa novos cliques. */
  pendente?: boolean;
  /**
   * O nome acessível do check. **Estável** — não troque para "Desmarcar…".
   *
   * ⛔ Um rótulo que muda junto com `aria-pressed` lê no leitor de tela como
   * "Desmarcar, pressionado": o oposto do estado real. O nome diz O QUE o
   * controle é; o estado, como ele está.
   */
  rotuloDoCheck?: string;
  /** "Concluída por Ana em 03/08" — vira `title` e pode ir ao rodapé. */
  detalhe?: string | null;
  children: ReactNode;
  className?: string;
};

/**
 * **Cartão concluível** — o contorno que se desenha ao marcar.
 *
 * Marcar o check faz a borda verde **percorrer** o cartão a partir do canto
 * superior esquerdo, de ponta a ponta. Não é um fade de cor: é um traço sendo
 * desenhado, e a diferença é o que transforma "o estado mudou" em "eu fiz isso".
 *
 * ## As três decisões que fazem isto funcionar
 *
 * ⭐ **`pathLength={100}` normaliza o perímetro.** É o que permite a MESMA
 * animação servir a um cartão de três linhas e a um de trinta: seja qual for o
 * tamanho real, o contorno tem "comprimento 100" e o traço percorre de 100 a 0.
 * Sem isso, cada altura de cartão precisaria do próprio `strokeDasharray`
 * medido — e cartões diferentes desenhariam em velocidades diferentes.
 *
 * ⭐ **São DUAS camadas de borda, e as duas precisam existir.** A borda CSS de
 * 1px é o TRILHO — fraca, já presente, mostrando o estado desde o primeiro
 * quadro. O `<rect>` SVG por cima é a borda de verdade do estado concluído.
 * Com uma só, o contorno se desenha sobre o nada e o cartão pisca de
 * sem-borda para com-borda antes de o traço começar.
 *
 * ⛔ **A animação pertence ao GESTO, não ao estado.** Um cartão que já chega
 * concluído renderiza o traço PRONTO. Sem essa distinção, abrir uma lista de
 * vinte e cinco tarefas concluídas desenha vinte e cinco contornos em coro —
 * o que é circo, não retorno. Desmarcar também não anima: só marcar é conquista.
 */
export function CartaoConcluivel({
  concluido,
  aoAlternar,
  pendente = false,
  rotuloDoCheck = "Conclusão da tarefa",
  detalhe = null,
  children,
  className,
}: PropsDoCartaoConcluivel) {
  const contornoRef = useRef<SVGRectElement>(null);
  const malhaRef = useRef<HTMLDivElement>(null);

  /*
    Marca que a próxima mudança de `concluido` veio de um clique AQUI. É o que
    separa "o servidor disse que está concluído" de "a pessoa acabou de
    concluir" — e só o segundo merece a animação.
  */
  const veioDeGesto = useRef(false);

  /* A confirmação VISUAL, que chega quando a coreografia fecha a volta. */
  const [confirmado, setConfirmado] = useState(concluido);

  function alternar() {
    if (pendente) return;
    veioDeGesto.current = true;
    aoAlternar(!concluido);
  }

  /* Os blocos da malha são estáveis: mesmo array, mesmos pesos, sempre. */
  const blocos = useMemo(
    () =>
      Array.from({ length: TOTAL_DE_BLOCOS }, (_, i) => ({
        chave: i,
        peso: pesoDoBloco(i),
      })),
    [],
  );

  useEffect(() => {
    const contorno = contornoRef.current;
    if (!contorno) return;

    if (!concluido) {
      veioDeGesto.current = false;
      setConfirmado(false);
      return;
    }

    const pixels = malhaRef.current
      ? (Array.from(malhaRef.current.children) as HTMLElement[])
      : [];

    /*
      Chegou concluído sem gesto (ou a pessoa pediu menos movimento): tudo entra
      PRONTO — traço fechado, malha acesa, check preenchido. Nada percorre nada.
    */
    if (!veioDeGesto.current || preferemenosMovimento()) {
      utils.set(contorno, { strokeDashoffset: 0 });
      for (const pixel of pixels) pixel.style.opacity = "1";
      setConfirmado(true);
      return;
    }

    veioDeGesto.current = false;

    /*
      ⭐ **A malha acende ANTES de o contorno fechar** — 520ms contra 700ms. É o
      ambiente se iluminando enquanto o traço ainda percorre; invertido, o cartão
      termina de se contornar e só então o fundo acende, e a recompensa chega
      depois do fim.
    */
    if (pixels.length > 0) {
      animate(pixels, {
        opacity: [0, 1],
        duration: tempos.acenderDaMalha,
        delay: ondaEmMalha(COLUNAS, LINHAS, tempos.passoDaMalha),
        ease: curva(curvas.percurso),
      });
    }

    animate(contorno, {
      strokeDashoffset: [100, 0],
      duration: tempos.desenhoDoContorno,
      ease: curva(curvas.percurso),
      /*
        ⭐ **O check só confirma quando a volta FECHA.** Preencher o círculo no
        clique afirma o fim antes de ele existir, e a animação vira enfeite
        rodando depois do fato. Adiando, a sequência conta uma história: o traço
        percorre, a malha acende, e o check confirma no instante em que as duas
        coisas se encontram.

        ⚠️ Só o VISUAL espera. `aria-pressed` acompanha `concluido` desde o
        clique — adiar o estado anunciado faria o leitor de tela mentir por
        700ms sobre o que a pessoa acabou de fazer.
      */
      onComplete: () => setConfirmado(true),
    });
  }, [concluido]);

  return (
    <Contexto.Provider
      value={{
        concluido,
        confirmado,
        pendente,
        alternar,
        rotulo: rotuloDoCheck,
        detalhe,
      }}
    >
      <article
        data-concluido={concluido ? "true" : "false"}
        className={["cui-cartao", className].filter(Boolean).join(" ")}
      >
        {/*
          ⭐ **A malha de pixels.** Blocos quadrados com degradê verde que acendem
          em onda diagonal, do canto inferior direito na direção do texto. Ela é
          ATMOSFERA: o teto de opacidade é baixo e uma máscara a apaga na área de
          leitura, porque textura sobre a frase que a pessoa está lendo deixa de
          ser efeito e vira ruído.

          ⚠️ Só existe no estado concluído — são 70 nós por cartão, e numa lista
          longa de tarefas já concluídas isso conta. É o custo consciente do
          efeito, e some inteiro ao desmarcar.
        */}
        {concluido ? (
          <div ref={malhaRef} aria-hidden="true" className="cui-cartao__malha">
            {blocos.map((bloco) => (
              <span
                key={bloco.chave}
                style={{ "--cui-peso": bloco.peso } as CSSProperties}
              />
            ))}
          </div>
        ) : null}

        {concluido ? (
          <svg
            aria-hidden="true"
            className="cui-cartao__contorno"
            /*
              `preserveAspectRatio="none"` porque o `viewBox` não existe: o
              `<rect>` usa porcentagem e acompanha a caixa real. Sem isso o SVG
              tentaria manter proporção e o traço sairia oval num cartão largo.
            */
            preserveAspectRatio="none"
          >
            {/*
              O inset de metade da espessura mantém o traço INTEIRO dentro da
              caixa — um stroke é centrado no caminho, então metade dele
              vazaria. O `rx` é o raio do cartão menos esse mesmo inset, senão o
              contorno "abre" nos cantos em relação à borda-trilho.
            */}
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
              /* Começa invisível: quem decide se ele aparece de uma vez ou
                 percorrendo é o efeito acima. */
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
 * O círculo que marca a conclusão. Vive em qualquer lugar dentro do cartão.
 *
 * ⭐ **Alvo de 44px com desenho de 24px.** A margem negativa devolve ao cartão o
 * espaço que o alvo ocupa a mais, para o círculo alinhar com a primeira linha de
 * texto sem esticá-la. É o mínimo de área de toque das diretrizes — e um check
 * de 24px é justamente o tamanho em que errar o clique é comum.
 */
export function CheckDeConclusao({ className }: { className?: string }) {
  const { concluido, confirmado, pendente, alternar, rotulo, detalhe } =
    usarCartao();
  const circuloRef = useRef<HTMLSpanElement>(null);
  const primeiroRender = useRef(true);

  /*
    ⭐ **O círculo ESTALA ao ser marcado.** É a mola `pulso` (a mais rígida do
    sistema, ~130ms): o círculo encolhe e volta, e o gesto ganha resposta no
    instante do toque — antes de o contorno ter percorrido um terço do cartão.
    Sem ele, os 700ms do traço são 700ms em que o único retorno está longe do
    dedo que tocou.
  */
  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    const circulo = circuloRef.current;
    if (!circulo || !confirmado || preferemenosMovimento()) return;

    /* O estalo acompanha a CONFIRMAÇÃO, não o clique: é o instante em que o
       contorno fecha a volta, e o círculo pousa junto com ele. */
    animate(circulo, { scale: [0.82, 1], ease: mola("pulso") });
  }, [confirmado]);

  return (
    <button
      type="button"
      onClick={alternar}
      /* Nome estável + `aria-pressed`: o padrão de toggle. Ver `rotuloDoCheck`. */
      aria-label={rotulo}
      aria-pressed={concluido}
      aria-busy={pendente || undefined}
      title={concluido ? (detalhe ?? "Concluída") : "Marcar como concluída"}
      data-pendente={pendente ? "true" : undefined}
      /* O CSS pinta por `data-confirmado`, não por `aria-pressed`: o primeiro é
         o estado visual (espera a volta fechar), o segundo é o anunciado (muda
         no clique). Ver a nota de `confirmado`. */
      data-confirmado={confirmado ? "true" : "false"}
      data-aguardando={concluido && !confirmado ? "true" : undefined}
      className={["cui-cartao__check", className].filter(Boolean).join(" ")}
    >
      <span ref={circuloRef} aria-hidden="true" className="cui-cartao__circulo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    </button>
  );
}

/**
 * A linha de rodapé do cartão — some quando não há conclusão a relatar.
 *
 * Existe para que o estado seja LEGÍVEL, e não só colorido: o contorno verde
 * comunica por cor e forma, e nenhum dos dois chega a quem usa leitor de tela ou
 * não distingue verde. A frase chega.
 */
export function RodapeDeConclusao({ children }: { children?: ReactNode }) {
  const { concluido, detalhe } = usarCartao();
  const id = useId();

  if (!concluido) return null;

  return (
    <p id={id} className="cui-cartao__rodape">
      {children ?? detalhe ?? "Concluída"}
    </p>
  );
}
