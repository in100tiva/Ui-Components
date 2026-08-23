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

/* Cartão de decisão — o contorno que se desenha ao aprovar ou reprovar. */
export {
  CartaoDeDecisao,
  RodapeDaDecisao,
} from "./cartao-de-decisao/CartaoDeDecisao";
export { InterruptorDeDecisao } from "./cartao-de-decisao/InterruptorDeDecisao";
/* Exportada para verificação: jsdom não faz layout, então a única forma de
   testar onde a alavanca pousa é testar a conta. */
export { paradasDe } from "./cartao-de-decisao/InterruptorDeDecisao";
export type { PropsDoCartaoDeDecisao } from "./cartao-de-decisao/CartaoDeDecisao";
export type { Resultado } from "./cartao-de-decisao/contexto";

/* A casca do app: moldura, coluna lateral e cartão central. */
export { Casca } from "./casca/Casca";
export type { PropsDaCasca } from "./casca/Casca";
export { NavegacaoLateral } from "./casca/NavegacaoLateral";
export type { ItemDeNavegacao, GrupoDeNavegacao } from "./casca/NavegacaoLateral";

/* Abas — a barra de seções, com a escolhida pintada no tema invertido. */
export { Abas } from "./abas/Abas";
export type { Aba, PropsDasAbas } from "./abas/Abas";

/* Gerenciador de Arquivos — um PADRÃO DE PÁGINA inteiro: coluna do acervo,
   grade de pastas, lista de arquivos, arrasta-e-solta e menus, sobre uma única
   porta de dados. Ver o README. */
export { GerenciadorDeArquivos } from "./gerenciador-de-arquivos/GerenciadorDeArquivos";
export type { PropsDoGerenciador } from "./gerenciador-de-arquivos/GerenciadorDeArquivos";
export {
  criarRepositorioEmMemoria,
  criarRepositorioHttp,
} from "./gerenciador-de-arquivos/repositorio";
export type {
  RepositorioDeArquivos,
  OpcoesEmMemoria,
  OpcoesHttp,
} from "./gerenciador-de-arquivos/repositorio";
export type {
  Acervo,
  Arquivo,
  Pasta,
  Pessoa,
  OrigemDoArquivo,
  NoDaArvore,
  ItemArrastavel,
  AlvoDeSoltura,
} from "./gerenciador-de-arquivos/tipos";
/* As peças, para quem quiser montar outra composição com as mesmas partes. */
export { usarGerenciadorDeArquivos } from "./gerenciador-de-arquivos/usar-gerenciador";
export { usarArrastarESoltar, propsDeAlvo } from "./gerenciador-de-arquivos/usar-arrastar";
export { ArvoreDePastas } from "./gerenciador-de-arquivos/ArvoreDePastas";
export { GradeDePastas } from "./gerenciador-de-arquivos/GradeDePastas";
export { TabelaDeArquivos } from "./gerenciador-de-arquivos/TabelaDeArquivos";
export { MenuDeAcoes } from "./gerenciador-de-arquivos/MenuDeAcoes";
export type { AcaoDeMenu } from "./gerenciador-de-arquivos/MenuDeAcoes";
/* As contas puras — testáveis sem montar tela nenhuma. */
export {
  montarArvore,
  caminhoAte,
  podeMoverPasta,
  subarvoreDe,
  contarArquivos,
  buscar,
  etiquetasDe,
  nomeDisponivel,
  formatarTamanho,
} from "./gerenciador-de-arquivos/modelo";

/* Fundos — a camada decorativa atrás do site inteiro. */
export { FundoDeOrbes } from "./fundos/FundoDeOrbes";
export { FundoDeSeda } from "./fundos/FundoDeSeda";
export type { PropsDoFundoDeSeda } from "./fundos/FundoDeSeda";
export type { MovimentoDoFundo } from "./fundos/movimento";
export type { PropsDoFundoDeOrbes } from "./fundos/FundoDeOrbes";
export { FUNDOS, CamadaDeFundo } from "./fundos/catalogo";
export type { FundoDisponivel } from "./fundos/catalogo";
export { usarFundo } from "./fundos/usar-fundo";
export type { FundoAtivo } from "./fundos/usar-fundo";

/* A camada de movimento — o anime.js falando a língua do design. */
export { animate, mola, ondaDeItens, coreografar, devolverAoCss } from "./movimento/movimento";
export type { NomeDeMola } from "./movimento/movimento";
export { molas } from "./tokens/tokens";

export { usarTema } from "./tema/usar-tema";
export type { Tema, TemaEfetivo } from "./tema/usar-tema";
