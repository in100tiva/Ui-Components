/**
 * Uma opção do menu.
 *
 * O genérico `T extends string` é o que faz o componente devolver o literal que
 * ENTROU, e não um `string` genérico: com `opcoes` declarado `as const`,
 * `aoSelecionar` recebe `"01" | "02" | ...` e o `switch` do chamador é
 * exaustivo, checado pelo compilador. É a diferença entre a tipagem descrever o
 * componente e a tipagem descrever OS SEUS DADOS.
 */
export type OpcaoMenu<T extends string = string> = {
  valor: T;
  rotulo: string;
  /** Fora de serviço: continua visível e anunciado, mas não é escolhível. */
  desabilitada?: boolean;
  /** Uma linha de apoio sob o rótulo — para quando o rótulo sozinho é ambíguo. */
  apoio?: string;
};

export type TamanhoDoMenu = "md" | "lg";
export type AlinhamentoDoMenu = "inicio" | "fim";
