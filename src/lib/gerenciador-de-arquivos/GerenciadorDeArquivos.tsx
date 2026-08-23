"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

import { Abas } from "../abas/Abas";
import { camadas } from "../tokens/tokens";

import { ArvoreDePastas } from "./ArvoreDePastas";
import { GradeDePastas } from "./GradeDePastas";
import { TabelaDeArquivos } from "./TabelaDeArquivos";
import { MenuDeAcoes } from "./MenuDeAcoes";
import type { AcaoDeMenu } from "./MenuDeAcoes";
import {
  IconeDeArquivo,
  IconeDeChevron,
  IconeDeEtiqueta,
  IconeDeLapis,
  IconeDeLixeira,
  IconeDeLupa,
  IconeDeMais,
  IconeDeMover,
  IconeDePasta,
} from "./icones";
import { arquivosDaPasta, caminhoAte, contarArquivos, podeMoverPasta } from "./modelo";
import { propsDeAlvo, usarArrastarESoltar } from "./usar-arrastar";
import { usarGerenciadorDeArquivos } from "./usar-gerenciador";
import type { OrigemDaEdicao } from "./usar-gerenciador";
import type { RepositorioDeArquivos } from "./repositorio";
import type { AlvoDeSoltura, ItemArrastavel, OrigemDoArquivo, Pasta } from "./tipos";

import "./gerenciador.css";

export type PropsDoGerenciador = {
  /** A porta para os dados. Ver `repositorio.ts`. */
  repositorio: RepositorioDeArquivos;
  /** O nome do acervo, no topo da coluna. */
  titulo?: string;
  /** Botões extras no cabeçalho — "Enviar arquivos", por exemplo. */
  acoesDoCabecalho?: ReactNode;
};

/**
 * # Gerenciador de Arquivos
 *
 * **Uma PÁGINA inteira, não um componente** — a coluna do acervo, a grade de
 * pastas, a lista de arquivos, o arrasta-e-solta e os menus, montados sobre uma
 * única porta de dados.
 *
 * ```tsx
 * const repositorio = useMemo(() => criarRepositorioEmMemoria(ACERVO), []);
 * <GerenciadorDeArquivos repositorio={repositorio} titulo="Base de Conhecimento" />
 * ```
 *
 * ⭐ **Para replicar em outro projeto, o que muda é UMA linha.** Troque
 * `criarRepositorioEmMemoria` por `criarRepositorioHttp({ base: "/api/arquivos" })`
 * — ou pela sua própria implementação de `RepositorioDeArquivos` — e a página
 * inteira passa a operar sobre dados reais. Nenhum componente daqui sabe de
 * onde vêm os dados, e é isso que torna a troca barata.
 *
 * ⚠️ **`repositorio` precisa ser ESTÁVEL entre renders.** Ele é dependência do
 * efeito de carga; criado dentro do corpo do componente pai, dispara uma
 * listagem nova a cada render — um laço infinito silencioso, que parece "a
 * página está lenta". `useMemo(() => criar…(), [])` resolve.
 *
 * **A divisão de responsabilidades**, que é o ponto do padrão:
 *
 * | Camada | Arquivo | Responsabilidade |
 * |---|---|---|
 * | Dados | `repositorio.ts` | Falar com o back-end. A única que sabe de rede |
 * | Regras | `modelo.ts` | Contas puras: árvore, caminho, o que pode mover |
 * | Estado | `usar-gerenciador.ts` | Navegação e ações otimistas |
 * | Gesto | `usar-arrastar.ts` | Arrastar e soltar, sem saber o que arrasta |
 * | Desenho | os `.tsx` restantes | Recebem dados e chamam callbacks. Sem estado de dados |
 */
