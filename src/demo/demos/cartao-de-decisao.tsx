import { useState } from "react";

import { CartaoDeDecisao, InterruptorDeDecisao, RodapeDaDecisao } from "../../lib";
import type { Resultado } from "../../lib";
import { Bancada } from "../pecas";

type Tarefa = {
  id: string;
  titulo: string;
  apoio: string;
  resultado: Resultado | null;
  detalhe?: string;
};

const INICIAIS: readonly Tarefa[] = [
  {
    id: "a",
    titulo: "Protocolar contestação",
    apoio: "Processo 1002345-67.2026.8.26.0100 · prazo em 21/08",
    resultado: null,
  },
  {
    id: "b",
    titulo: "Minuta de acordo",
    apoio: "Construtora Álvares · segunda revisão",
    resultado: null,
  },
  {
    id: "c",
    titulo: "Levantamento de alvará",
    apoio: "Conta bancária divergente",
    resultado: "reprovada",
    detalhe: "Reprovada por Ana em 21/08, 14:32",
  },
  {
    id: "d",
    titulo: "Conferir publicação do DJe",
    apoio: "Caderno 3 · 12 intimações",
    resultado: "aprovada",
    detalhe: "Aprovada por Ana em 21/08, 09:10",
  },
];

export function DemoDoCartaoDeDecisao() {
  const [tarefas, setTarefas] = useState(INICIAIS);

  const decidir = (id: string) => (resultado: Resultado | null) =>
    setTarefas((atuais) =>
      atuais.map((t) => (t.id === id ? { ...t, resultado, detalhe: undefined } : t)),
    );

  const contar = (r: Resultado) => tarefas.filter((t) => t.resultado === r).length;

  return (
    <>
      <Bancada
        titulo="Aprovar ou reprovar"
        apoio="Dois botões, não um interruptor: o estado aberto é simplesmente nenhum dos dois pressionado. Clicar de novo no lado ativo desfaz. Os dois últimos cartões já chegam decididos — e por isso NÃO animam."
        saida={[
          { rotulo: "Aprovadas", valor: String(contar("aprovada")) },
          { rotulo: "Reprovadas", valor: String(contar("reprovada")) },
        ]}
      >
        <div className="demo-cartoes">
          {tarefas.map((tarefa) => (
            <CartaoDeDecisao
              key={tarefa.id}
              resultado={tarefa.resultado}
              aoDecidir={decidir(tarefa.id)}
              detalhe={tarefa.detalhe ?? null}
            >
              <div className="demo-cartao-linha">
                <InterruptorDeDecisao />
                <div className="demo-cartao-texto">
                  <strong>{tarefa.titulo}</strong>
                  <span>{tarefa.apoio}</span>
                </div>
              </div>
              <RodapeDaDecisao>
                {tarefa.detalhe ??
                  (tarefa.resultado === "aprovada" ? "Aprovada agora" : "Reprovada agora")}
              </RodapeDaDecisao>
            </CartaoDeDecisao>
          ))}
        </div>
      </Bancada>

      <Bancada
        titulo="Cartão longo"
        apoio="O mesmo contorno, noutra altura. `pathLength={100}` normaliza o perímetro: o traço leva o mesmo tempo para dar a volta, seja o cartão de três linhas ou de trinta. A malha e a lavagem acompanham a caixa."
      >
        <CartaoLongo />
      </Bancada>
    </>
  );
}

function CartaoLongo() {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  return (
    <CartaoDeDecisao resultado={resultado} aoDecidir={setResultado}>
      <div className="demo-cartao-linha">
        <InterruptorDeDecisao />
        <div className="demo-cartao-texto">
          <strong>Levantamento de alvará</strong>
          <span>Processo 0008123-45.2025.8.26.0053</span>
        </div>
      </div>
      <p className="demo-cartao-corpo">
        Requerer o levantamento do alvará judicial expedido nos autos, com
        atualização do cálculo até a data do saque e juntada da guia. Conferir se
        a conta cadastrada é a do cliente e não a do escritório — o depósito na
        conta errada exige petição de retificação e novo prazo de expedição.
      </p>
      <p className="demo-cartao-corpo">
        Depois do saque, anexar o comprovante ao processo e dar baixa na provisão
        de recebíveis para o mês corrente.
      </p>
      <RodapeDaDecisao />
    </CartaoDeDecisao>
  );
}
