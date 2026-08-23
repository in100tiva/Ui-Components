"use client";

import { CampoDeNome } from "./CampoDeNome";
import { MenuDeAcoes } from "./MenuDeAcoes";
import type { AcaoDeMenu } from "./MenuDeAcoes";
import { IconeDeAcoes, SeloDeOrigem } from "./icones";
import { propsDeAlvo } from "./usar-arrastar";
import type { ApoioDeArrasto } from "./ArvoreDePastas";
import type { AlvoDeSoltura, OrigemDoArquivo, Pasta } from "./tipos";

export type ResumoDePasta = {
  pasta: Pasta;
  quantidade: number;
  /** As origens dos arquivos de dentro, sem repetir — os selos do canto. */
  origens: readonly OrigemDoArquivo[];
};

/**
 * **A grade de pastas** — o corpo da página.
 *
 * ⭐ **A pasta é um OBJETO desenhado, não um ícone de traço**, e a diferença é o
 * que faz esta tela parecer um lugar onde coisas são guardadas. São três
 * camadas: as costas com a aba, os papéis, e a frente. O que se vê entre a
 * frente e as costas é conteúdo — uma pasta vazia não tem papel nenhum, e isso
 * é informação antes de qualquer texto ser lido.
 *
 * ⭐ **Os papéis saem quando o ponteiro chega, e saem MAIS quando há um arquivo
 * sendo arrastado.** O segundo estado é o que responde à pergunta do arrasto:
 * "é aqui que vai cair?". Um contorno aceso responderia igual, mas a pasta que
 * se abre diz o que vai acontecer, e não só onde.
 */
export function GradeDePastas({
  pastas,
  emEdicao,
  aoAbrir,
  aoRenomear,
  aoCancelarEdicao,
  acoesDaPasta,
  arrasto,
}: {
  pastas: readonly ResumoDePasta[];
  emEdicao: string | null;
  aoAbrir: (id: string) => void;
  aoRenomear: (id: string, nome: string) => void;
  aoCancelarEdicao: () => void;
  acoesDaPasta: (pasta: Pasta) => AcaoDeMenu[];
  arrasto: ApoioDeArrasto;
}) {
  if (pastas.length === 0) return null;

  return (
    <section className="cui-arq__secao">
      <h3 className="cui-arq__secao-titulo">Pastas</h3>
      <div className="cui-arq__grade">
        {pastas.map(({ pasta, quantidade, origens }) => {
          const alvo: AlvoDeSoltura = { tipo: "pasta", id: pasta.id };
          const aceso = arrasto.alvoAceso(alvo);
          const editando = emEdicao === pasta.id;

          return (
            <div
              key={pasta.id}
              className="cui-arq__cartao"
              data-aceso={aceso ? "true" : undefined}
              {...propsDeAlvo(alvo)}
            >
              <button
                type="button"
                className="cui-arq__cartao-alvo"
                /* O nome acessível inclui a contagem: "Onboarding, 15 arquivos"
                   é o que um leitor de tela precisa dizer, e o desenho não diz
                   nada — ele é `aria-hidden`. */
                aria-label={`${pasta.nome}, ${quantidade} ${quantidade === 1 ? "arquivo" : "arquivos"}`}
                onClick={() => aoAbrir(pasta.id)}
                onPointerDown={arrasto.aoPressionar({
                  tipo: "pasta",
                  id: pasta.id,
                  rotulo: pasta.nome,
                })}
              >
                <DesenhoDePasta quantidade={quantidade} origens={origens} />
              </button>

              <div className="cui-arq__cartao-rodape">
                {editando ? (
                  <CampoDeNome
                    valorInicial={pasta.nome}
                    rotulo="Nome da pasta"
                    aoConfirmar={(nome) => aoRenomear(pasta.id, nome)}
                    aoCancelar={aoCancelarEdicao}
                  />
                ) : (
                  <span className="cui-arq__cartao-nome" title={pasta.nome}>
                    {pasta.nome}
                  </span>
                )}
                <span className="cui-arq__cartao-contagem">
                  {quantidade} {quantidade === 1 ? "arquivo" : "arquivos"}
                </span>
              </div>

              {!editando ? (
                <MenuDeAcoes
                  rotulo={`Ações de ${pasta.nome}`}
                  acoes={acoesDaPasta(pasta)}
                  className="cui-arq__cartao-acoes"
                >
                  <IconeDeAcoes tamanho={16} />
                </MenuDeAcoes>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * O desenho em si.
 *
 * ⚠️ **Três papéis no máximo, e a razão não é estética.** A pilha existe para
 * dizer "tem coisa aqui dentro"; o número exato está escrito logo abaixo. Um
 * papel por arquivo faria uma pasta com quarenta arquivos desenhar quarenta nós
 * que ninguém consegue contar — e uma lista de trinta pastas, mil e duzentos.
 */
function DesenhoDePasta({
  quantidade,
  origens,
}: {
  quantidade: number;
  origens: readonly OrigemDoArquivo[];
}) {
  const papeis = Math.min(quantidade, 3);

  return (
    <span className="cui-arq__pasta" aria-hidden="true" data-vazia={quantidade === 0 ? "true" : undefined}>
      <span className="cui-arq__pasta-costas" />

      <span className="cui-arq__pasta-papeis">
        {Array.from({ length: papeis }, (_, i) => (
          <span key={i} className="cui-arq__papel" data-indice={i} />
        ))}
      </span>

      <span className="cui-arq__pasta-frente">
        {origens.length > 0 ? (
          <span className="cui-arq__pasta-selos">
            {/* Três selos bastam: o quarto já não é lido como informação, é
                textura — e empurra o nome da pasta para fora do cartão. */}
            {origens.slice(0, 3).map((origem) => (
              <SeloDeOrigem key={origem} origem={origem} tamanho={16} />
            ))}
          </span>
        ) : null}
      </span>
    </span>
  );
}
