import { useState } from "react";

import { CartaoConcluivel, CheckDeConclusao, RodapeDeConclusao } from "../../lib";
import { Bancada } from "../pecas";

type Tarefa = {
  id: string;
  titulo: string;
  apoio: string;
  concluida: boolean;
  detalhe?: string;
};

const INICIAIS: readonly Tarefa[] = [
  {
    id: "a",
    titulo: "Protocolar contestação",
    apoio: "Processo 1002345-67.2026.8.26.0100 · prazo em 21/08",
    concluida: false,
  },
  {
    id: "b",
    titulo: "Conferir publicação do DJe",
    apoio: "Caderno 3 · 12 intimações novas",
    concluida: false,
  },
  {
    id: "c",
    titulo: "Enviar minuta ao cliente",
    apoio: "Construtora Álvares · revisão aprovada",
    concluida: true,
    detalhe: "Concluída por Ana em 21/08, 14:32",
  },
];

export function DemoDoCartaoConcluivel() {
  const [tarefas, setTarefas] = useState(INICIAIS);
  const [gravando, setGravando] = useState<string | null>(null);

  const alternar = (id: string) => (concluida: boolean) =>
    setTarefas((atuais) =>
      atuais.map((t) =>
        t.id === id
          ? { ...t, concluida, detalhe: concluida ? "Concluída agora" : undefined }
          : t,
      ),
    );

  /* Simula uma gravação lenta, para ver o estado `pendente` de verdade. */
  function alternarComLatencia(id: string) {
    return (concluida: boolean) => {
      setGravando(id);
      setTimeout(() => {
        alternar(id)(concluida);
        setGravando(null);
      }, 900);
    };
  }

  const feitas = tarefas.filter((t) => t.concluida).length;

  return (
    <>
      <Bancada
        titulo="Marcar como concluída"
        apoio="Clique no círculo. O contorno se desenha a partir do canto superior esquerdo, de ponta a ponta. O terceiro cartão já chega concluído — e por isso NÃO anima: a animação pertence ao gesto, não ao estado."
        saida={[{ rotulo: "Concluídas", valor: `${feitas} de ${tarefas.length}` }]}
      >
        <div className="demo-cartoes">
          {tarefas.map((tarefa) => (
            <CartaoConcluivel
              key={tarefa.id}
              concluido={tarefa.concluida}
              aoAlternar={alternar(tarefa.id)}
              detalhe={tarefa.detalhe ?? null}
            >
              <div className="demo-cartao-linha">
                <CheckDeConclusao />
                <div className="demo-cartao-texto">
                  <strong>{tarefa.titulo}</strong>
                  <span>{tarefa.apoio}</span>
                </div>
              </div>
              <RodapeDeConclusao />
            </CartaoConcluivel>
          ))}
        </div>
      </Bancada>

      <Bancada
        titulo="Cartão longo"
        apoio="O mesmo contorno, num cartão de outra altura. `pathLength={100}` normaliza o perímetro: o traço leva o mesmo tempo para dar a volta, seja o cartão de três linhas ou de trinta."
      >
        <CartaoLongo />
      </Bancada>

      <Bancada
        titulo="Enquanto grava"
        apoio="Este leva 900ms para responder. O controle fica em aria-busy, recusa novos cliques e mostra o cursor de progresso — e o contorno só desenha quando o estado de verdade chega."
      >
        <CartaoConcluivel
          concluido={tarefas[0]?.concluida ?? false}
          aoAlternar={alternarComLatencia("a")}
          pendente={gravando === "a"}
        >
          <div className="demo-cartao-linha">
            <CheckDeConclusao />
            <div className="demo-cartao-texto">
              <strong>Gravação com latência</strong>
              <span>{gravando === "a" ? "Gravando…" : "Clique e observe o atraso"}</span>
            </div>
          </div>
          <RodapeDeConclusao />
        </CartaoConcluivel>
      </Bancada>
    </>
  );
}

function CartaoLongo() {
  const [feito, setFeito] = useState(false);
  return (
    <CartaoConcluivel concluido={feito} aoAlternar={setFeito}>
      <div className="demo-cartao-linha">
        <CheckDeConclusao />
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
        Depois do saque, anexar o comprovante ao processo e dar baixa na
        provisão de recebíveis para o mês corrente.
      </p>
      <RodapeDeConclusao />
    </CartaoConcluivel>
  );
}
