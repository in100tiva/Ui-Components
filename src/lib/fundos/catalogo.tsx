"use client";

import type { ReactNode } from "react";

import { FundoDeOrbes } from "./FundoDeOrbes";
import { FundoDeSeda } from "./FundoDeSeda";
import { usarFundo } from "./usar-fundo";

import "./fundos.css";

export type FundoDisponivel = {
  /** Vira o valor de `data-fundo` na raiz e o que fica guardado. */
  id: string;
  nome: string;
  /** Uma linha sobre o que ele é — aparece no cartão de escolha. */
  descricao: string;
  Desenho: (props: { className?: string }) => ReactNode;
};

/**
 * **O catálogo.** Um fundo novo é UMA entrada aqui — a página de escolha, a
 * camada do site e a persistência saem todas desta lista, sem segunda lista
 * para manter em dia.
 */
export const FUNDOS: readonly FundoDisponivel[] = [
  {
    id: "orbes",
    nome: "Orbes iridescentes",
    descricao:
      "Cinco esferas de gradiente sobre luz difusa, recompostas para a caixa larga do cartão — as cinco cabem, em vez de a arte ser cortada a 40%.",
    Desenho: (p) => <FundoDeOrbes {...p} />,
  },
  {
    id: "orbes-deriva",
    nome: "Orbes em deriva",
    descricao:
      "O mesmo desenho, com as esferas derivando pelo quadro em períodos que não se dividem entre si — o movimento nunca reencontra a mesma configuração.",
    Desenho: (p) => <FundoDeOrbes {...p} movimento="formas" />,
  },
  {
    id: "orbes-luz",
    nome: "Orbes com luz viva",
    descricao:
      "As esferas ficam onde estão e o mesh passeia por dentro delas: o que muda é a matéria, como óleo girando numa bolha de sabão.",
    Desenho: (p) => <FundoDeOrbes {...p} movimento="luz" />,
  },
  {
    id: "seda",
    nome: "Dobras de seda",
    descricao:
      "Lençóis de cetim em rosa, lilás e azul. Cada dobra é um par: o corpo com a luz na crista e a sombra que ela projeta no lençol de baixo.",
    Desenho: (p) => <FundoDeSeda {...p} />,
  },
  {
    id: "seda-formas",
    nome: "Seda ondulando",
    descricao:
      "As dobras sobem e descem no lugar, com um respiro de escala — um lençol não atravessa a tela, ele ondula.",
    Desenho: (p) => <FundoDeSeda {...p} movimento="formas" />,
  },
  {
    id: "seda-luz",
    nome: "Seda com luz correndo",
    descricao:
      "As dobras ficam paradas e o realce viaja pela crista de cada uma: é o que o cetim faz quando a fonte de luz se move.",
    Desenho: (p) => <FundoDeSeda {...p} movimento="luz" />,
  },
];

/**
 * **A camada de fundo do conteúdo.** Passe-a à casca pela prop `fundo` — ela
 * decide sozinha o que desenhar a partir do que estiver ligado.
 *
 * ```tsx
 * <Casca fundo={<CamadaDeFundo />} lateral={…}>{conteudo}</Casca>
 * ```
 *
 * ⚠️ Ela não renderiza nada quando não há fundo escolhido: um contêiner vazio
 * cobrindo a tela é uma armadilha de clique esperando um `pointer-events`
 * esquecido.
 */
export function CamadaDeFundo() {
  const { fundo } = usarFundo();
  const escolhido = FUNDOS.find((f) => f.id === fundo);
  if (!escolhido) return null;

  return (
    <div className="cui-fundo" aria-hidden="true">
      <escolhido.Desenho />
    </div>
  );
}
