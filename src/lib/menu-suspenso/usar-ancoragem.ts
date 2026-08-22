import { useCallback, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export type Lado = "baixo" | "cima";
export type Alinhamento = "inicio" | "fim";

export type Ancoragem = {
  esquerda: number;
  largura: number;
  /** Um dos dois é `null`: subir ancora pela BASE para o painel crescer para cima. */
  topo: number | null;
  base: number | null;
  lado: Lado;
  alturaMaxima: number;
};

/**
 * Onde o painel cabe — medido na janela, nunca decretado.
 *
 * Três decisões estão codificadas aqui, e nenhuma é estética:
 *
 * 1. **`position: fixed` contra a janela**, e não `absolute` contra o campo.
 *    Ancorado no container, o painel é RECORTADO por qualquer ancestral com
 *    `overflow` diferente de `visible` — um diálogo cujo miolo rola corta a
 *    lista na linha do rodapé, e recorte não é empilhamento: nenhum `z-index`
 *    traz de volta o que deixou de ser desenhado.
 *
 * 2. **O teto de altura é o espaço que SOBRA**, não uma fração da janela.
 *    `60vh` num campo a 300px do rodapé ainda manda painel para fora da tela,
 *    porque `vh` é fração da janela inteira e não do que resta abaixo do campo.
 *
 * 3. **Vira para cima quando embaixo é apertado**, e só então — virar por
 *    default deixaria o menu abrindo para cima no meio de uma tela vazia.
 */
export function usarAncoragem({
  gatilhoRef,
  ativo,
  afastamento,
  teto,
  alinhamento,
  alturaMinima,
}: {
  gatilhoRef: RefObject<HTMLElement | null>;
  ativo: boolean;
  afastamento: number;
  teto: number;
  alinhamento: Alinhamento;
  /** Abaixo disto, o espaço "não serve" e o painel prefere virar. */
  alturaMinima: number;
}) {
  const [ancoragem, setAncoragem] = useState<Ancoragem | null>(null);

  const medir = useCallback(() => {
    const gatilho = gatilhoRef.current;
    if (!gatilho) return;

    const r = gatilho.getBoundingClientRect();
    const alturaDaJanela = window.innerHeight;

    const abaixo = alturaDaJanela - r.bottom - afastamento;
    const acima = r.top - afastamento;

    /* Vira só quando embaixo não serve E em cima é de fato melhor. */
    const lado: Lado = abaixo < alturaMinima && acima > abaixo ? "cima" : "baixo";
    const disponivel = lado === "cima" ? acima : abaixo;

    setAncoragem({
      esquerda: alinhamento === "fim" ? r.right - r.width : r.left,
      largura: r.width,
      topo: lado === "baixo" ? r.bottom + afastamento : null,
      base: lado === "cima" ? alturaDaJanela - r.top + afastamento : null,
      lado,
      alturaMaxima: Math.max(alturaMinima, Math.min(teto, disponivel)),
    });
  }, [gatilhoRef, afastamento, teto, alinhamento, alturaMinima]);

  /*
    `useLayoutEffect`: a medição tem de acontecer ANTES da pintura. Num `useEffect`
    o painel chega a ser desenhado uma vez em (0,0), e o olho pega esse frame como
    um pulo do canto superior esquerdo até o campo.
  */
  useLayoutEffect(() => {
    if (!ativo) {
      setAncoragem(null);
      return;
    }

    medir();

    /*
      Rolar ou redimensionar move o gatilho e o painel `fixed` fica para trás.
      Remedir (em vez de fechar) mantém o menu colado ao campo mesmo com rolagem
      por trackpad, que dispara dezenas de eventos por segundo — daí o `passive`
      e o remedir barato, que só lê um rect.
    */
    const remedir = () => medir();
    window.addEventListener("scroll", remedir, { passive: true, capture: true });
    window.addEventListener("resize", remedir, { passive: true });

    return () => {
      window.removeEventListener("scroll", remedir, { capture: true });
      window.removeEventListener("resize", remedir);
    };
  }, [ativo, medir]);

  return ancoragem;
}
