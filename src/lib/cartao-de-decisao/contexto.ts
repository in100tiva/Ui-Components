"use client";

import { createContext, useContext } from "react";

/** O que foi decidido. `null` = ainda em aberto. */
export type Resultado = "aprovada" | "reprovada";

export type EstadoDoCartao = {
  resultado: Resultado | null;
  /**
   * Se a coreografia já terminou.
   *
   * ⭐ **Diferente de `resultado`, e a diferença é o desenho da sequência.** O
   * estado muda no clique; a CONFIRMAÇÃO chega quando o contorno fecha a volta.
   * Os controles só acendem aí — antes disso mostram que algo está acontecendo,
   * sem afirmar que acabou.
   *
   * ⚠️ Visual e só visual: `aria-checked` acompanha `resultado`, não isto.
   * Adiar o estado ANUNCIADO faria o leitor de tela mentir por 700ms.
   */
  confirmado: boolean;
  pendente: boolean;
  decidir: (resultado: Resultado) => void;
};

/*
  O contexto mora num arquivo próprio — e não junto do cartão — porque os
  controles o consomem e o cartão os renderiza. No mesmo arquivo, seria um ciclo
  de importação: funciona por sorte da ordem de avaliação, até o dia em que não
  funciona mais.
*/
export const Contexto = createContext<EstadoDoCartao | null>(null);

export function usarCartao(): EstadoDoCartao {
  const estado = useContext(Contexto);
  if (!estado) {
    throw new Error("Os controles precisam estar dentro de um <CartaoDeDecisao>.");
  }
  return estado;
}
