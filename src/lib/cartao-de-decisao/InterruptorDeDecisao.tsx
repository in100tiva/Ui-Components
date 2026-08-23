"use client";

import { useLayoutEffect, useRef } from "react";

import { animate, mola, preferemenosMovimento, utils } from "../movimento/movimento";
import { usarCartao } from "./contexto";
import type { Resultado } from "./contexto";

/**
 * Onde o centro da alavanca pousa em cada parada, medido no controle.
 *
 * ⭐ **O centro existe, e é o que separa este controle de um switch comum.** Um
 * interruptor de duas posições SEMPRE afirma um dos lados — pousado à esquerda,
 * ele diz "reprovada" mesmo numa tarefa que ninguém olhou ainda. A terceira
 * parada é a única forma honesta de desenhar "em aberto": a alavanca fica na
 * cintura, entre os dois lobos, sem tom nenhum aceso.
 *
 * ⛔ **Medido em pixels, e não em porcentagem da largura.** O centro de cada
 * lobo é `altura / 2` das bordas — porque o lobo é um círculo de raio igual à
 * metade da altura —, e isso não é uma fração fixa da LARGURA. A versão anterior
 * usava `0% / 50% / 100%` com uma margem lateral constante: só a parada da
 * esquerda caía no lugar, a do meio errava por 22px e a da direita punha a
 * alavanca 44px FORA do controle.
 */
export function paradasDe(elemento: Pick<HTMLElement, "clientWidth" | "clientHeight">) {
  const { clientWidth: largura, clientHeight: altura } = elemento;
  const raio = altura / 2;
  return { reprovada: raio, aberta: largura / 2, aprovada: largura - raio };
}

/**
 * **O interruptor de decisão** — dois lobos ligados por uma cintura, e o knob
 * deslizando entre eles.
 *
 * ⭐ **É um `radiogroup`, não um switch.** A semântica importa aqui: um
 * `switch` tem dois estados e nenhum jeito de dizer "ainda não decidi", enquanto
 * um grupo de rádios tem exatamente isso — nenhuma opção marcada. De quebra vem
 * o teclado certo de graça: as setas percorrem as opções e o espaço escolhe.
 *
 * ⛔ **Os alvos de toque são retângulos, e não os círculos que se vê.** Cada
 * metade do controle inteiro é clicável: o desenho tem 38px de knob, mas a área
 * de acerto tem a altura toda e metade da largura. Alvo do tamanho do desenho é
 * o erro clássico de switch bonito — bonito e difícil de acertar.
 */
