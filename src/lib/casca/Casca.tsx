"use client";

import type { ReactNode } from "react";

import "./casca.css";

export type PropsDaCasca = {
  /** O topo da coluna: marca, título, o que identifica o produto. */
  marca?: ReactNode;
  /** A navegação — tipicamente uma `<NavegacaoLateral>`. */
  lateral: ReactNode;
  /** O pé da coluna: alternador de tema, conta, versão. */
  rodapeLateral?: ReactNode;
  /** O que aparece no cartão central. */
  children: ReactNode;
};

/**
 * **A casca do app** — moldura, coluna lateral e o cartão central.
 *
 * O desenho tem uma ideia só, e tudo aqui serve a ela: **o conteúdo é papel
 * pousado sobre uma mesa.** A moldura é mais escura que o fundo do conteúdo (nos
 * DOIS temas), o cartão tem raio grande, sombra de repouso e um fio de contorno,
 * e a coluna lateral não tem fundo próprio — ela vive *sobre* a mesa.
 *
 * ⭐ **A coluna sem fundo é o que separa este layout do sidebar comum.** Dar um
 * `background` a ela criaria três superfícies empilhadas (mesa, coluna, cartão)
 * e a tela passaria a ter uma hierarquia que a informação não tem. Sem fundo, há
 * duas: a mesa e o papel. O item ativo aparece justamente por ser o único
 * pedaço de papel na coluna.
 *
 * ⛔ **A rolagem é da PÁGINA, não do `<main>`.** Com `overflow` no miolo, a
 * barra de rolagem nasce encostada na borda arredondada do cartão e é recortada
 * por ela — some nos cantos e reaparece no meio. Deixando a página rolar, a
 * barra é a do documento, onde ela sempre esteve.
 *
 * ⚠️ **`min-h-dvh`, não `100vh`.** No mobile, `vh` ignora a barra de endereço
 * que aparece e some — a moldura fica com um corte na base a cada rolagem.
 */
export function Casca({ marca, lateral, rodapeLateral, children }: PropsDaCasca) {
  return (
    <div className="cui-casca">
      <div className="cui-casca__linha">
        <aside className="cui-casca__lateral">
          {marca ? <div className="cui-casca__marca">{marca}</div> : null}

          <div className="cui-casca__nav">{lateral}</div>

          {rodapeLateral ? (
            /* `margin-top: auto` empurra o rodapé para a base mesmo com a
               navegação curta — e o mantém logo abaixo dela quando é longa. */
            <div className="cui-casca__rodape">{rodapeLateral}</div>
          ) : null}
        </aside>

        <div className="cui-casca__cartao">
          <main className="cui-casca__miolo">
            <div className="cui-casca__medida">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
