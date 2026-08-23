"use client";

import { useCallback, useSyncExternalStore } from "react";

/** O identificador do fundo ligado — `null` é "nenhum, superfície lisa". */
export type FundoAtivo = string | null;

const CHAVE = "componentes-ui:fundo";

/*
  ⭐ **Uma loja externa minúscula, e não `useState`.** Duas telas mexem no mesmo
  estado: a página de fundos, onde se liga e desliga, e a camada que desenha o
  fundo no site — e elas não são pai e filho. Com `useState` em cada uma, marcar
  o fundo na página mudaria o `localStorage` e o atributo da raiz, e a camada
  simplesmente não redesenharia: o site continuaria sem fundo até um F5.

  `useSyncExternalStore` é a ferramenta que o React tem para exatamente isso —
  uma fonte de verdade fora da árvore, com todas as instâncias avisadas. Um
  contexto resolveria também, ao custo de um provedor obrigatório em volta de
  quem copiar o componente para outro projeto.
*/
let atual: FundoAtivo = null;
let hidratado = false;
const ouvintes = new Set<() => void>();

function hidratar() {
  if (hidratado) return;
  hidratado = true;
  try {
    atual = localStorage.getItem(CHAVE) || null;
  } catch {
    /* Modo privado com armazenamento bloqueado: começa sem fundo. */
  }
  aplicarNaRaiz();
}

/*
  ⭐ **O atributo na raiz é o que torna o fundo do SITE, e não de um pedaço
  dele.** Quem precisa reagir — a moldura do app, que fica transparente para o
  fundo aparecer — reage por CSS, sem prop atravessando a árvore inteira. É a
  mesma decisão do `data-tema`, pelo mesmo motivo.
*/
function aplicarNaRaiz() {
  if (typeof document === "undefined") return;
  const raiz = document.documentElement;
  if (atual) raiz.dataset.fundo = atual;
  else delete raiz.dataset.fundo;
}

function assinar(aoMudar: () => void) {
  hidratar();
  ouvintes.add(aoMudar);
  return () => {
    ouvintes.delete(aoMudar);
  };
}

function ler(): FundoAtivo {
  hidratar();
  return atual;
}

/* ⛔ O servidor não tem `localStorage`: renderizar o fundo lá e não no cliente
   (ou o contrário) é o erro de hidratação clássico. Sem fundo é o único palpite
   honesto antes de o navegador dizer o que foi escolhido. */
function lerNoServidor(): FundoAtivo {
  return null;
}

function definir(novo: FundoAtivo) {
  atual = novo;
  aplicarNaRaiz();
  try {
    if (novo) localStorage.setItem(CHAVE, novo);
    else localStorage.removeItem(CHAVE);
  } catch {
    /* A escolha vale para esta sessão em vez de derrubar a página. */
  }
  for (const ouvinte of ouvintes) ouvinte();
}

/**
 * **Qual fundo está ligado no site**, com a escolha guardada entre visitas.
 *
 * ⚠️ **Ligar e desligar é a operação principal**, não um efeito colateral de
 * escolher: `alternar(id)` liga se estiver desligado e desliga se já for aquele.
 * Um fundo decorativo é a primeira coisa que cansa — quem liga precisa poder
 * desligar no mesmo gesto e no mesmo lugar.
 */
export function usarFundo() {
  const fundo = useSyncExternalStore(assinar, ler, lerNoServidor);

  const definirFundo = useCallback((novo: FundoAtivo) => definir(novo), []);
  const alternar = useCallback(
    (id: string) => definir(atual === id ? null : id),
    [],
  );

  return { fundo, definirFundo, alternar };
}
