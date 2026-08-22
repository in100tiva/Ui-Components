"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import type { ReactNode } from "react";

import {
  animate,
  curva,
  mola,
  preferemenosMovimento,
  utils,
} from "../movimento/movimento";
import { curvas, tempos } from "../tokens/tokens";

import "./cartao-concluivel.css";

type EstadoDoCartao = {
  concluido: boolean;
  pendente: boolean;
  alternar: () => void;
  rotulo: string;
  detalhe: string | null;
};

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

  /*
    Marca que a próxima mudança de `concluido` veio de um clique AQUI. É o que
    separa "o servidor disse que está concluído" de "a pessoa acabou de
    concluir" — e só o segundo merece a animação.
  */
  const veioDeGesto = useRef(false);

  function alternar() {
    if (pendente) return;
    veioDeGesto.current = true;
    aoAlternar(!concluido);
  }

  useEffect(() => {
    const contorno = contornoRef.current;
    if (!contorno) return;

    if (!concluido) {
      veioDeGesto.current = false;
      return;
    }

    /* Chegou concluído (ou o pai reverteu para concluído sem gesto): o traço
       entra pronto, sem percurso. */
    if (!veioDeGesto.current || preferemenosMovimento()) {
      utils.set(contorno, { strokeDashoffset: 0 });
      return;
    }

    veioDeGesto.current = false;
    animate(contorno, {
      strokeDashoffset: [100, 0],
      duration: tempos.desenhoDoContorno,
      ease: curva(curvas.percurso),
    });
  }, [concluido]);

  return (
    <Contexto.Provider
      value={{ concluido, pendente, alternar, rotulo: rotuloDoCheck, detalhe }}
    >
      <article
        data-concluido={concluido ? "true" : "false"}
        className={["cui-cartao", className].filter(Boolean).join(" ")}
      >
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
  const { concluido, pendente, alternar, rotulo, detalhe } = usarCartao();
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
    if (!circulo || !concluido || preferemenosMovimento()) return;

    animate(circulo, { scale: [0.82, 1], ease: mola("pulso") });
  }, [concluido]);

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
