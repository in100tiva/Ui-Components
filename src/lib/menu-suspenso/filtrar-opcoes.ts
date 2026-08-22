import type { OpcaoMenu } from "./tipos";

/**
 * Texto comparável: sem acento, sem caixa, sem espaço nas pontas.
 *
 * `NFD` separa a letra do acento e o range unicode remove só os diacríticos —
 * "março" e "marco" passam a casar nos dois sentidos. Sem isto, quem digita sem
 * acento (o normal em busca rápida) recebe "nada encontrado" sobre uma lista
 * que contém exatamente o que ele procurava.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Filtro por substring, com os que COMEÇAM com o texto na frente.
 *
 * Ordenar assim importa numa lista de meses: digitar "ma" com ordenação ingênua
 * devolve março e maio na ordem do calendário; com esta, ambos continuam no topo
 * — mas numa lista de nomes, "Ana" antes de "Mariana" é a diferença entre achar
 * no primeiro item e rolar. `sort` estável no V8 preserva a ordem original
 * dentro de cada grupo, então o calendário não se embaralha.
 */
export function filtrarOpcoes<T extends string>(
  opcoes: readonly OpcaoMenu<T>[],
  consulta: string,
): readonly OpcaoMenu<T>[] {
  const alvo = normalizar(consulta);
  if (!alvo) return opcoes;

  const casam = opcoes.filter((o) => normalizar(o.rotulo).includes(alvo));
  return casam.sort((a, b) => {
    const ia = normalizar(a.rotulo).startsWith(alvo) ? 0 : 1;
    const ib = normalizar(b.rotulo).startsWith(alvo) ? 0 : 1;
    return ia - ib;
  });
}
