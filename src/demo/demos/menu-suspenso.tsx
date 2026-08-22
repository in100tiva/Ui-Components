import { useState } from "react";

import { MenuSuspenso } from "../../lib";
import type { OpcaoMenu } from "../../lib";
import { Bancada, Campo } from "../pecas";

/*
  `as const satisfies` é o que faz a inferência valer: sem ele, `valor` é
  `string` e o `useState` do mês aceitaria "banana". Com ele, o tipo do estado é
  a união dos doze meses, e o compilador recusa qualquer coisa fora da lista —
  enquanto `satisfies` continua conferindo que a forma bate com `OpcaoMenu`.
*/
const MESES = [
  { valor: "01", rotulo: "Janeiro" },
  { valor: "02", rotulo: "Fevereiro" },
  { valor: "03", rotulo: "Março" },
  { valor: "04", rotulo: "Abril" },
  { valor: "05", rotulo: "Maio" },
  { valor: "06", rotulo: "Junho" },
  { valor: "07", rotulo: "Julho" },
  { valor: "08", rotulo: "Agosto" },
  { valor: "09", rotulo: "Setembro" },
  { valor: "10", rotulo: "Outubro" },
  { valor: "11", rotulo: "Novembro" },
  { valor: "12", rotulo: "Dezembro" },
] as const satisfies readonly OpcaoMenu[];

type Mes = (typeof MESES)[number]["valor"];

const ANOS = ["2024", "2025", "2026", "2027", "2028"].map((a) => ({
  valor: a,
  rotulo: a,
}));

/* Acima de 8 opções o `buscavel` faz a barra de filtrar aparecer. */
const TRIBUNAIS: readonly OpcaoMenu[] = [
  { valor: "stf", rotulo: "STF", apoio: "Supremo Tribunal Federal" },
  { valor: "stj", rotulo: "STJ", apoio: "Superior Tribunal de Justiça" },
  { valor: "tst", rotulo: "TST", apoio: "Tribunal Superior do Trabalho" },
  { valor: "tse", rotulo: "TSE", apoio: "Tribunal Superior Eleitoral" },
  { valor: "trf1", rotulo: "TRF 1ª Região", apoio: "Brasília" },
  { valor: "trf2", rotulo: "TRF 2ª Região", apoio: "Rio de Janeiro" },
  { valor: "trf3", rotulo: "TRF 3ª Região", apoio: "São Paulo" },
  { valor: "trf4", rotulo: "TRF 4ª Região", apoio: "Porto Alegre" },
  { valor: "trf5", rotulo: "TRF 5ª Região", apoio: "Recife" },
  { valor: "trf6", rotulo: "TRF 6ª Região", apoio: "Belo Horizonte" },
  { valor: "tjsp", rotulo: "TJSP", apoio: "São Paulo" },
  { valor: "tjrj", rotulo: "TJRJ", apoio: "Rio de Janeiro" },
  { valor: "tjmg", rotulo: "TJMG", apoio: "Minas Gerais" },
  { valor: "tjba", rotulo: "TJBA", apoio: "Bahia" },
  {
    valor: "tjpe",
    rotulo: "TJPE",
    apoio: "Pernambuco — em manutenção",
    desabilitada: true,
  },
];

export function DemoDoMenuSuspenso() {
  const [mes, setMes] = useState<Mes | null>("02");
  const [ano, setAno] = useState<string | null>("2026");
  const [tribunal, setTribunal] = useState<string | null>(null);
  const [vazio, setVazio] = useState<string | null>(null);

  const rotuloDe = (opcoes: readonly OpcaoMenu[], valor: string | null) =>
    opcoes.find((o) => o.valor === valor)?.rotulo ?? "—";

  return (
    <>
      <Bancada
        titulo="Período"
        apoio="Dois menus lado a lado. O de Ano alinha o painel pela borda direita."
        saida={[
          { rotulo: "Mês", valor: rotuloDe(MESES, mes) },
          { rotulo: "Ano", valor: ano ?? "—" },
        ]}
      >
        <div className="demo-linha">
          <Campo rotulo="Mês" id="rot-mes">
            <MenuSuspenso
              valor={mes}
              opcoes={MESES}
              placeholder="Todos os meses"
              rotuladoPor="rot-mes"
              aoSelecionar={setMes}
            />
          </Campo>

          <Campo rotulo="Ano" id="rot-ano" estreito>
            <MenuSuspenso
              valor={ano}
              opcoes={ANOS}
              placeholder="Ano"
              rotuladoPor="rot-ano"
              alinhamento="fim"
              aoSelecionar={setAno}
            />
          </Campo>
        </div>
      </Bancada>

      <Bancada
        titulo="Lista longa, com filtro"
        apoio="A barra de busca só aparece a partir de 8 opções. Digite sem acento — o filtro normaliza. Um item está desabilitado."
        saida={[{ rotulo: "Tribunal", valor: rotuloDe(TRIBUNAIS, tribunal) }]}
      >
        <Campo rotulo="Tribunal" id="rot-tribunal">
          <MenuSuspenso
            valor={tribunal}
            opcoes={TRIBUNAIS}
            placeholder="Selecione o tribunal"
            rotuladoPor="rot-tribunal"
            buscavel
            placeholderBusca="Filtrar tribunais"
            aoSelecionar={setTribunal}
          />
        </Campo>
      </Bancada>

      <Bancada
        titulo="Estados"
        apoio="Sem escolha, o rótulo é mais leve — dá para ver se o campo está preenchido sem ler. Desabilitado fecha o menu se estiver aberto."
      >
        <div className="demo-linha">
          <Campo rotulo="Vazio" id="rot-vazio">
            <MenuSuspenso
              valor={vazio}
              opcoes={MESES}
              placeholder="Nada escolhido"
              rotuladoPor="rot-vazio"
              aoSelecionar={setVazio}
            />
          </Campo>

          <Campo rotulo="Desabilitado" id="rot-off">
            <MenuSuspenso
              valor={null}
              opcoes={[{ valor: "x", rotulo: "Indisponível" }]}
              placeholder="Escolha o tribunal antes"
              rotuladoPor="rot-off"
              desabilitado
              aoSelecionar={() => {}}
            />
          </Campo>
        </div>
      </Bancada>

      <Bancada
        titulo="Tamanho lg"
        apoio="46px em vez de 44px — para formulários com campos maiores."
      >
        <Campo rotulo="Mês" id="rot-lg">
          <MenuSuspenso
            valor={mes}
            opcoes={MESES}
            placeholder="Todos os meses"
            rotuladoPor="rot-lg"
            tamanho="lg"
            aoSelecionar={setMes}
          />
        </Campo>
      </Bancada>
    </>
  );
}
