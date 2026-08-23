import { useMemo } from "react";

import { GerenciadorDeArquivos, criarRepositorioEmMemoria } from "../../lib";
import type { Acervo } from "../../lib";
import { Bancada } from "../pecas";

/*
  O acervo de exemplo. Num projeto de verdade isto vem do servidor — e é
  exatamente a forma que `RepositorioDeArquivos.listar()` promete devolver.
*/
const ACERVO: Acervo = {
  pastas: [
    { id: "p-onboarding", nome: "Onboarding", paiId: null },
    { id: "p-semana", nome: "Primeira semana", paiId: "p-onboarding" },
    { id: "p-ferramentas", nome: "Ferramentas", paiId: "p-onboarding" },
    { id: "p-integracoes", nome: "Integrações", paiId: null },
    { id: "p-documentos", nome: "Documentos", paiId: null },
    { id: "p-design", nome: "Design de Onboarding", paiId: null },
    { id: "p-entrevistas", nome: "Entrevistas do time", paiId: null },
  ],
  arquivos: [
    {
      id: "a1",
      nome: "Guia-de-Onboarding.pdf",
      pastaId: "p-onboarding",
      origem: "pdf",
      adicionadoPor: { nome: "Kevin Alves", email: "kevin@mail.com" },
      adicionadoEm: "2026-08-12T09:10:00Z",
      tamanho: 2_411_520,
      etiquetas: ["onboarding", "manual"],
    },
    {
      id: "a2",
      nome: "Roteiro-do-Produto.docx",
      pastaId: "p-onboarding",
      origem: "word",
      adicionadoPor: { nome: "Antonio Werner", email: "antonwe@gmail.com" },
      adicionadoEm: "2026-08-14T14:32:00Z",
      tamanho: 184_320,
      etiquetas: ["produto"],
    },
    {
      id: "a3",
      nome: "Checklist-primeiro-dia.notion",
      pastaId: "p-semana",
      origem: "notion",
      adicionadoPor: { nome: "Ana Prado", email: "ana@campelo.adv.br" },
      adicionadoEm: "2026-08-15T08:02:00Z",
      tamanho: 12_800,
      etiquetas: ["onboarding", "checklist"],
    },
    {
      id: "a4",
      nome: "Acessos-e-senhas.drive",
      pastaId: "p-ferramentas",
      origem: "drive",
      adicionadoPor: { nome: "Ana Prado", email: "ana@campelo.adv.br" },
      adicionadoEm: "2026-08-15T10:20:00Z",
      tamanho: 8_400,
      etiquetas: ["ferramentas"],
    },
    {
      id: "a5",
      nome: "Apresentacao-institucional.pptx",
      pastaId: "p-documentos",
      origem: "powerpoint",
      adicionadoPor: { nome: "Marcos Lima", email: "marcos@campelo.adv.br" },
      adicionadoEm: "2026-07-30T16:45:00Z",
      tamanho: 9_871_360,
      etiquetas: ["institucional"],
    },
    {
      id: "a6",
      nome: "Contrato-modelo.docx",
      pastaId: "p-documentos",
      origem: "word",
      adicionadoPor: { nome: "Marcos Lima", email: "marcos@campelo.adv.br" },
      adicionadoEm: "2026-08-02T11:15:00Z",
      tamanho: 96_256,
      etiquetas: ["modelo", "jurídico"],
    },
    {
      id: "a7",
      nome: "API-do-parceiro.pdf",
      pastaId: "p-integracoes",
      origem: "pdf",
      adicionadoPor: { nome: "Kevin Alves", email: "kevin@mail.com" },
      adicionadoEm: "2026-08-18T09:00:00Z",
      tamanho: 512_000,
      etiquetas: ["integração", "api"],
    },
    {
      id: "a8",
      nome: "Fluxos-de-tela.dropbox",
      pastaId: "p-design",
      origem: "dropbox",
      adicionadoPor: { nome: "Bia Rocha", email: "bia@campelo.adv.br" },
      adicionadoEm: "2026-08-19T13:40:00Z",
      tamanho: 34_209_792,
      etiquetas: ["design"],
    },
    {
      id: "a9",
      nome: "Entrevista-Ana.notion",
      pastaId: "p-entrevistas",
      origem: "notion",
      adicionadoPor: { nome: "Bia Rocha", email: "bia@campelo.adv.br" },
      adicionadoEm: "2026-08-20T15:05:00Z",
      etiquetas: ["pesquisa"],
    },
    {
      id: "a10",
      nome: "Politica-de-privacidade.pdf",
      pastaId: null,
      origem: "pdf",
      adicionadoPor: { nome: "Ana Prado", email: "ana@campelo.adv.br" },
      adicionadoEm: "2026-06-11T10:00:00Z",
      tamanho: 322_560,
      etiquetas: ["jurídico"],
    },
    {
      id: "a11",
      nome: "Organograma.drive",
      pastaId: null,
      origem: "drive",
      adicionadoPor: { nome: "Marcos Lima", email: "marcos@campelo.adv.br" },
      adicionadoEm: "2026-08-21T17:30:00Z",
      tamanho: 45_000,
    },
  ],
};

export function DemoDoGerenciadorDeArquivos() {
  /*
    ⚠️ `useMemo` com lista vazia, e não uma chamada solta no corpo do componente.
    O repositório é dependência do efeito de carga: recriado a cada render, ele
    dispara uma listagem nova toda vez — um laço que não dá erro, só deixa a
    página perpetuamente carregando.

    O atraso simula a latência de um servidor de verdade. É ele que mostra que
    as ações são otimistas: renomear, mover e excluir acontecem na hora, e a
    chamada corre atrás.
  */
  const repositorio = useMemo(() => criarRepositorioEmMemoria(ACERVO, { atraso: 260 }), []);

  return (
    <Bancada
      titulo="Organizar o que já foi enviado"
      apoio="Arraste uma linha da lista para uma pasta — da grade, da árvore ou da trilha. Clique no ⋯ para renomear, mover pelo teclado ou excluir. Tudo passa por uma única porta de dados: troque o repositório em memória por um HTTP e a página inteira opera em dados reais."
    >
      <GerenciadorDeArquivos repositorio={repositorio} titulo="Base de Conhecimento" />
    </Bancada>
  );
}
