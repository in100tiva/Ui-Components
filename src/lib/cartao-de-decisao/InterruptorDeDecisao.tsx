"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { usarCliqueFora } from "../menu-suspenso/usar-clique-fora";
import { animate, mola, preferemenosMovimento, utils } from "../movimento/movimento";
import { formas } from "../tokens/tokens";
import { usarCartao } from "./contexto";
import type { Resultado } from "./contexto";

/**
 * Onde o centro da alavanca pousa em cada parada, medido no controle.
 *
 * ⛔ **Em pixels, e não em porcentagem da largura.** O centro de cada lobo é
 * `altura / 2` das bordas — porque o lobo é um círculo de raio igual à metade da
 * altura —, e isso não é uma fração fixa da LARGURA. Uma versão usava
 * `0% / 50% / 100%` com margem lateral constante: só a parada da esquerda caía
 * no lugar, a do meio errava por 22px e a da direita punha a alavanca 44px FORA
 * do controle.
 */
export function paradasDe(elemento: Pick<HTMLElement, "clientWidth" | "clientHeight">) {
  const { clientWidth: largura, clientHeight: altura } = elemento;
  const raio = altura / 2;
  return { reprovada: raio, aberta: largura / 2, aprovada: largura - raio };
}

/**
 * **O interruptor de decisão** — um botão que vira switch, e volta a ser botão.
 *
 * ## Três formas, e a do meio é efêmera
 *
 * **Fechado, sem decisão** — um botão redondo com reticências. É a forma em que
 * o controle passa a maior parte da vida numa lista de tarefas por decidir.
 *
 * **Aberto** — o botão se estende em dois lobos ligados por uma cintura, e as
 * duas opções aparecem. Existe só enquanto alguém escolhe.
 *
 * **Decidido** — colapsa de volta ao círculo, agora com o ícone e a cor do que
 * foi escolhido.
 *
 * ⭐ **Por que colapsar, em vez de deixar o switch sempre aberto.** Um switch de
 * duas posições com a alavanca no meio afirma uma escolha em curso que não
 * existe: ela fica ENTRE aprovar e reprovar, encostando nos dois. O botão
 * fechado não afirma nada — que é exatamente o estado de uma tarefa que ninguém
 * decidiu. As opções aparecem quando alguém vai usá-las.
 *
 * ⭐ **A transformação é uma largura só.** O `<svg>` do trilho tem `viewBox`
 * fixo e `preserveAspectRatio="xMinYMid slice"`: com 44px de largura, o que cabe
 * no quadro é exatamente o lobo esquerdo — um círculo. Crescendo até 108px, a
 * cintura e o segundo lobo entram em cena. Não são duas formas trocando de
 * lugar: é uma sendo revelada.
 *
 * ⭐ **Quem fecha o controle é a CONFIRMAÇÃO, não o clique.** É o mesmo
 * `confirmado` que o resto do cartão espera: a alavanca vai para o lado
 * escolhido, o contorno percorre a borda e, quando a volta fecha, o interruptor
 * se recolhe mostrando o resultado. A sequência inteira termina junto.
 */
