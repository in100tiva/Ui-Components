"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AlvoDeSoltura, ItemArrastavel } from "./tipos";

/**
 * **Arrastar e soltar por eventos de PONTEIRO** — não pela API de drag do HTML.
 *
 * ⛔ **A API nativa (`draggable`, `dragover`, `drop`) foi descartada de
 * propósito**, e não é preciosismo: ela desenha o próprio fantasma a partir de
 * uma captura do elemento, que ninguém consegue estilizar; não dispara em toque
 * na maioria dos navegadores móveis; e obriga a `preventDefault` no `dragover`
 * para permitir a soltura — o defeito mais comum e mais difícil de perceber, já
 * que a única consequência é o cursor "proibido" sem nenhum erro.
 *
 * Com eventos de ponteiro, o mesmo código serve mouse, caneta e toque, o
 * fantasma é um elemento nosso, e o alvo é decidido por nós.
 *
 * ⭐ **O arrasto só COMEÇA depois de 6px.** Sem esse limiar, todo clique numa
 * linha vira um micro-arrasto e a página fica escorregadia — abrir uma pasta
 * passa a exigir uma mão firme.
 *
 * ⚠️ **Arrastar não é acessível, e não há como torná-lo.** Quem navega por
 * teclado ou leitor de tela precisa de outro caminho para a mesma operação —
 * neste gerenciador, o item "Mover para" do menu de ações. Se você replicar
 * este padrão, replique também a alternativa: o arrasto é o atalho, nunca o
 * único caminho.
 */

const LIMIAR_EM_PIXELS = 6;

export type EstadoDoArrasto = {
  item: ItemArrastavel;
  /** O alvo sob o ponteiro agora — `null` quando não há nenhum aceitável. */
  alvo: AlvoDeSoltura | null;
};

export type OpcoesDeArrasto = {
  aoSoltar: (item: ItemArrastavel, alvo: AlvoDeSoltura) => void;
  /** Recusa alvos inválidos: a pasta nela mesma, o arquivo na pasta onde já está. */
  podeSoltar?: (item: ItemArrastavel, alvo: AlvoDeSoltura) => boolean;
};

/**
 * Marca um elemento como destino. É só um par de atributos: o alvo é
 * descoberto pelo DOM sob o ponteiro, e não por um registro de retângulos
 * medidos no início — que é o que quebra assim que a lista rola durante o
 * arrasto, sem nada na tela indicando o motivo.
 */
export function propsDeAlvo(alvo: AlvoDeSoltura) {
  return {
    "data-alvo-tipo": alvo.tipo,
    "data-alvo-id": alvo.id ?? "",
  } as const;
}

function alvoSobOPonto(x: number, y: number): AlvoDeSoltura | null {
  if (typeof document === "undefined") return null;
  const alvo = document.elementFromPoint(x, y);
  const caixa = alvo?.closest<HTMLElement>("[data-alvo-tipo]");
  if (!caixa) return null;

  const tipo = caixa.dataset.alvoTipo;
  if (tipo !== "pasta" && tipo !== "raiz") return null;
  return { tipo, id: caixa.dataset.alvoId || null };
}

export function usarArrastarESoltar({ aoSoltar, podeSoltar }: OpcoesDeArrasto) {
  const [arrasto, setArrasto] = useState<EstadoDoArrasto | null>(null);

  /** O fantasma é movido pelo DOM, não por estado: 60 renders por segundo para
   *  mudar dois pixels é a forma mais fácil de deixar um arrasto travado. */
  const fantasmaRef = useRef<HTMLDivElement>(null);
  const pendente = useRef<{ item: ItemArrastavel; x: number; y: number } | null>(null);
  const ativo = useRef<EstadoDoArrasto | null>(null);

  const posicionarFantasma = (x: number, y: number) => {
    const el = fantasmaRef.current;
    if (!el) return;
    /* 14px à frente do ponteiro: sob ele, o fantasma tapa exatamente o pixel que
       decide o alvo, e a pessoa deixa de ver onde vai soltar. */
    el.style.transform = `translate3d(${x + 14}px, ${y + 14}px, 0)`;
  };

  const encerrar = useCallback(() => {
    pendente.current = null;
    ativo.current = null;
    setArrasto(null);
    if (typeof document !== "undefined") {
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
    }
  }, []);

  const aoPressionar = useCallback(
    (item: ItemArrastavel) => (evento: React.PointerEvent) => {
      /* Só o botão principal arrasta — o secundário é menu de contexto. */
      if (evento.button !== 0) return;
      pendente.current = { item, x: evento.clientX, y: evento.clientY };
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const aoMover = (evento: PointerEvent) => {
      const inicio = pendente.current;

      if (inicio && !ativo.current) {
        const distancia = Math.hypot(evento.clientX - inicio.x, evento.clientY - inicio.y);
        if (distancia < LIMIAR_EM_PIXELS) return;

        const estado: EstadoDoArrasto = { item: inicio.item, alvo: null };
        ativo.current = estado;
        setArrasto(estado);
        /* Sem isto o arrasto vai selecionando o texto por onde passa, e a tela
           fica coberta de azul de seleção. */
        document.body.style.setProperty("user-select", "none");
        document.body.style.setProperty("cursor", "grabbing");
        posicionarFantasma(evento.clientX, evento.clientY);
        return;
      }

      if (!ativo.current) return;
      posicionarFantasma(evento.clientX, evento.clientY);

      const encontrado = alvoSobOPonto(evento.clientX, evento.clientY);
      const aceito =
        encontrado && (podeSoltar?.(ativo.current.item, encontrado) ?? true)
          ? encontrado
          : null;

      /* Só re-renderiza quando o alvo MUDA — é o que mantém o arrasto barato. */
      const atual = ativo.current.alvo;
      const mesmo =
        (!atual && !aceito) ||
        (atual && aceito && atual.tipo === aceito.tipo && atual.id === aceito.id);
      if (mesmo) return;

      const proximo: EstadoDoArrasto = { item: ativo.current.item, alvo: aceito };
      ativo.current = proximo;
      setArrasto(proximo);
    };

    const aoSoltarPonteiro = () => {
      const estado = ativo.current;
      if (estado?.alvo) aoSoltar(estado.item, estado.alvo);
      encerrar();
    };

    /* Esc cancela — a saída que todo arrasto precisa ter e que a API nativa só
       oferece em alguns navegadores. */
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && ativo.current) encerrar();
    };

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltarPonteiro);
    /* `pointercancel` acontece de verdade: o navegador toma o ponteiro quando o
       toque vira gesto de rolagem. Sem tratar, o fantasma fica preso na tela. */
    window.addEventListener("pointercancel", encerrar);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltarPonteiro);
      window.removeEventListener("pointercancel", encerrar);
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [aoSoltar, encerrar, podeSoltar]);

  /* Desmontar no meio do arrasto não pode deixar o `<body>` sem seleção de
     texto para sempre. */
  useEffect(() => encerrar, [encerrar]);

  const alvoAceso = useCallback(
    (alvo: AlvoDeSoltura) =>
      Boolean(
        arrasto?.alvo && arrasto.alvo.tipo === alvo.tipo && arrasto.alvo.id === alvo.id,
      ),
    [arrasto],
  );

  return { arrasto, aoPressionar, fantasmaRef, alvoAceso };
}
