"use client";

import { CampoDeNome } from "./CampoDeNome";
import { MenuDeAcoes } from "./MenuDeAcoes";
import type { AcaoDeMenu } from "./MenuDeAcoes";
import { IconeDeAcoes, IconeDeArquivo, SeloDeOrigem } from "./icones";
import { formatarData, formatarTamanho } from "./modelo";
import type { ApoioDeArrasto } from "./ArvoreDePastas";
import type { Arquivo } from "./tipos";

/**
 * **A lista de arquivos.**
 *
 * ⭐ **É uma `<table>` de verdade**, e não uma pilha de `div`s com `grid`. Uma
 * tabela real dá navegação por células no leitor de tela, associa cada valor ao
 * cabeçalho da coluna, e é lida como "tabela com 5 linhas" — informação que
 * `role="row"` remendado em `div` raramente entrega inteira.
 *
 * ⭐ **A linha inteira é a alça do arrasto**, e não um punho de seis pontinhos.
 * O punho é menor que o alvo mínimo de toque e obriga a mirar; a linha toda tem
 * 46px de altura e sempre está sob o dedo. O limiar de 6px do
 * `usarArrastarESoltar` é o que mantém o clique funcionando mesmo assim.
 *
 * ⚠️ **Colunas somem por largura, e a primeira a sair é a menos decisiva.**
 * Tamanho e data são contexto; quem enviou é quase sempre o que se procura
 * depois do nome — e o nome nunca sai.
 */
export function TabelaDeArquivos({
  arquivos,
  emEdicao,
  aoRenomear,
  aoCancelarEdicao,
  acoesDoArquivo,
  arrasto,
}: {
  arquivos: readonly Arquivo[];
  emEdicao: string | null;
  aoRenomear: (id: string, nome: string) => void;
  aoCancelarEdicao: () => void;
  acoesDoArquivo: (arquivo: Arquivo) => AcaoDeMenu[];
  arrasto: ApoioDeArrasto;
}) {
  return (
    <section className="cui-arq__secao">
      <h3 className="cui-arq__secao-titulo">Arquivos</h3>

      <div className="cui-arq__tabela-caixa">
        <table className="cui-arq__tabela">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col" className="cui-arq__col-autor">
                Adicionado por
              </th>
              <th scope="col" className="cui-arq__col-tamanho">
                Tamanho
              </th>
              <th scope="col" className="cui-arq__col-data">
                Adicionado em
              </th>
              <th scope="col">
                <span className="cui-arq__so-leitor">Ações</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {arquivos.map((arquivo) => {
              const editando = emEdicao === arquivo.id;
              return (
                <tr
                  key={arquivo.id}
                  className="cui-arq__linha"
                  onPointerDown={
                    editando
                      ? undefined
                      : arrasto.aoPressionar({
                          tipo: "arquivo",
                          id: arquivo.id,
                          rotulo: arquivo.nome,
                        })
                  }
                >
                  <td>
                    <span className="cui-arq__arquivo">
                      <span className="cui-arq__arquivo-icone" aria-hidden="true">
                        {arquivo.origem ? (
                          <SeloDeOrigem origem={arquivo.origem} tamanho={18} />
                        ) : (
                          <IconeDeArquivo tamanho={16} />
                        )}
                      </span>

                      {editando ? (
                        <CampoDeNome
                          valorInicial={arquivo.nome}
                          rotulo="Nome do arquivo"
                          aoConfirmar={(nome) => aoRenomear(arquivo.id, nome)}
                          aoCancelar={aoCancelarEdicao}
                        />
                      ) : (
                        <span className="cui-arq__arquivo-nome" title={arquivo.nome}>
                          {arquivo.nome}
                        </span>
                      )}
                    </span>
                  </td>

                  <td className="cui-arq__col-autor">
                    <span className="cui-arq__autor">
                      <Avatar pessoa={arquivo.adicionadoPor} />
                      <span className="cui-arq__autor-email">
                        {arquivo.adicionadoPor.email}
                      </span>
                    </span>
                  </td>

                  <td className="cui-arq__col-tamanho cui-arq__numero">
                    {formatarTamanho(arquivo.tamanho)}
                  </td>

                  <td className="cui-arq__col-data">{formatarData(arquivo.adicionadoEm)}</td>

                  <td className="cui-arq__col-acoes">
                    <MenuDeAcoes
                      rotulo={`Ações de ${arquivo.nome}`}
                      acoes={acoesDoArquivo(arquivo)}
                      className="cui-arq__linha-acoes"
                    >
                      <IconeDeAcoes tamanho={16} />
                    </MenuDeAcoes>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Foto quando existe, inicial quando não. A cor sai do próprio nome, para a
 *  mesma pessoa ter sempre o mesmo círculo — sem guardar cor nenhuma. */
function Avatar({ pessoa }: { pessoa: Arquivo["adicionadoPor"] }) {
  if (pessoa.avatarUrl) {
    return (
      <img
        src={pessoa.avatarUrl}
        alt=""
        className="cui-arq__avatar"
        loading="lazy"
        width={24}
        height={24}
      />
    );
  }

  const inicial = (pessoa.nome || pessoa.email).trim().charAt(0).toUpperCase();
  /* Matiz derivada do nome: determinística, estável entre sessões e sem campo
     novo no banco. A saturação e a luminosidade vêm fixas para o círculo não
     brigar com o acento nem sumir em nenhum dos dois temas. */
  let soma = 0;
  for (const letra of pessoa.nome || pessoa.email) soma = (soma + letra.charCodeAt(0)) % 360;

  return (
    <span
      className="cui-arq__avatar cui-arq__avatar--inicial"
      style={{ background: `oklch(0.72 0.09 ${soma})` }}
      aria-hidden="true"
    >
      {inicial}
    </span>
  );
}
