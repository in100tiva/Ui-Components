"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import "./casca.css";

export type ItemDeNavegacao = {
  id: string;
  rotulo: string;
  icone?: ReactNode;
  /** Um contador ou etiqueta à direita — "12", "novo". */
  selo?: string;
};

export type GrupoDeNavegacao = {
  /** Cabeçalho do grupo. Sem ele, os itens entram soltos. */
  titulo?: string;
  itens: readonly ItemDeNavegacao[];
};

/**
 * **A navegação da coluna** — e a pílula que desliza entre os itens.
 *
 * ⭐ **A pílula é UM elemento, não uma classe no item ativo.** Essa é a diferença
 * inteira: pintando o fundo do item, o marcador *pisca* de um lugar para o
 * outro, porque são dois nós distintos e nenhuma transição liga o fundo de um ao
 * fundo do outro. Sendo um elemento só, posicionado por medição, ele **viaja** —
 * e o olho acompanha para onde a navegação foi, em vez de reencontrar o
 * marcador no destino.
 *
 * ⛔ **O deslize NÃO é o indicador de estado.** Movimento acabou antes de a
 * pessoa terminar de olhar, e não existe para quem pediu `prefers-reduced-motion`.
 * Quem carrega o estado é `aria-current="page"` (leitor de tela), o peso da
 * fonte e a cor do texto — o deslize é enfeite por cima disso, e some sem
 * prejuízo.
 *
 * ⚠️ **A primeira medição não anima.** Sem essa trava a pílula nasce em (0,0) e
 * desliza até o item ativo no primeiro frame, toda vez que a página carrega —
 * um movimento que ninguém pediu e que sugere uma navegação que não houve.
 */
export function NavegacaoLateral({
  grupos,
  ativo,
  aoEscolher,
  rotulo = "Navegação",
}: {
  grupos: readonly GrupoDeNavegacao[];
  ativo: string | null;
  aoEscolher: (id: string) => void;
  rotulo?: string;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const itensRef = useRef(new Map<string, HTMLButtonElement>());

  const [pilula, setPilula] = useState<{ topo: number; altura: number } | null>(
    null,
  );
  const jaMediu = useRef(false);

  const medir = useCallback(() => {
    const item = ativo ? itensRef.current.get(ativo) : null;
    if (!item) {
      setPilula(null);
      jaMediu.current = false;
      return;
    }
    setPilula({ topo: item.offsetTop, altura: item.offsetHeight });
  }, [ativo]);

  /* `useLayoutEffect`: medir depois da pintura deixaria a pílula um frame atrás
     do item — visível como um tranco no primeiro clique. */
  useLayoutEffect(() => {
    medir();

    /*
      O tamanho da coluna muda sem o item ativo mudar: janela redimensionada,
      fonte do sistema aumentada, um rótulo que quebra em duas linhas. Sem
      observar, a pílula fica pendurada na medida antiga.
    */
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observador = new ResizeObserver(medir);
    observador.observe(container);
    return () => observador.disconnect();
  }, [medir]);

  /* O segundo render em diante pode animar — o primeiro, não. */
  const animando = jaMediu.current;
  if (pilula) jaMediu.current = true;

  return (
    <nav ref={containerRef} aria-label={rotulo} className="cui-nav">
      {pilula ? (
        <span
          aria-hidden="true"
          className="cui-nav__pilula"
          data-animando={animando ? "true" : "false"}
          style={{ top: pilula.topo, height: pilula.altura }}
        />
      ) : null}

      {grupos.map((grupo, i) => (
        <div key={grupo.titulo ?? i} className="cui-nav__grupo">
          {grupo.titulo ? (
            <h2 className="cui-nav__titulo">{grupo.titulo}</h2>
          ) : null}

          {grupo.itens.map((item) => {
            const eAtivo = item.id === ativo;
            return (
              <button
                key={item.id}
                type="button"
                ref={(el) => {
                  if (el) itensRef.current.set(item.id, el);
                  else itensRef.current.delete(item.id);
                }}
                onClick={() => aoEscolher(item.id)}
                /* `page` e não `true`: o item marca QUAL página está aberta.
                   `aria-current="true"` diria só "este é o atual" sem dizer de
                   quê — o leitor de tela anuncia diferente. */
                aria-current={eAtivo ? "page" : undefined}
                className="cui-nav__item"
              >
                {item.icone ? (
                  <span aria-hidden="true" className="cui-nav__icone">
                    {item.icone}
                  </span>
                ) : null}
                <span className="cui-nav__rotulo">{item.rotulo}</span>
                {item.selo ? (
                  <span className="cui-nav__selo">{item.selo}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