export function InterruptorDeDecisao({ className }: { className?: string }) {
  const { resultado, confirmado, pendente, decidir } = usarCartao();
  const knobRef = useRef<HTMLSpanElement>(null);
  const primeiro = useRef(true);

  const chave = resultado ?? "aberta";
  const chaveAnterior = useRef(chave);

  /*
    ⚠️ **Uma mola para por LIMIAR, e o último quadro fica em `-0.018%` em vez de
    `0%`.** Ela termina quando a energia cai abaixo de um piso, não quando o
    valor bate no destino — e sobram milésimos de por cento no `style`.

    Tentei tirar isso de três formas: cravar o destino em `onComplete` (o
    anime.js escreve o render final DEPOIS dele, e desfaz), apagar o inline para
    o CSS reassumir (mesmo problema), e apagar num `requestAnimationFrame`
    posterior (idem). A conclusão é que a briga não valia: 0,018% de 108px são
    **dois centésimos de pixel**, e nenhuma tela tem essa resolução.

    Então o JavaScript é o dono da posição, do primeiro quadro ao último — sem
    regra de CSS competindo — e o resíduo fica documentado em vez de combatido.
  */
  useLayoutEffect(() => {
    const knob = knobRef.current;
    const trilho = knob?.parentElement;
    const anterior = chaveAnterior.current;
    chaveAnterior.current = chave;
    if (!knob || !trilho) return;

    /* Medido a cada mudança: o controle tem tamanho de token, mas quem o usa
       pode escalá-lo — e uma parada calculada uma vez só ficaria errada ali. */
    const destino = `${paradasDe(trilho)[chave]}px`;

    /* Montagem, ou nada mudou: posição exata, sem viagem. O primeiro quadro é
       estado, não gesto — a alavanca não desliza até o lugar na frente da
       pessoa. `useLayoutEffect` para que isso aconteça antes da pintura. */
    if (primeiro.current || anterior === chave || preferemenosMovimento()) {
      primeiro.current = false;
      utils.set(knob, { left: destino });
      return;
    }

    animate(knob, { left: destino, ease: mola("interruptor") });
  }, [chave]);

  return (
    <div
      role="radiogroup"
      aria-label="Decisão da tarefa"
      data-resultado={resultado ?? "aberta"}
      data-confirmado={confirmado ? "true" : "false"}
      className={["cui-interruptor", className].filter(Boolean).join(" ")}
    >
      {/*
        ⭐ **A cintura é um `<path>`, não dois círculos que se tocam.** Dois
        círculos sobrepostos deixam um vinco em V onde se encontram; a curva
        côncava entre eles é o que faz a forma parecer UMA peça — o efeito da
        referência. Ela é estática: o que se move é o knob, não o trilho.
      */}
      <svg
        aria-hidden="true"
        viewBox="0 0 108 44"
        preserveAspectRatio="none"
        className="cui-interruptor__trilho"
      >
        <path d="M22 0C36 0 42 9 54 9C66 9 72 0 86 0A22 22 0 0 1 86 44C72 44 66 35 54 35C42 35 36 44 22 44A22 22 0 0 1 22 0Z" />
      </svg>

      {/*
        O knob é HTML e não SVG por causa da sombra: `box-shadow` acompanha o
        `border-radius` de graça, enquanto a sombra equivalente em SVG exige um
        `<filter>` — mais caro e mais difícil de casar com `relevo-raso`.
      */}
      <span ref={knobRef} aria-hidden="true" className="cui-interruptor__knob" />

      <Lado
        tipo="reprovada"
        rotulo="Reprovar tarefa"
        marcado={resultado === "reprovada"}
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
        confirmado={confirmado}
        pendente={pendente}
        aoEscolher={() => decidir("aprovada")}
      >
        <path d="M20 6 9 17l-5-5" />
      </Lado>
    </div>
  );
}

function Lado({
  tipo,
  rotulo,
  marcado,
  confirmado,
  pendente,
  aoEscolher,
  children,
}: {
  tipo: Resultado;
  rotulo: string;
  marcado: boolean;
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
        ⛔ **Só o lado marcado fica na ordem de tabulação.** É a regra do grupo de
        rádios: o Tab entra e sai do GRUPO uma vez, e as setas escolhem dentro.
        Com todos em `tabIndex 0`, um grupo de dois já dobra o número de paradas
        que a pessoa atravessa para sair do cartão.

        Com nada marcado, o primeiro lado recebe a entrada — senão o grupo
        inteiro fica inalcançável pelo teclado justamente quando ninguém decidiu.
      */
      tabIndex={marcado || (!marcado && tipo === "reprovada" && !confirmado) ? 0 : -1}
      onClick={aoEscolher}
      onKeyDown={(evento) => {
        /* Setas percorrem o grupo — o comportamento que um radiogroup deve ter e
           que o navegador não dá a botões. */
        if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(evento.key)) {
          evento.preventDefault();
          const irmao = evento.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
            `[role="radio"]:not([data-tipo="${tipo}"])`,
          );
          irmao?.focus();
          irmao?.click();
        }
      }}
      data-tipo={tipo}
      /* O CSS pinta por `data-aceso` (visual, espera a volta fechar) e não por
         `aria-checked` (anunciado, muda no clique). */
      data-aceso={marcado && confirmado ? "true" : "false"}
      className="cui-interruptor__lado"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
