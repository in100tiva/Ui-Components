import { useState } from "react";

import { MenuSuspenso, usarTema } from "../lib";
import type { OpcaoMenu } from "../lib";

import "./vitrine.css";

/*
  `as const` é o que faz a inferência valer: sem ele, `valor` é `string` e o
  `useState` do ano aceitaria "banana". Com ele, o tipo do estado é a união dos
  doze meses, e o compilador recusa qualquer coisa fora da lista.
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

/* Lista longa: acima de 8 opções o `buscavel` faz a barra de filtrar aparecer. */
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
  { valor: "tjpe", rotulo: "TJPE", apoio: "Pernambuco — em manutenção", desabilitada: true },
];

export function Vitrine() {
  const { efetivo, alternar } = usarTema();

  const [mes, setMes] = useState<Mes | null>("02");
  const [ano, setAno] = useState<string | null>("2026");
  const [tribunal, setTribunal] = useState<string | null>(null);

  const rotuloDo = (opcoes: readonly OpcaoMenu[], valor: string | null) =>
    opcoes.find((o) => o.valor === valor)?.rotulo ?? "—";

  return (
    <main className="vitrine">
      <button
        type="button"
        onClick={alternar}
        className="vitrine__tema"
        aria-label={`Mudar para o tema ${efetivo === "escuro" ? "claro" : "escuro"}`}
      >
        {efetivo === "escuro" ? <IconeSol /> : <IconeLua />}
        <span>{efetivo === "escuro" ? "Claro" : "Escuro"}</span>
      </button>

      <div className="vitrine__palco">
        <header className="vitrine__cabecalho">
          <p className="vitrine__olho">Componentes-UI</p>
          <h1 className="vitrine__titulo">Menu Suspenso</h1>
          <p className="vitrine__apoio">
            Setas, Home/End, Enter, Esc e Tab. Digite as primeiras letras com o
            menu aberto ou fechado. Role a página com o menu aberto — ele
            acompanha, e vira para cima quando o rodapé chega perto.
          </p>
        </header>

        <section className="vitrine__grupo" aria-label="Período">
          <div className="vitrine__campo">
            <span className="vitrine__rotulo" id="rot-mes">
              Mês
            </span>
            <MenuSuspenso
              valor={mes}
              opcoes={MESES}
              placeholder="Todos os meses"
              rotuladoPor="rot-mes"
              aoSelecionar={setMes}
            />
          </div>

          <div className="vitrine__campo vitrine__campo--estreito">
            <span className="vitrine__rotulo" id="rot-ano">
              Ano
            </span>
            <MenuSuspenso
              valor={ano}
              opcoes={ANOS}
              placeholder="Ano"
              rotuladoPor="rot-ano"
              alinhamento="fim"
              aoSelecionar={setAno}
            />
          </div>
        </section>

        <section className="vitrine__grupo" aria-label="Tribunal">
          <div className="vitrine__campo">
            <span className="vitrine__rotulo" id="rot-tribunal">
              Tribunal <em>· lista longa, com filtro</em>
            </span>
            <MenuSuspenso
              valor={tribunal}
              opcoes={TRIBUNAIS}
              placeholder="Selecione o tribunal"
              rotuladoPor="rot-tribunal"
              buscavel
              placeholderBusca="Filtrar tribunais"
              aoSelecionar={setTribunal}
            />
          </div>
        </section>

        <section className="vitrine__grupo" aria-label="Estado desabilitado">
          <div className="vitrine__campo">
            <span className="vitrine__rotulo" id="rot-off">
              Comarca <em>· desabilitado</em>
            </span>
            <MenuSuspenso
              valor={null}
              opcoes={[{ valor: "x", rotulo: "Indisponível" }]}
              placeholder="Escolha o tribunal primeiro"
              rotuladoPor="rot-off"
              desabilitado
              aoSelecionar={() => {}}
            />
          </div>
        </section>

        <footer className="vitrine__saida" aria-live="polite">
          <Saida rotulo="Mês" valor={rotuloDo(MESES, mes)} />
          <Saida rotulo="Ano" valor={ano ?? "—"} />
          <Saida rotulo="Tribunal" valor={rotuloDo(TRIBUNAIS, tribunal)} />
        </footer>
      </div>
    </main>
  );
}

function Saida({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <span className="vitrine__saida-item">
      <span className="vitrine__saida-rotulo">{rotulo}</span>
      <span className="vitrine__saida-valor">{valor}</span>
    </span>
  );
}

function IconeSol() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
