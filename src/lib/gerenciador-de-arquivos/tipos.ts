/**
 * **O vocabulário do gerenciador** — e a fronteira entre a interface e o seu
 * back-end.
 *
 * ⭐ Tudo que a página desenha sai destes tipos. Se o seu servidor devolve
 * outros nomes de campo, a tradução acontece em UM lugar — a implementação do
 * `RepositorioDeArquivos` — e nenhum componente precisa saber disso.
 */

/** Uma pasta. `paiId: null` é raiz — o topo da árvore. */
export type Pasta = {
  id: string;
  nome: string;
  paiId: string | null;
};

/**
 * De onde o arquivo veio. É só um selo visual: o gerenciador não integra com
 * ninguém, ele mostra a procedência do que já foi enviado.
 */
export type OrigemDoArquivo =
  | "drive"
  | "notion"
  | "dropbox"
  | "word"
  | "powerpoint"
  | "pdf"
  | "local";

/** Quem enviou. `avatarUrl` ausente vira a inicial do nome num círculo. */
export type Pessoa = {
  nome: string;
  email: string;
  avatarUrl?: string;
};

export type Arquivo = {
  id: string;
  nome: string;
  /** `null` = está na raiz, fora de qualquer pasta. */
  pastaId: string | null;
  origem?: OrigemDoArquivo;
  adicionadoPor: Pessoa;
  /** ISO 8601. Data como string é o que atravessa JSON sem surpresa de fuso. */
  adicionadoEm: string;
  /** Em bytes. */
  tamanho?: number;
  etiquetas?: readonly string[];
};

/** O acervo inteiro: a lista PLANA de pastas e arquivos. */
export type Acervo = {
  pastas: readonly Pasta[];
  arquivos: readonly Arquivo[];
};

/**
 * ⭐ **A lista é plana de propósito, e a árvore é derivada.**
 *
 * Guardar filhos dentro de cada pasta parece mais natural e é a origem de dois
 * problemas que aparecem tarde: mover uma pasta vira uma cirurgia em duas
 * listas (tirar de lá, pôr aqui, sem que nada se perca no meio), e qualquer
 * back-end real devolve linhas de tabela — que são exatamente isto. A árvore é
 * calculada por `montarArvore` quando a tela precisa dela.
 */
export type NoDaArvore = {
  pasta: Pasta;
  filhos: NoDaArvore[];
  /** Profundidade a partir da raiz — o recuo do item na árvore. */
  nivel: number;
};

/** O que pode ser arrastado. O `rotulo` é o que o fantasma mostra. */
export type ItemArrastavel = {
  tipo: "arquivo" | "pasta";
  id: string;
  rotulo: string;
};

/** Um destino de arrasto: uma pasta, ou a raiz. */
export type AlvoDeSoltura = {
  tipo: "pasta" | "raiz";
  /** `null` quando o alvo é a raiz. */
  id: string | null;
};
