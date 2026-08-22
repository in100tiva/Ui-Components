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
 *
 * 4. **A janela tem margem, e ela é descontada do espaço disponível** — nos
 *    quatro lados. Um painel colado no rodapé fica atrás da barra de tarefas do
 *    sistema; colado na lateral, some pela borda. Nenhum dos dois dá erro.
 */
export function usarAncoragem({
  gatilhoRef,
  ativo,
  afastamento,
  teto,
  alinhamento,
  alturaMinima,
  margem,
  aoMedir,
}: {
  gatilhoRef: RefObject<HTMLElement | null>;
  ativo: boolean;
  afastamento: number;
  teto: number;
  alinhamento: Alinhamento;
  /**
   * Abaixo disto, o espaço "não serve" e o painel prefere virar de lado.
   *
   * ⚠️ É um critério de DECISÃO, não um piso de tamanho. Confundir os dois é o
   * que fazia o painel atravessar a borda da janela.
   */
  alturaMinima: number;
  /** A folga que o painel nunca invade, em qualquer borda da janela. */
  margem: number;
  /**
   * Avisado quando a medição existe (ou deixa de existir).
   *
   * ⭐ **Chamado de DENTRO do `useLayoutEffect`, e é isso que importa.** Quem
   * espera a medição para animar precisa saber dela antes da pintura; um
   * `useEffect` no consumidor observando o retorno deste hook só saberia um
   * ciclo depois, e nesse intervalo o painel é desenhado sem a animação ter
   * começado.
   */
  aoMedir?: (medido: boolean) => void;
}) {
  const [ancoragem, setAncoragem] = useState<Ancoragem | null>(null);

  const medir = useCallback(() => {
    const gatilho = gatilhoRef.current;
    if (!gatilho) return;

    const r = gatilho.getBoundingClientRect();
    const alturaDaJanela = window.innerHeight;
    const larguraDaJanela = document.documentElement.clientWidth;

    /*
      ⛔ **A margem é descontada do espaço, não checada no fim.** O painel nunca
      encosta na borda da janela: colado no rodapé ele fica em cima da barra de
      tarefas do sistema, e no celular, sob a barra de endereço — em ambos os
      casos as últimas opções ficam atrás de outra coisa. `clientWidth` do
      `documentElement` e não `innerWidth`: aquele já desconta a barra de
      rolagem da página, este não, e a diferença é exatamente a largura da barra
      vazando para fora da tela.
    */
    const abaixo = alturaDaJanela - r.bottom - afastamento - margem;
    const acima = r.top - afastamento - margem;

    /* Vira só quando embaixo não serve E em cima é de fato melhor. */
    const lado: Lado = abaixo < alturaMinima && acima > abaixo ? "cima" : "baixo";
    const disponivel = lado === "cima" ? acima : abaixo;

    /*
      ⛔ **Sem `Math.max(alturaMinima, …)` aqui, e a ausência é o conserto.**
      Estava escrito assim, e o efeito era o oposto do pretendido: com 40px de
      espaço real, o piso de 168px MANDAVA o painel atravessar a borda da
      janela. `alturaMinima` diz quando VIRAR de lado, nunca quanto ocupar —
      quando não há espaço nenhum dos dois lados, a resposta certa é um painel
      curto que rola, não um painel inteiro fora da tela.
    */
    const alturaMaxima = Math.max(0, Math.min(teto, disponivel));

    /* No eixo horizontal a regra é a mesma: o painel acompanha a largura do
       campo, mas nunca passa das margens. Num campo largo perto da borda, é o
       que impede a lista de sangrar para fora. */
    const largura = Math.min(r.width, larguraDaJanela - margem * 2);
    const preferida = alinhamento === "fim" ? r.right - largura : r.left;
    const esquerda = Math.min(
      Math.max(preferida, margem),
      larguraDaJanela - largura - margem,
    );

    setAncoragem({
      esquerda,
      largura,
      topo: lado === "baixo" ? r.bottom + afastamento : null,
      base: lado === "cima" ? alturaDaJanela - r.top + afastamento : null,
      lado,
      alturaMaxima,
    });
    aoMedir?.(true);
  }, [gatilhoRef, afastamento, teto, alinhamento, alturaMinima, margem, aoMedir]);

  /*
    `useLayoutEffect`: a medição tem de acontecer ANTES da pintura. Num `useEffect`
    o painel chega a ser desenhado uma vez em (0,0), e o olho pega esse frame como
    um pulo do canto superior esquerdo até o campo.
  */
  useLayoutEffect(() => {
    if (!ativo) {
      setAncoragem(null);
      aoMedir?.(false);
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
  }, [ativo, medir, aoMedir]);

  return ancoragem;
}
