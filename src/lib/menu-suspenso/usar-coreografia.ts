import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { contagens, curvas, tempos } from "../tokens/tokens";
import type { Lado } from "./usar-ancoragem";

export type EstadoDaCoreografia = "fechado" | "aberto" | "fechando";

/*
  ⭐ **Nenhum número de tempo é escrito aqui.** Todos vêm de `tokens/tokens.json`
  pelo arquivo gerado — os mesmos que o CSS lê como custom properties. Antes
  disso, ajustar o ritmo da coreografia exigia mudar o valor em dois lugares e
  lembrar dos dois; o sintoma de esquecer um era a entrada e a saída ficarem em
  cadências diferentes, que é o tipo de defeito que se sente sem se enxergar.
*/
const bezier = (b: readonly number[]) => `cubic-bezier(${b.join(",")})`;

function atrasoEscalonado(posicao: number): number {
  return Math.min(posicao, contagens.tetoEscalonado) * tempos.passoItem;
}

function prefereMenosMovimento(): boolean {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * **A coreografia de saída do design** — e a montagem que sobrevive a ela.
 *
 * A entrada é CSS puro (o painel cresce, os itens entram escalonados). A SAÍDA
 * é Web Animations API, e precisa ser: ela anima `maxHeight` a partir da altura
 * MEDIDA de cada item, e altura medida não existe em folha de estilo.
 *
 * ## O que acontece, em ordem
 *
 * 1. Cada item **colapsa**: `maxHeight` da altura real até zero, padding junto,
 *    opacidade já em zero na metade do caminho, e um empurrão de 4px na direção
 *    do gatilho. O item não some — ele se **retrai**, e a lista encolhe com ele.
 * 2. O escalonamento parte do item **mais longe de quem abriu o menu**: com o
 *    painel para baixo, o último item sai primeiro; para cima, o primeiro. A
 *    lista se recolhe *em direção ao campo*, e não de cima para baixo.
 * 3. Só depois de tudo recolhido — mais `pausaAntesDoPainel` — o painel
 *    recua 10px na direção do gatilho, encolhe para 0.965 e sai.
 *
 * ## Três armadilhas que estão resolvidas aqui
 *
 * ⛔ **`fill: "forwards"` + reabertura.** Animação criada por script vence CSS
 * na cascata. Reabrir no meio do fechamento — um duplo clique no gatilho basta —
 * deixaria as animações antigas prendendo os mesmos nós em `opacity: 0`: o menu
 * "abre" invisível. Pior, o `onfinish` da saída ainda dispararia e desmontaria o
 * menu que a pessoa acabou de reabrir. `cancel()` desfaz as duas coisas: remove
 * o fill e dispara `oncancel`, nunca `onfinish`.
 *
 * ⛔ **Lista vazia daria atraso NEGATIVO.** O escalonamento do painel parte de
 * `total - 1`, e a Web Animations API não ignora um delay negativo: ela começa a
 * animação já adiantada, e o painel sairia com um salto. Com a barra de filtrar,
 * "nada corresponde" é exatamente uma lista de zero itens.
 *
 * ⛔ **`onfinish` não dispara em aba de segundo plano.** Sem o timer de
 * segurança, o painel ficaria montado e invisível, capturando cliques para
 * sempre.
 */
export function usarCoreografia({
  painelRef,
  listaRef,
  direcaoRef,
}: {
  painelRef: RefObject<HTMLElement | null>;
  /** Onde estão os itens quando a barra de busca os agrupa. */
  listaRef: RefObject<HTMLElement | null>;
  /**
   * Para que lado o painel abriu, por REF e não por valor.
   *
   * Duas razões, e as duas importam. A primeira é de dependência: o lado só é
   * conhecido depois da medição, que por sua vez só acontece depois de o painel
   * montar — e quem decide se ele monta é este hook. Passar o valor fecharia o
   * ciclo. A segunda é de estabilidade: o lado é remedido a cada rolagem, e um
   * valor nas dependências de `fechar` recriaria o callback — e com ele o efeito
   * de clique fora — dezenas de vezes por segundo num trackpad.
   */
  direcaoRef: RefObject<Lado>;
}) {
  const [estado, setEstado] = useState<EstadoDaCoreografia>("fechado");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animacoesRef = useRef<Animation[]>([]);

  const encerrar = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    animacoesRef.current = [];
    setEstado("fechado");
  }, []);

  const cancelarEmVoo = useCallback(() => {
    for (const animacao of animacoesRef.current) animacao.cancel();
    animacoesRef.current = [];
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const abrir = useCallback(() => {
    cancelarEmVoo();
    setEstado("aberto");
  }, [cancelarEmVoo]);

  /**
   * Fecha com a coreografia.
   *
   * `imediato` existe para os caminhos em que ela NÃO deve rodar: escolha pelo
   * teclado (o foco tem de voltar ao gatilho agora, não em meio segundo), Escape,
   * Tab, desmontagem, e `prefers-reduced-motion`.
   */
  const fechar = useCallback(
    (imediato = false) => {
      const painel = painelRef.current;

      if (imediato || !painel || prefereMenosMovimento()) {
        cancelarEmVoo();
        encerrar();
        return;
      }

      /* Já fechando: deixa a coreografia em voo terminar em vez de empilhar uma
         segunda por cima dos mesmos nós. */
      if (animacoesRef.current.length > 0) return;

      setEstado("fechando");

      const itens = Array.from(
        (listaRef.current ?? painel).children,
      ) as HTMLElement[];
      const total = itens.length;
      const ultimo = Math.max(total - 1, 0);

      /* O painel recolhe NA DIREÇÃO DO GATILHO: para baixo ele sobe (−Y), para
         cima ele desce (+Y). O sinal também inverte a ordem do escalonamento. */
      const paraCima = direcaoRef.current === "cima";
      const sentido = paraCima ? 1 : -1;

      const animacoes = itens.map((item, i) => {
        const estilo = getComputedStyle(item);
        /* Sem `overflow: hidden` o conteúdo transborda a caixa que encolhe, e o
           texto continua desenhado sobre um item de altura zero. */
        item.style.overflow = "hidden";

        return item.animate(
          [
            {
              opacity: 1,
              maxHeight: `${item.offsetHeight}px`,
              paddingTop: estilo.paddingTop,
              paddingBottom: estilo.paddingBottom,
              transform: "translateY(0)",
            },
            /* A opacidade chega a zero na METADE do colapso: o item termina de
               se recolher já invisível, e o que se vê é a lista encurtando, não
               texto espremido. */
            { opacity: 0, offset: 0.5 },
            {
              opacity: 0,
              maxHeight: "0px",
              paddingTop: "0px",
              paddingBottom: "0px",
              transform: `translateY(${sentido * 4}px)`,
            },
          ],
          {
            duration: tempos.saidaItem,
            delay: atrasoEscalonado(paraCima ? i : total - 1 - i),
            easing: bezier(curvas.colapso),
            fill: "forwards",
          },
        );
      });

      const saida = painel.animate(
        [
          { opacity: 1, transform: "translateY(0) scale(1)" },
          {
            opacity: 0,
            transform: `translateY(${sentido * 10}px) scale(0.965)`,
          },
        ],
        {
          duration: tempos.saidaPainel,
          delay: atrasoEscalonado(ultimo) + tempos.pausaAntesDoPainel,
          easing: bezier(curvas.saida),
          fill: "forwards",
        },
      );

      saida.onfinish = encerrar;
      animacoesRef.current = [...animacoes, saida];

      timerRef.current = setTimeout(
        encerrar,
        atrasoEscalonado(ultimo) +
          tempos.pausaAntesDoPainel +
          tempos.saidaPainel +
          tempos.folgaDoTimer,
      );
    },
    [painelRef, listaRef, encerrar, cancelarEmVoo],
  );

  /* Desmontar com animações em voo deixa `onfinish` chamando setState em
     componente morto. */
  useEffect(() => cancelarEmVoo, [cancelarEmVoo]);

  return {
    estado,
    aberto: estado === "aberto",
    montado: estado !== "fechado",
    abrir,
    fechar,
  };
}
