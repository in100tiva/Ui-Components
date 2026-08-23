import { useState } from "react";

import { Abas } from "../../lib";
import type { Aba } from "../../lib";
import { Bancada } from "../pecas";

/* Um caso realista: as seções de um processo. Rótulos de larguras bem
   diferentes de propósito — é o que expõe uma pílula que não mede. */
const SECOES = [
  { valor: "resumo", rotulo: "Resumo" },
  { valor: "andamentos", rotulo: "Andamentos", selo: "12" },
  { valor: "partes", rotulo: "Partes e advogados" },
  { valor: "documentos", rotulo: "Documentos" },
  { valor: "financeiro", rotulo: "Financeiro", desabilitada: true },
] as const satisfies readonly Aba[];

type Secao = (typeof SECOES)[number]["valor"];

const TEXTO: Record<Secao, string> = {
  resumo:
    "Ação de cobrança em fase de conhecimento. A pestana que marca esta aba está pintada com a paleta do tema OPOSTO — troque o tema no rodapé da coluna e ela inverte junto, sem nenhuma cor nova ter sido definida.",
  andamentos:
    "Doze movimentações desde a distribuição. Note o que acontece com as letras enquanto a pestana viaja até aqui: elas se invertem conforme entram na janela, em vez de trocarem de cor todas de uma vez no fim.",
  partes:
    "Autor, réu e os procuradores de cada lado. Esta aba é a mais larga da barra — a pestana anima a largura junto com a posição, senão ela chegaria ao destino com a medida da aba anterior.",
  documentos:
    "Petição inicial, procuração e documentos comprobatórios. Chegue até aqui pelo teclado: ← e → percorrem e já abrem a seção, Home e End vão às pontas, e o Tab sai da barra para este conteúdo.",
  financeiro: "",
};

/* Três abas curtas, para ver o mesmo desenho num grupo pequeno. */
const PERIODOS = [
  { valor: "dia", rotulo: "Hoje" },
  { valor: "semana", rotulo: "Semana" },
  { valor: "mes", rotulo: "Mês" },
] as const satisfies readonly Aba[];

export function DemoDasAbas() {
  const [secao, setSecao] = useState<Secao>("resumo");
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["valor"]>("semana");

  return (
    <>
      <Bancada
        titulo="Seções de uma página"
        apoio="A aba aberta é uma PESTANA com as cores do tema invertido — no claro ela é escura, no escuro é clara — e os dois pés côncavos a fazem nascer da linha da barra em vez de pousar sobre ela. Ela desliza RECORTANDO uma cópia da barra: por isso o texto se inverte no meio do caminho, e nunca fica claro sobre fundo claro."
        saida={[{ rotulo: "Seção", valor: secao }]}
      >
        <Abas abas={SECOES} valor={secao} aoTrocar={setSecao} rotulo="Seções do processo">
          <p className="demo-abas__texto">{TEXTO[secao]}</p>
        </Abas>
      </Bancada>

      <Bancada
        titulo="Grupo curto, sem painel"
        apoio="Sem `children` não há tabpanel: o componente desenha só a barra, e quem consome liga o resultado ao que quiser. A aba desabilitada da barra de cima é pulada pelas setas — ela não é uma parada."
        saida={[{ rotulo: "Período", valor: periodo }]}
      >
        <Abas
          abas={PERIODOS}
          valor={periodo}
          aoTrocar={setPeriodo}
          rotulo="Período do relatório"
        />
      </Bancada>
    </>
  );
}
