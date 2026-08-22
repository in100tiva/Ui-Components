/**
 * Ponto único de entrada da biblioteca.
 *
 * Quem consome importa daqui e de mais lugar nenhum — é o que permite mover
 * arquivos internos sem quebrar projeto de destino.
 */
export { MenuSuspenso } from "./menu-suspenso/MenuSuspenso";
export type { PropsDoMenuSuspenso } from "./menu-suspenso/MenuSuspenso";
export type {
  OpcaoMenu,
  TamanhoDoMenu,
  AlinhamentoDoMenu,
} from "./menu-suspenso/tipos";

/* Os tokens em JavaScript: a camada que atravessa até onde CSS não chega.
   Gerados de `tokens/tokens.json` — ver o README. */
export {
  cores,
  curvas,
  formas,
  tipografia,
  camadas,
  tempos,
  contagens,
  coresDoTema,
} from "./tokens/tokens";
export type { NomeDeTema } from "./tokens/tokens";

/* A casca do app: moldura, coluna lateral e cartão central. */
export { Casca } from "./casca/Casca";
export type { PropsDaCasca } from "./casca/Casca";
export { NavegacaoLateral } from "./casca/NavegacaoLateral";
export type { ItemDeNavegacao, GrupoDeNavegacao } from "./casca/NavegacaoLateral";

export { usarTema } from "./tema/usar-tema";
export type { Tema, TemaEfetivo } from "./tema/usar-tema";