export function GerenciadorDeArquivos({
  repositorio,
  titulo = "Base de Conhecimento",
  acoesDoCabecalho,
}: PropsDoGerenciador) {
  const g = usarGerenciadorDeArquivos(repositorio);
  const [aba, setAba] = useState<"pastas" | "etiquetas">("pastas");
  const [colunaAberta, setColunaAberta] = useState(true);

  /* --- Arrastar e soltar -------------------------------------------------- */

  const arrasto = usarArrastarESoltar({
    podeSoltar: (item, alvo) => {
      if (item.tipo === "pasta") return podeMoverPasta(g.acervo.pastas, item.id, alvo.id);
      const arquivo = g.acervo.arquivos.find((a) => a.id === item.id);
      /* Soltar onde já está não é operação — e acender o alvo ali prometeria
         uma mudança que não vai acontecer. */
      return Boolean(arquivo) && arquivo?.pastaId !== alvo.id;
    },
    aoSoltar: (item, alvo) => {
      if (item.tipo === "pasta") g.moverPasta(item.id, alvo.id);
      else g.moverArquivos([item.id], alvo.id);
    },
  });

  /* --- Menus -------------------------------------------------------------- */

  /** Todos os destinos possíveis, com o caminho escrito para desambiguar. */
  const destinos = useMemo(() => {
    return g.acervo.pastas.map((pasta) => ({
      pasta,
      caminho: caminhoAte(g.acervo.pastas, pasta.id)
        .map((p) => p.nome)
        .join(" / "),
    }));
  }, [g.acervo.pastas]);

  const moverPara = (
    aoEscolher: (destinoId: string | null) => void,
    filtrar: (pasta: Pasta) => boolean,
  ): AcaoDeMenu => ({
    id: "mover",
    rotulo: "Mover para",
    icone: <IconeDeMover tamanho={16} />,
    /*
      ⭐ **Esta é a alternativa acessível ao arrasto**, e não um extra. Arrastar
      não existe para quem navega por teclado ou leitor de tela; sem um caminho
      equivalente aqui, mover um arquivo seria uma função exclusiva de quem usa
      mouse.
    */
    itens: [
      {
        id: "raiz",
        rotulo: titulo,
        icone: <IconeDePasta tamanho={16} />,
        aoEscolher: () => aoEscolher(null),
      },
      ...destinos
        .filter(({ pasta }) => filtrar(pasta))
        .map(({ pasta, caminho }) => ({
          id: pasta.id,
          rotulo: caminho,
          icone: <IconeDePasta tamanho={16} />,
          aoEscolher: () => aoEscolher(pasta.id),
        })),
    ],
  });

  /*
    ⭐ **As ações são criadas POR LISTA.** A mesma pasta aparece na árvore e na
    grade; sem dizer de onde o "Renomear" partiu, as duas abririam um campo de
    texto para o mesmo item — e o segundo a montar roubaria o foco do primeiro,
    fechando a edição. A origem viaja com o pedido.
  */
  const acoesDaPasta =
    (origem: OrigemDaEdicao) =>
    (pasta: Pasta): AcaoDeMenu[] => [
      {
        id: "renomear",
        rotulo: "Renomear",
        icone: <IconeDeLapis tamanho={16} />,
        aoEscolher: () => g.setEmEdicao({ id: pasta.id, origem }),
      },
      {
        id: "nova",
        rotulo: "Nova subpasta",
        icone: <IconeDeMais tamanho={16} />,
        aoEscolher: () => void g.criarPasta(pasta.id, origem),
      },
      moverPara(
        (destinoId) => void g.moverPasta(pasta.id, destinoId),
        (candidata) => podeMoverPasta(g.acervo.pastas, pasta.id, candidata.id),
      ),
      {
        id: "excluir",
        rotulo: "Excluir",
        icone: <IconeDeLixeira tamanho={16} />,
        perigosa: true,
        /* O texto da confirmação diz o que vai sumir junto — "Excluir" sozinho
           esconde que as subpastas e os arquivos vão junto. */
        confirmacao: "Excluir a pasta e o conteúdo?",
        aoEscolher: () => void g.excluirPasta(pasta.id),
      },
    ];

  const acoesDoArquivo = (arquivo: { id: string; nome: string }): AcaoDeMenu[] => [
    {
      id: "renomear",
      rotulo: "Renomear",
      icone: <IconeDeLapis tamanho={16} />,
      aoEscolher: () => g.setEmEdicao({ id: arquivo.id, origem: "lista" }),
    },
    moverPara(
      (destinoId) => void g.moverArquivos([arquivo.id], destinoId),
      () => true,
    ),
    {
      id: "excluir",
      rotulo: "Excluir",
      icone: <IconeDeLixeira tamanho={16} />,
      perigosa: true,
      confirmacao: "Confirmar exclusão?",
      aoEscolher: () => void g.excluirArquivos([arquivo.id]),
    },
  ];

  /* --- O que a grade mostra ----------------------------------------------- */

  const resumos = useMemo(
    () =>
      g.subpastas.map((pasta) => {
        const dentro = arquivosDaPasta(g.acervo.arquivos, pasta.id);
        const origens = [
          ...new Set(dentro.map((a) => a.origem).filter(Boolean)),
        ] as OrigemDoArquivo[];
        return { pasta, quantidade: dentro.length, origens };
      }),
    [g.acervo.arquivos, g.subpastas],
  );

  const pastaAtual = g.caminho[g.caminho.length - 1] ?? null;
  const nomeAtual = pastaAtual?.nome ?? titulo;
  const alvoRaiz: AlvoDeSoltura = { tipo: "raiz", id: null };
  const vazio = resumos.length === 0 && g.arquivosVisiveis.length === 0;

  return (
    <div className="cui-arq" data-arrastando={arrasto.arrasto ? "true" : undefined}>
      {/* ─── Coluna do acervo ─────────────────────────────────────────── */}
      <aside className="cui-arq__coluna" data-aberta={colunaAberta ? "true" : "false"}>
        <header className="cui-arq__coluna-topo">
          <h2 className="cui-arq__coluna-titulo">{titulo}</h2>
          <button
            type="button"
            className="cui-arq__botao-icone"
            aria-label="Nova pasta na raiz"
            onClick={() => void g.criarPasta(null, "arvore")}
          >
            <IconeDeMais tamanho={16} />
          </button>
        </header>

        <div className="cui-arq__busca">
          <IconeDeLupa tamanho={16} />
          <input
            type="search"
            value={g.busca}
            onChange={(e) => g.setBusca(e.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar em pastas e arquivos"
            className="cui-arq__busca-campo"
          />
        </div>

        {/* O componente de Abas do próprio sistema — o padrão se compõe. */}
        <Abas
          abas={[
            { valor: "pastas", rotulo: "Pastas" },
            { valor: "etiquetas", rotulo: "Etiquetas" },
          ]}
          valor={aba}
          aoTrocar={setAba}
          rotulo="Modo de organização"
        />

        <div className="cui-arq__coluna-corpo">
          {aba === "pastas" ? (
            <>
              {/* A raiz é um destino como outro qualquer: é assim que se tira um
                  arquivo de dentro de uma pasta sem precisar de um "remover". */}
              <button
                type="button"
                className="cui-arq__raiz"
                data-atual={g.pastaAtualId === null ? "true" : undefined}
                data-aceso={arrasto.alvoAceso(alvoRaiz) ? "true" : undefined}
                onClick={() => g.abrirPasta(null)}
                {...propsDeAlvo(alvoRaiz)}
              >
                <IconeDePasta tamanho={16} />
                <span className="cui-arq__raiz-nome">{titulo}</span>
                <span className="cui-arq__no-contagem">
                  {contarArquivos(g.acervo.arquivos, null)}
                </span>
              </button>

              <ArvoreDePastas
                arvore={g.arvore}
                pastaAtualId={g.pastaAtualId}
                expandidas={g.expandidas}
                emEdicao={g.emEdicao?.origem === "arvore" ? g.emEdicao.id : null}
                contarNaPasta={g.contarNaPasta}
                aoAbrir={g.abrirPasta}
                aoAlternar={g.alternarExpansao}
                aoRenomear={(id, nome) => {
                  void g.renomearPasta(id, nome);
                  g.setEmEdicao(null);
                }}
                aoCancelarEdicao={() => g.setEmEdicao(null)}
                acoesDaPasta={acoesDaPasta("arvore")}
                arrasto={arrasto}
                vazio={
                  <p className="cui-arq__aviso">
                    {g.busca ? "Nenhuma pasta encontrada." : "Nenhuma pasta ainda."}
                  </p>
                }
              />
            </>
          ) : (
            <ul className="cui-arq__etiquetas">
              {g.etiquetas.length === 0 ? (
                <li className="cui-arq__aviso">Nenhuma etiqueta.</li>
              ) : null}
              {g.etiquetas.map((etiqueta) => (
                <li key={etiqueta.nome}>
                  <button
                    type="button"
                    className="cui-arq__etiqueta"
                    data-atual={g.etiquetaAtiva === etiqueta.nome ? "true" : undefined}
                    aria-pressed={g.etiquetaAtiva === etiqueta.nome}
                    onClick={() =>
                      g.setEtiquetaAtiva(
                        g.etiquetaAtiva === etiqueta.nome ? null : etiqueta.nome,
                      )
                    }
                  >
                    <IconeDeEtiqueta tamanho={14} />
                    <span className="cui-arq__etiqueta-nome">{etiqueta.nome}</span>
                    <span className="cui-arq__no-contagem">{etiqueta.contagem}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ─── Conteúdo ─────────────────────────────────────────────────── */}
      <div className="cui-arq__conteudo">
        <header className="cui-arq__conteudo-topo">
          <button
            type="button"
            className="cui-arq__botao-icone cui-arq__alternar-coluna"
            aria-label={colunaAberta ? "Recolher a coluna" : "Mostrar a coluna"}
            aria-expanded={colunaAberta}
            onClick={() => setColunaAberta((a) => !a)}
          >
            <IconeDeChevron tamanho={16} />
          </button>

          {/* Na raiz a trilha diria o mesmo que o título logo abaixo — e uma
              trilha de um degrau só não ajuda ninguém a voltar para lugar
              nenhum. Ela aparece quando há caminho a desfazer. */}
          <nav
            aria-label="Caminho"
            className="cui-arq__trilha"
            hidden={g.caminho.length === 0}
          >
            <button
              type="button"
              className="cui-arq__trilha-item"
              data-aceso={arrasto.alvoAceso(alvoRaiz) ? "true" : undefined}
              onClick={() => g.abrirPasta(null)}
              {...propsDeAlvo(alvoRaiz)}
            >
              {titulo}
            </button>
            {g.caminho.map((pasta, i) => (
              <span key={pasta.id} className="cui-arq__trilha-passo">
                <IconeDeChevron tamanho={13} className="cui-arq__trilha-seta" />
                <button
                  type="button"
                  className="cui-arq__trilha-item"
                  aria-current={i === g.caminho.length - 1 ? "page" : undefined}
                  data-aceso={
                    arrasto.alvoAceso({ tipo: "pasta", id: pasta.id }) ? "true" : undefined
                  }
                  onClick={() => g.abrirPasta(pasta.id)}
                  {...propsDeAlvo({ tipo: "pasta", id: pasta.id })}
                >
                  {pasta.nome}
                </button>
              </span>
            ))}
          </nav>

          <div className="cui-arq__conteudo-acoes">{acoesDoCabecalho}</div>
        </header>

        <div className="cui-arq__titulo-linha">
          {pastaAtual ? (
            <MenuDeAcoes
              rotulo={`Ações de ${pastaAtual.nome}`}
              acoes={acoesDaPasta("grade")(pastaAtual)}
              alinhamento="inicio"
              className="cui-arq__titulo-gatilho"
            >
              <span className="cui-arq__titulo">{nomeAtual}</span>
              <IconeDeChevron tamanho={18} className="cui-arq__titulo-seta" />
            </MenuDeAcoes>
          ) : (
            <h2 className="cui-arq__titulo cui-arq__titulo--raiz">{nomeAtual}</h2>
          )}

          <button
            type="button"
            className="cui-arq__botao"
            onClick={() => void g.criarPasta(g.pastaAtualId, "grade")}
          >
            <IconeDeMais tamanho={15} />
            Nova pasta
          </button>
        </div>

        {g.erro ? (
          /* `alert`: uma falha de gravação precisa ser anunciada na hora — ela
             desfez algo que a pessoa já viu acontecer na tela. */
          <div role="alert" className="cui-arq__erro">
            <span>{g.erro}</span>
            <button type="button" className="cui-arq__botao" onClick={g.limparErro}>
              Entendi
            </button>
          </div>
        ) : null}

        <div className="cui-arq__painel" {...propsDeAlvo(alvoRaiz)}>
          {g.carregando ? (
            <p className="cui-arq__aviso">Carregando…</p>
          ) : (
            <>
              {g.etiquetaAtiva ? (
                <p className="cui-arq__filtro">
                  Filtrando por <strong>{g.etiquetaAtiva}</strong>
                  <button
                    type="button"
                    className="cui-arq__botao"
                    onClick={() => g.setEtiquetaAtiva(null)}
                  >
                    Limpar
                  </button>
                </p>
              ) : null}

              <GradeDePastas
                pastas={resumos}
                emEdicao={g.emEdicao?.origem === "grade" ? g.emEdicao.id : null}
                aoAbrir={g.abrirPasta}
                aoRenomear={(id, nome) => {
                  void g.renomearPasta(id, nome);
                  g.setEmEdicao(null);
                }}
                aoCancelarEdicao={() => g.setEmEdicao(null)}
                acoesDaPasta={acoesDaPasta("grade")}
                arrasto={arrasto}
              />

              {g.arquivosVisiveis.length > 0 ? (
                <TabelaDeArquivos
                  arquivos={g.arquivosVisiveis}
                  emEdicao={g.emEdicao?.origem === "lista" ? g.emEdicao.id : null}
                  aoRenomear={(id, nome) => {
                    void g.renomearArquivo(id, nome);
                    g.setEmEdicao(null);
                  }}
                  aoCancelarEdicao={() => g.setEmEdicao(null)}
                  acoesDoArquivo={acoesDoArquivo}
                  arrasto={arrasto}
                />
              ) : null}

              {vazio ? (
                <div className="cui-arq__vazio">
                  <IconeDeArquivo tamanho={28} />
                  <p className="cui-arq__vazio-titulo">
                    {g.busca ? "Nada encontrado" : "Esta pasta está vazia"}
                  </p>
                  <p className="cui-arq__aviso">
                    {g.busca
                      ? "Tente outro termo — a busca varre nomes de pastas, de arquivos e etiquetas."
                      : "Arraste arquivos de outra pasta para cá, ou crie uma subpasta."}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* ─── O fantasma do arrasto ────────────────────────────────────── */}
      <FantasmaDeArrasto
        item={arrasto.arrasto?.item ?? null}
        temAlvo={Boolean(arrasto.arrasto?.alvo)}
        refDoFantasma={arrasto.fantasmaRef}
      />
    </div>
  );
}

/**
 * O que segue o ponteiro durante o arrasto.
 *
 * ⭐ **Ele vive num portal, no `<body>`.** Dentro da página, qualquer ancestral
 * com `overflow` o recortaria — e as duas áreas por onde o arrasto passa (a
 * coluna e o painel) rolam. É a mesma razão do portal do menu suspenso.
 *
 * ⚠️ **Fica montado o tempo todo, com `hidden` quando não há arrasto.** Montá-lo
 * no início do gesto o faria aparecer um quadro atrasado, na posição inicial —
 * e o primeiro movimento seria um salto.
 */
function FantasmaDeArrasto({
  item,
  temAlvo,
  refDoFantasma,
}: {
  item: ItemArrastavel | null;
  temAlvo: boolean;
  refDoFantasma: React.RefObject<HTMLDivElement | null>;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={refDoFantasma}
      className="cui-arq__fantasma"
      data-visivel={item ? "true" : undefined}
      data-alvo={temAlvo ? "true" : undefined}
      aria-hidden="true"
      style={{ zIndex: camadas.painel + 1 }}
    >
      {item?.tipo === "pasta" ? <IconeDePasta tamanho={16} /> : <IconeDeArquivo tamanho={16} />}
      <span className="cui-arq__fantasma-rotulo">{item?.rotulo}</span>
    </div>,
    document.body,
  );
}
