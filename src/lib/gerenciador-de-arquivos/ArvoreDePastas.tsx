"use client";

import type { ReactNode } from "react";

import { CampoDeNome } from "./CampoDeNome";
import { MenuDeAcoes } from "./MenuDeAcoes";
import type { AcaoDeMenu } from "./MenuDeAcoes";
import { IconeDeAcoes, IconeDeChevron, IconeDePasta, IconeDePastaAberta } from "./icones";
import { propsDeAlvo } from "./usar-arrastar";
import type { AlvoDeSoltura, ItemArrastavel, NoDaArvore, Pasta } from "./tipos";

export type ApoioDeArrasto = {
  aoPressionar: (item: ItemArrastavel) => (evento: React.PointerEvent) => void;
  alvoAceso: (alvo: AlvoDeSoltura) => boolean;
};

export type PropsDaArvore = {
  arvore: readonly NoDaArvore[];
  pastaAtualId: string | null;
  expandidas: ReadonlySet<string>;
  emEdicao: string | null;
  contarNaPasta: (id: string | null) => number;
  aoAbrir: (id: string) => void;
  aoAlternar: (id: string) => void;
  aoRenomear: (id: string, nome: string) => void;
  aoCancelarEdicao: () => void;
  acoesDaPasta: (pasta: Pasta) => AcaoDeMenu[];
  arrasto: ApoioDeArrasto;
  /** O que mostrar quando não há pasta nenhuma. */
  vazio?: ReactNode;
};

/**
 * **A árvore de pastas** — a coluna que dá a forma do acervo.
 *
 * ⭐ **Cada nó é ao mesmo tempo um destino de arrasto e um item de navegação**,
 * e isso não é acúmulo de função: arrastar um arquivo para uma pasta que está
 * três níveis acima, sem a árvore, exigiria abrir a pasta de destino primeiro —
 * ou seja, sair de onde o arquivo está para poder movê-lo.
 *
 * ⭐ **O botão de expandir é separado do de abrir.** Um clique só que faz as
 * duas coisas parece econômico e é ambíguo: ver o que tem dentro sem sair de
 * onde se está é uma intenção diferente de navegar para lá, e as duas
 * acontecem o tempo todo.
 *
 * ⚠️ **`role="tree"` traz um teclado obrigatório.** Anunciar-se como árvore e
 * não responder às setas é pior que ser uma lista de botões: o leitor de tela
 * promete uma navegação que não existe. ↑ ↓ percorrem o que está VISÍVEL,
 * → abre o nó (e desce, se já aberto), ← fecha (e sobe, se já fechado).
 */
export function ArvoreDePastas({
  arvore,
  pastaAtualId,
  expandidas,
  emEdicao,
  contarNaPasta,
  aoAbrir,
  aoAlternar,
  aoRenomear,
  aoCancelarEdicao,
  acoesDaPasta,
  arrasto,
  vazio,
}: PropsDaArvore) {
  /*
    A navegação lê os itens do DOM em vez de recalcular a lista achatada em
    JavaScript. É o mesmo resultado com menos estado — e imune ao caso em que a
    lista visível e a lista calculada divergem (um nó filtrado pela busca, por
    exemplo, que continua na árvore de dados e não está na tela).
  */
  const aoTeclar = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    const alvo = evento.target as HTMLElement;
    const item = alvo.closest<HTMLElement>('[role="treeitem"]');
    if (!item) return;

    const raiz = evento.currentTarget;
    const visiveis = [...raiz.querySelectorAll<HTMLElement>('[role="treeitem"]')];
    const indice = visiveis.indexOf(item);
    const id = item.dataset.pastaId;
    if (!id) return;

    const focar = (proximo: HTMLElement | undefined) => {
      proximo?.querySelector<HTMLElement>(".cui-arq__no-alvo")?.focus();
    };

    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        focar(visiveis[indice + 1]);
        break;
      case "ArrowUp":
        evento.preventDefault();
        focar(visiveis[indice - 1]);
        break;
      case "ArrowRight":
        evento.preventDefault();
        if (item.getAttribute("aria-expanded") === "false") aoAlternar(id);
        else focar(visiveis[indice + 1]);
        break;
      case "ArrowLeft": {
        evento.preventDefault();
        if (item.getAttribute("aria-expanded") === "true") {
          aoAlternar(id);
          break;
        }
        /* Já fechado (ou folha): sobe para o pai — o item anterior com nível
           menor, que é o que "voltar um degrau" significa numa árvore. */
        const nivel = Number(item.getAttribute("aria-level") ?? 1);
        for (let i = indice - 1; i >= 0; i--) {
          const candidato = visiveis[i];
          if (candidato && Number(candidato.getAttribute("aria-level") ?? 1) < nivel) {
            focar(candidato);
            break;
          }
        }
        break;
      }
      case "Home":
        evento.preventDefault();
        focar(visiveis[0]);
        break;
      case "End":
        evento.preventDefault();
        focar(visiveis[visiveis.length - 1]);
        break;
      default:
        break;
    }
  };

  if (arvore.length === 0 && vazio) {
    return <div className="cui-arq__arvore-vazia">{vazio}</div>;
  }

  return (
    <div role="tree" aria-label="Pastas" className="cui-arq__arvore" onKeyDown={aoTeclar}>
      {arvore.map((no) => (
        <NoDePasta
          key={no.pasta.id}
          no={no}
          pastaAtualId={pastaAtualId}
          expandidas={expandidas}
          emEdicao={emEdicao}
          contarNaPasta={contarNaPasta}
          aoAbrir={aoAbrir}
          aoAlternar={aoAlternar}
          aoRenomear={aoRenomear}
          aoCancelarEdicao={aoCancelarEdicao}
          acoesDaPasta={acoesDaPasta}
          arrasto={arrasto}
        />
      ))}
    </div>
  );
}

