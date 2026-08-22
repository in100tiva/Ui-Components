"use client";

import { useCallback, useEffect, useState } from "react";

export type Tema = "claro" | "escuro" | "sistema";
export type TemaEfetivo = "claro" | "escuro";

const CHAVE = "componentes-ui:tema";
const CONSULTA = "(prefers-color-scheme: dark)";

function lerPreferencia(): Tema {
  if (typeof localStorage === "undefined") return "sistema";
  const guardado = localStorage.getItem(CHAVE);
  return guardado === "claro" || guardado === "escuro" ? guardado : "sistema";
}

function temaDoSistema(): TemaEfetivo {
  if (typeof matchMedia === "undefined") return "claro";
  return matchMedia(CONSULTA).matches ? "escuro" : "claro";
}

/**
 * Tema claro/escuro em três estados — claro, escuro e **sistema**.
 *
 * Sistema é o terceiro estado de propósito: um toggle de dois estados obriga a
 * escolher um lado para sempre, e quem trabalha com o sistema em automático
 * (claro de dia, escuro de noite) perde isso no instante em que toca no botão.
 *
 * O tema vive num ATRIBUTO da raiz (`data-tema`), não numa classe — assim ele
 * não disputa o seletor com o `.dark` que o projeto de destino talvez já use.
 *
 * ⚠️ A primeira pintura é responsabilidade do HTML, não deste hook: o script
 * inline do `index.html` aplica `data-tema` antes de o React montar. Sem ele a
 * tela pisca branco por um frame — e um flash de tema errado é a coisa mais
 * visível que um site de tema escuro pode fazer.
 */
export function usarTema() {
  const [tema, setTema] = useState<Tema>("sistema");
  const [doSistema, setDoSistema] = useState<TemaEfetivo>("claro");

  /* Ler `localStorage` e `matchMedia` no primeiro efeito, e não no `useState`
     inicial: em SSR nenhum dos dois existe, e o servidor renderizaria um tema
     que o cliente contradiz no primeiro frame — o erro de hidratação clássico. */
  useEffect(() => {
    setTema(lerPreferencia());
    setDoSistema(temaDoSistema());

    const media = matchMedia(CONSULTA);
    const aoMudar = (e: MediaQueryListEvent) =>
      setDoSistema(e.matches ? "escuro" : "claro");
    media.addEventListener("change", aoMudar);
    return () => media.removeEventListener("change", aoMudar);
  }, []);

  const efetivo: TemaEfetivo = tema === "sistema" ? doSistema : tema;

  useEffect(() => {
    document.documentElement.dataset.tema = efetivo;
  }, [efetivo]);

  const definirTema = useCallback((novo: Tema) => {
    setTema(novo);
    try {
      if (novo === "sistema") localStorage.removeItem(CHAVE);
      else localStorage.setItem(CHAVE, novo);
    } catch {
      /* Modo privado com armazenamento bloqueado: a escolha vale para esta
         sessão em vez de derrubar a página com uma exceção. */
    }
  }, []);

  /** Alterna entre os dois lados VISÍVEIS, a partir do que está na tela agora. */
  const alternar = useCallback(() => {
    definirTema(efetivo === "escuro" ? "claro" : "escuro");
  }, [efetivo, definirTema]);

  return { tema, efetivo, definirTema, alternar };
}
