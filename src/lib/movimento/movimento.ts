import { createSpring, createTimeline, animate, stagger, utils } from "animejs";
import type { JSAnimation, StaggerFunction, Timeline } from "animejs";

import { contagens, molas, tempos } from "../tokens/tokens";

/**
 * **A camada de movimento** — o anime.js falando a língua do nosso design.
 *
 * Nenhum componente importa `animejs` direto, e isso não é cerimônia:
 *
 * 1. **As molas viram nomes.** Um componente pede `mola("painel")`, não
 *    `{ stiffness: 190, damping: 22 }`. Números de física espalhados por vinte
 *    arquivos são vinte dialetos de movimento — e é assim que uma interface
 *    passa a ter cinco personalidades diferentes sem ninguém decidir isso.
 * 2. **`prefers-reduced-motion` é respeitado UMA vez.** Aqui. Espalhado, ele
 *    vira a coisa que se esquece — e esquecer não dá erro nenhum, só deixa de
 *    funcionar para quem depende.
 * 3. **A troca é local.** Se o anime.js sair um dia, sai deste arquivo.
 */

export type NomeDeMola = keyof typeof molas;

/**
 * Uma mola do design, pronta para o `ease` do anime.js.
 *
 * ⚠️ **Mola não tem `duration`, e passar uma junto a anula.** A duração de uma
 * mola é o tempo que a energia leva para acabar — o anime.js a calcula a partir
 * de massa, rigidez e amortecimento. Declarar `duration: 300` ao lado joga a
 * física fora e deixa um easing com nome de mola.
 */
export function mola(nome: NomeDeMola) {
  return createSpring({ ...molas[nome] });
}

/** Se a pessoa pediu menos movimento. Lido a cada chamada — a preferência muda
 *  no meio da sessão, e um valor capturado no módulo nunca saberia. */
export function preferemenosMovimento(): boolean {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * O escalonamento do design, em milissegundos.
 *
 * `from` diz de onde a onda parte: `"first"` quando o painel abre para baixo
 * (o topo está encostado no gatilho) e `"last"` quando abre para cima. É a
 * mesma regra em todo lugar — **quem se move primeiro é quem está mais perto de
 * quem tocou.**
 *
 * ⛔ O teto de `contagens.tetoEscalonado` é imitado com `total`: sem ele, uma
 * lista de 40 itens espalha a onda por 1,8s e o menu parece travado.
 */
export function ondaDeItens(
  de: "first" | "last",
  quantidade: number,
  /* O tipo é anotado porque `stagger` tem sobrecargas por tipo de valor, e
     `ReturnType` escolheria a última delas — a de string. */
): StaggerFunction<number> {
  const teto = contagens.tetoEscalonado;
  /* Comprimir o passo quando a lista passa do teto mantém a onda inteira dentro
     da mesma janela de tempo, em vez de cortá-la no oitavo item. */
  const passo =
    quantidade > teto
      ? (tempos.passoItem * teto) / quantidade
      : tempos.passoItem;

  return stagger(passo, { from: de });
}

/**
 * Roda uma coreografia, ou pula direto para o fim.
 *
 * ⭐ **É aqui que `prefers-reduced-motion` é atendido, e "pular" significa
 * `seek(duration)` — não "não animar".** A diferença importa: uma animação que
 * simplesmente não roda deixa os elementos nos valores INICIAIS (um painel em
 * `opacity: 0`, invisível para sempre). Indo ao último quadro, o resultado é o
 * estado final, imediato — que é o que a preferência pede.
 */
export function coreografar(
  montar: () => Timeline,
  aoTerminar?: () => void,
): Timeline {
  const linha = montar();

  if (preferemenosMovimento()) {
    /* `complete` já disparou dentro do `seek`, então o callback é chamado à mão
       — e uma vez só. */
    linha.seek(linha.duration);
    linha.pause();
    aoTerminar?.();
  }

  return linha;
}

/**
 * Devolve os nós ao CSS, apagando o que a animação escreveu em `style`.
 *
 * ⛔ **Isto não é opcional depois de animar, e a razão é sutil.** O anime.js
 * termina com os valores finais escritos inline — o que está certo enquanto a
 * animação manda. Mas um `opacity: 1` inline sobrevive à animação e passa a
 * vencer QUALQUER regra da folha de estilo para sempre: o `:hover` do item para
 * de funcionar, o `maxHeight` do CSS deixa de valer, e nada disso dá erro. O
 * conserto é apagar, não sobrescrever com "o valor certo" — só a string vazia
 * devolve a propriedade à cascata.
 *
 * As três propriedades de transform individuais entram junto porque a v4 pode
 * escrever em `transform` OU em `translate`/`rotate`/`scale`, dependendo do que
 * está sendo animado.
 */
export function devolverAoCss(alvos: readonly HTMLElement[] | HTMLElement) {
  const lista = Array.isArray(alvos) ? alvos : [alvos as HTMLElement];
  for (const el of lista) {
    el.style.opacity = "";
    el.style.maxHeight = "";
    el.style.paddingTop = "";
    el.style.paddingBottom = "";
    el.style.overflow = "";
    el.style.transform = "";
    el.style.translate = "";
    el.style.rotate = "";
    el.style.scale = "";
  }
}

export { animate, createTimeline, utils };
export type { JSAnimation, Timeline };