export function InterruptorDeDecisao({
  ancora = "inicio",
  className,
}: {
  /**
   * De que borda a forma se abre.
   *
   * ⭐ **Escolha pelo LADO do cartão em que o controle vive.** Com o controle à
   * direita, o espaço para crescer está à esquerda: `"fim"` ancora o desenho na
   * borda direita, e o segundo lobo entra pela esquerda enquanto o primeiro fica
   * parado exatamente onde o dedo tocou. Com `"inicio"` num controle à direita, o
   * lobo que estava sob o dedo VIAJA para longe dele durante a expansão.
   */
  ancora?: "inicio" | "fim";
  className?: string;
}) {
  const { resultado, confirmado, pendente, decidir } = usarCartao();

  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const primeiro = useRef(true);

  const [aberto, setAberto] = useState(false);

  /*
    ⭐ **Qualquer decisão recolhe o controle — inclusive "nenhuma".**

    Escolher um lado recolhe quando a volta FECHA (o mesmo `confirmado` que o
    resto do cartão espera): a alavanca chega ao lobo, o contorno percorre a
    borda, e tudo se recolhe junto.

    Desfazer recolhe na hora, e por um motivo específico: sem isso o controle
    ficaria aberto com a alavanca na cintura — entre aprovar e reprovar,
    encostando nos dois —, que é precisamente o estado ambíguo que a forma
    fechada existe para eliminar.
  */
  const resultadoAnterior = useRef(resultado);
  useEffect(() => {
    const anterior = resultadoAnterior.current;
    resultadoAnterior.current = resultado;

    if (resultado !== null && confirmado) setAberto(false);
    else if (resultado === null && anterior !== null) setAberto(false);
  }, [resultado, confirmado]);

  /* Desistir é sair de perto: clicar fora fecha sem decidir nada. */
  usarCliqueFora([containerRef], aberto, () => setAberto(false));

  /* Enquanto a coreografia roda, o controle continua aberto — é o que deixa ver
     a alavanca chegar ao lado escolhido antes de tudo se recolher. */
  const expandido = aberto || (resultado !== null && !confirmado);
  const chave: Resultado | "aberta" = expandido ? (resultado ?? "aberta") : "aberta";

  const larguraAlvo = expandido
    ? formas.interruptorLargura
    : formas.interruptorAltura;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const knob = knobRef.current;
    if (!container || !knob) return;

    /*
      A parada é calculada sobre a largura de DESTINO, e não sobre a atual: as
      duas animações correm juntas, e medir o container no meio da expansão
      poria a alavanca numa cintura que ainda está se formando.
    */
    const destino = `${paradasDe({
      clientWidth: larguraAlvo,
      clientHeight: formas.interruptorAltura,
    })[chave]}px`;

    if (primeiro.current || preferemenosMovimento()) {
      primeiro.current = false;
      utils.set(container, { width: `${larguraAlvo}px` });
      utils.set(knob, { left: destino });
      return;
    }

    animate(container, { width: `${larguraAlvo}px`, ease: mola("interruptor") });
    animate(knob, { left: destino, ease: mola("interruptor") });
  }, [chave, larguraAlvo]);

  /* Abrir pelo teclado tem de levar o foco para dentro — senão a pessoa abre as
     opções e precisa de um Tab extra para alcançá-las. */
  useEffect(() => {
    if (!aberto) return;
    containerRef.current
      ?.querySelector<HTMLButtonElement>('[role="radio"][tabindex="0"]')
      ?.focus();
  }, [aberto]);

  return (
    <div
      ref={containerRef}
      data-resultado={resultado ?? "aberta"}
      data-expandido={expandido ? "true" : "false"}
      data-ancora={ancora}
      className={["cui-interruptor", className].filter(Boolean).join(" ")}
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && aberto) {
          /* Um cartão dentro de um diálogo: sem parar a propagação, o mesmo
             Escape fecharia os dois. */
          evento.stopPropagation();
          setAberto(false);
          gatilhoRef.current?.focus();
        }
      }}
    >
      {/*
        ⭐ **Uma forma só, revelada.** O `slice` mantém a proporção e recorta: em
        44px de largura, o que cabe no quadro é um lobo inteiro — um círculo
        perfeito. A largura crescendo traz a cintura e o segundo lobo para
        dentro.

        A âncora (`xMin` ou `xMax`) escolhe QUAL lobo fica parado. É o que
        permite ao controle à direita do cartão abrir para a esquerda sem que o
        alvo fuja de debaixo do dedo — ver a prop `ancora`.
      */}
      <svg
        aria-hidden="true"
        viewBox="0 0 108 44"
        preserveAspectRatio={
          ancora === "fim" ? "xMaxYMid slice" : "xMinYMid slice"
        }
        className="cui-interruptor__trilho"
      >
        <path d="M22 0C36 0 42 9 54 9C66 9 72 0 86 0A22 22 0 0 1 86 44C72 44 66 35 54 35C42 35 36 44 22 44A22 22 0 0 1 22 0Z" />
      </svg>

      <span ref={knobRef} aria-hidden="true" className="cui-interruptor__knob" />

      {expandido ? (
        <div
          role="radiogroup"
          aria-label="Decisão da tarefa"
          className="cui-interruptor__opcoes"
        >
          <Lado
            tipo="reprovada"
            rotulo="Reprovar tarefa"
            marcado={resultado === "reprovada"}
            entrada={resultado !== "aprovada"}
            confirmado={confirmado}
            pendente={pendente}
            aoEscolher={() => decidir("reprovada")}
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </Lado>

          <Lado
            tipo="aprovada"
            rotulo="Aprovar tarefa"
            marcado={resultado === "aprovada"}
            entrada={resultado === "aprovada"}
            confirmado={confirmado}
            pendente={pendente}
            aoEscolher={() => decidir("aprovada")}
          >
            <path d="M20 6 9 17l-5-5" />
          </Lado>
        </div>
      ) : (
        /*
          A forma fechada é UM botão, e o `aria-expanded` diz que ele REVELA
          algo — a diferença entre "botão que decide" e "botão que abre as
          opções de decisão".
        */
        <button
          ref={gatilhoRef}
          type="button"
          onClick={() => setAberto(true)}
          disabled={pendente}
          aria-expanded={false}
          aria-label={
            resultado === "aprovada"
              ? "Aprovada. Abrir para mudar a decisão"
              : resultado === "reprovada"
                ? "Reprovada. Abrir para mudar a decisão"
                : "Decidir a tarefa"
          }
          data-resultado={resultado ?? "aberta"}
          className="cui-interruptor__gatilho"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {resultado === "aprovada" ? (
              <path d="M20 6 9 17l-5-5" />
            ) : resultado === "reprovada" ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              /* Reticências: a mesma promessa dos três traços do hambúrguer —
                 "há opções aqui", sem afirmar nenhuma delas. */
              <g fill="currentColor" stroke="none">
                <circle cx="6" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="18" cy="12" r="1.6" />
              </g>
            )}
          </svg>
        </button>
      )}
    </div>
  );
}

