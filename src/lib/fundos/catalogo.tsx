"use client";

import type { ReactNode } from "react";

import { FundoDeOrbes } from "./FundoDeOrbes";
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
    Desenho: FundoDeOrbes,
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
