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

export { usarTema } from "./tema/usar-tema";
export type { Tema, TemaEfetivo } from "./tema/usar-tema";
