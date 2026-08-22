import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoDePresenca = "fechado" | "aberto" | "fechando";

/**
 * Mantém um nó montado durante a animação de SAÍDA.
 *
 * O problema que ele resolve é o de sempre em popover: `aberto && <Painel/>`
 * desmonta o nó no mesmo frame do clique, e a animação de saída — que precisa
 * do nó vivo para rodar — nunca chega a ser pintada. Aqui `montado` sobrevive
 * a `aberto` pelo tempo exato da saída, e só então o React remove.
 *
 * `fechar(true)` pula a espera: Escape e Tab devem devolver o foco AGORA, e um
 * painel ainda ocupando a tela por 300ms depois disso é o que faz o segundo
 * Tab cair num item invisível.
 */
export function usarPresenca(duracaoDeSaida: number) {
  const [estado, setEstado] = useState<EstadoDePresenca>("fechado");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limpar = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const abrir = useCallback(() => {
    limpar();
    setEstado("aberto");
  }, [limpar]);

  const fechar = useCallback(
    (imediato = false) => {
      limpar();
      if (imediato) {
        setEstado("fechado");
        return;
      }
      setEstado((atual) => (atual === "aberto" ? "fechando" : atual));
      timer.current = setTimeout(() => {
        setEstado("fechado");
        timer.current = null;
      }, duracaoDeSaida);
    },
    [duracaoDeSaida, limpar],
  );

  /* Desmontar com um timer pendente agenda um setState em componente morto —
     e, pior, deixa o nó preso em "fechando" se o pai remontar. */
  useEffect(() => limpar, [limpar]);

  return {
    estado,
    aberto: estado === "aberto",
    montado: estado !== "fechado",
    abrir,
    fechar,
  };
}