function Lado({
  tipo,
  rotulo,
  marcado,
  entrada,
  confirmado,
  pendente,
  aoEscolher,
  children,
}: {
  tipo: Resultado;
  rotulo: string;
  marcado: boolean;
  /** Se é este que recebe o foco quando o Tab entra no grupo. */
  entrada: boolean;
  confirmado: boolean;
  pendente: boolean;
  aoEscolher: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcado}
      aria-label={rotulo}
      aria-busy={pendente || undefined}
      /*
        ⛔ **Só um lado fica na ordem de tabulação.** É a regra do grupo de
        rádios: o Tab entra e sai do GRUPO uma vez, e as setas escolhem dentro.
        Com os dois em `tabIndex 0`, um grupo de dois já dobra as paradas que a
        pessoa atravessa para sair do cartão.
      */
      tabIndex={entrada ? 0 : -1}
      onClick={aoEscolher}
      onKeyDown={(evento) => {
        /* Setas percorrem o grupo — o que um radiogroup deve fazer, e que o
           navegador não dá de graça a botões. */
        if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(evento.key)) {
          evento.preventDefault();
          const irmao = evento.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
            `[role="radio"]:not([data-tipo="${tipo}"])`,
          );
          irmao?.focus();
        }
      }}
      data-tipo={tipo}
      /* O CSS pinta por `data-aceso` (visual, espera a volta fechar) e não por
         `aria-checked` (anunciado, muda no clique). */
      data-aceso={marcado && confirmado ? "true" : "false"}
      className="cui-interruptor__lado"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
