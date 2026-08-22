import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Fecha ao clicar fora — contando o painel PORTALIZADO como "dentro".
 *
 * Este é o defeito clássico de popover em portal: o painel vive no `<body>`,
 * fora da árvore DOM do campo, então `container.contains(alvo)` responde
 * "clicou fora" para o clique num item da própria lista — e a escolha vira um
 * fechamento sem seleção. Por isso a checagem passa por TODOS os nós.
 *
 * `pointerdown`, e não `click`: com `click` o menu só fecharia quando o botão
 * fosse solto, e arrastar para fora deixaria o painel aberto sobre a tela.
 */
export function usarCliqueFora(
  nos: readonly RefObject<HTMLElement | null>[],
  ativo: boolean,
  aoClicarFora: () => void,
) {
  useEffect(() => {
    if (!ativo) return;

    function aoApontar(evento: PointerEvent) {
      const alvo = evento.target as Node | null;
      if (!alvo) return;
      if (nos.some((no) => no.current?.contains(alvo))) return;
      aoClicarFora();
    }

    document.addEventListener("pointerdown", aoApontar, true);
    return () => document.removeEventListener("pointerdown", aoApontar, true);
    /* `nos` é um array literal recriado a cada render pelo chamador; comparar por
       referência religaria o listener toda vez. O tamanho é fixo, então as refs
       individuais são as dependências reais. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, aoClicarFora, ...nos]);
}
