import type { ReactNode } from "react";

import type { GrupoDeNavegacao } from "../lib";
import { DemoDoCartaoDeDecisao } from "./demos/cartao-de-decisao";
import { DemoDosFundamentos } from "./demos/fundamentos";
import { DemoDoMenuSuspenso } from "./demos/menu-suspenso";

/**
 * O catálogo da galeria.
 *
 * ⭐ **Adicionar um componente é acrescentar UMA entrada aqui.** A coluna, a
 * rota por hash, o cabeçalho e o estado vazio saem todos daqui — não há segunda
 * lista para manter em dia, que é como uma galeria começa a mentir sobre o que
 * a biblioteca tem.
 */
export type EntradaDoRegistro = {
  /** Vira o hash da URL: `#menu-suspenso`. Estável — é o que as pessoas colam. */
  id: string;
  nome: string;
  /** Uma linha sobre o que o componente resolve. Aparece sob o título. */
  resumo: string;
  /**
   * O cabeçalho sob o qual o item aparece na coluna.
   *
   * ⚠️ **São seções da GALERIA, não taxonomia de biblioteca.** "Fundamentos" e
   * "Componentes" bastam: categorizar por natureza do controle — Formulário,
   * Navegação, Sobreposição — inventa uma árvore que ninguém pediu e faz a
   * coluna responder "que tipo de coisa é isto?" quando a pergunta real é "onde
   * está o Menu Suspenso?".
   */
  grupo: string;
  /** `rascunho` ganha selo na coluna: a galeria não finge que está pronto. */
  estado?: "pronto" | "rascunho";
  Demo: () => ReactNode;
};

export const REGISTRO: readonly EntradaDoRegistro[] = [
  {
    id: "fundamentos",
    nome: "Cores e tokens",
    grupo: "Fundamentos",
    resumo:
      "A paleta, as formas, as curvas e o ritmo — lidos do mesmo tokens.json que gera o CSS e o TypeScript.",
    estado: "pronto",
    Demo: DemoDosFundamentos,
  },
  {
    id: "menu-suspenso",
    nome: "Menu Suspenso",
    grupo: "Componentes",
    resumo:
      "Lista de escolha única — controlada, acessível, posicionada por medição e portalizada.",
    estado: "pronto",
    Demo: DemoDoMenuSuspenso,
  },
  {
    id: "cartao-de-decisao",
    nome: "Cartão de Decisão",
    grupo: "Componentes",
    resumo:
      "Cartão de tarefa que se contorna ao ser aprovado ou reprovado — malha de pontos, lavagem de cor e o traço percorrendo a borda.",
    estado: "pronto",
    Demo: DemoDoCartaoDeDecisao,
  },
];

/** O registro na forma que a coluna lateral consome, agrupado e na ordem de entrada. */
export function gruposDoRegistro(): GrupoDeNavegacao[] {
  const porGrupo = new Map<string, EntradaDoRegistro[]>();

  for (const entrada of REGISTRO) {
    const lista = porGrupo.get(entrada.grupo);
    if (lista) lista.push(entrada);
    else porGrupo.set(entrada.grupo, [entrada]);
  }

  return [...porGrupo].map(([titulo, entradas]) => ({
    titulo,
    itens: entradas.map((e) => ({
      id: e.id,
      rotulo: e.nome,
      selo: e.estado === "rascunho" ? "rascunho" : undefined,
    })),
  }));
}

export function acharEntrada(id: string | null): EntradaDoRegistro | null {
  return REGISTRO.find((e) => e.id === id) ?? null;
}
