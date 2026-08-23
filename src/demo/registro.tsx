import type { ReactNode } from "react";

import type { GrupoDeNavegacao } from "../lib";
import { DemoDasAbas } from "./demos/abas";
import { DemoDoCartaoDeDecisao } from "./demos/cartao-de-decisao";
import { DemoDosFundos } from "./demos/fundos";
import { DemoDoGerenciadorDeArquivos } from "./demos/gerenciador-de-arquivos";
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
  {
    id: "abas",
    nome: "Abas",
    grupo: "Componentes",
    resumo:
      "A barra de seções do topo da página — a aba aberta é uma pestana pintada com o tema invertido, que recorta uma cópia da barra enquanto viaja.",
    estado: "pronto",
    Demo: DemoDasAbas,
  },
  {
    id: "gerenciador-de-arquivos",
    nome: "Gerenciador de Arquivos",
    /* ⭐ Um grupo novo, e ele significa outra coisa: aqui não mora um controle,
       mora uma PÁGINA inteira — várias peças, um hook de estado e uma porta de
       dados, prontas para serem copiadas juntas. */
    grupo: "Páginas",
    resumo:
      "Organizar arquivos já enviados: árvore de pastas, grade, lista, arrasta-e-solta e menus — tudo sobre uma única porta de dados, trocável por um back-end real.",
    estado: "pronto",
    Demo: DemoDoGerenciadorDeArquivos,
  },
  {
    id: "fundos",
    nome: "Fundos",
    /* Terceiro grupo, e de novo por natureza diferente: aqui não se demonstra um
       controle nem uma página — escolhe-se algo que vale para o site inteiro. */
    grupo: "Fundos",
    resumo:
      "Camadas decorativas para o cartão de conteúdo. Marque uma e ela entra atrás do que se lê; clique de novo para tirar.",
    estado: "pronto",
    Demo: DemoDosFundos,
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