function NoDePasta({
  no,
  pastaAtualId,
  expandidas,
  emEdicao,
  contarNaPasta,
  aoAbrir,
  aoAlternar,
  aoRenomear,
  aoCancelarEdicao,
  acoesDaPasta,
  arrasto,
}: Omit<PropsDaArvore, "arvore" | "vazio"> & { no: NoDaArvore }) {
  const { pasta, filhos, nivel } = no;
  const aberta = expandidas.has(pasta.id);
  const atual = pastaAtualId === pasta.id;
  const editando = emEdicao === pasta.id;
  const alvo: AlvoDeSoltura = { tipo: "pasta", id: pasta.id };
  const aceso = arrasto.alvoAceso(alvo);

  return (
    <div
      role="treeitem"
      aria-expanded={filhos.length > 0 ? aberta : undefined}
      aria-selected={atual}
      aria-level={nivel + 1}
      data-pasta-id={pasta.id}
      className="cui-arq__no"
    >
      <div
        className="cui-arq__no-linha"
        data-atual={atual ? "true" : undefined}
        data-aceso={aceso ? "true" : undefined}
        /* O recuo é uma variável, não uma classe por nível: a árvore não tem
           profundidade máxima, e uma classe por nível teria. */
        style={{ ["--cui-arq-nivel" as string]: nivel }}
        {...propsDeAlvo(alvo)}
      >
        {filhos.length > 0 ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label={aberta ? `Recolher ${pasta.nome}` : `Expandir ${pasta.nome}`}
            className="cui-arq__no-chevron"
            data-aberta={aberta ? "true" : undefined}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              aoAlternar(pasta.id);
            }}
          >
            <IconeDeChevron tamanho={14} />
          </button>
        ) : (
          <span className="cui-arq__no-chevron cui-arq__no-chevron--vazio" />
        )}

        <button
          type="button"
          /* Roving: só a pasta atual fica na ordem de tabulação. Uma árvore com
             sessenta pastas na ordem do Tab é uma armadilha de teclado. */
          tabIndex={atual ? 0 : -1}
          className="cui-arq__no-alvo"
          onClick={() => aoAbrir(pasta.id)}
          onPointerDown={arrasto.aoPressionar({
            tipo: "pasta",
            id: pasta.id,
            rotulo: pasta.nome,
          })}
        >
          <span className="cui-arq__no-icone" aria-hidden="true">
            {aberta || aceso ? (
              <IconeDePastaAberta tamanho={16} />
            ) : (
              <IconeDePasta tamanho={16} />
            )}
          </span>

          {editando ? (
            <CampoDeNome
              valorInicial={pasta.nome}
              rotulo="Nome da pasta"
              aoConfirmar={(nome) => aoRenomear(pasta.id, nome)}
              aoCancelar={aoCancelarEdicao}
            />
          ) : (
            <span className="cui-arq__no-nome">{pasta.nome}</span>
          )}
        </button>

        {!editando ? (
          <>
            <span className="cui-arq__no-contagem" aria-hidden="true">
              {contarNaPasta(pasta.id)}
            </span>
            <MenuDeAcoes
              rotulo={`Ações de ${pasta.nome}`}
              acoes={acoesDaPasta(pasta)}
              className="cui-arq__no-acoes"
            >
              <IconeDeAcoes tamanho={16} />
            </MenuDeAcoes>
          </>
        ) : null}
      </div>

      {aberta && filhos.length > 0 ? (
        <div role="group">
          {filhos.map((filho) => (
            <NoDePasta
              key={filho.pasta.id}
              no={filho}
              pastaAtualId={pastaAtualId}
              expandidas={expandidas}
              emEdicao={emEdicao}
              contarNaPasta={contarNaPasta}
              aoAbrir={aoAbrir}
              aoAlternar={aoAlternar}
              aoRenomear={aoRenomear}
              aoCancelarEdicao={aoCancelarEdicao}
              acoesDaPasta={acoesDaPasta}
              arrasto={arrasto}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
