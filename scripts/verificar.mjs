#!/usr/bin/env node
/**
 * Verificação de COMPORTAMENTO — o que o typecheck não alcança.
 *
 * Monta os componentes num DOM de verdade (jsdom), dispara cliques e confere o
 * que sobrou no DOM depois das animações. Existe porque a classe de defeito mais
 * cara desta biblioteca não é de tipo nem de sintaxe: é estilo inline que
 * sobrevive à animação, animação que não é cancelada, e API de terceiro que
 * mudou sem quebrar nada — tudo isso passa no `tsc` e no build.
 *
 * Defeitos reais encontrados por este arquivo:
 *   1. `devolverAoCss` apagava o `maxHeight` que o React controla, e o painel
 *      crescia até caber a lista inteira ao terminar de abrir;
 *   2. fechar no meio da abertura não cancelava a entrada, que terminava
 *      sozinha durante a saída e "reabria" o menu já fechado;
 *   3. o anime.js 4.5 removeu `ease: "cubicBezier(…)"` em string — a animação
 *      seguia rodando com o easing errado, avisando só no console;
 *   4. a animação de ENTRADA parou de rodar quando o sinal de "já medi" virou
 *      ref: ref não é dependência de efeito, então a coreografia nunca
 *      reexecutava. Nada quebrou — a abertura só ficou seca.
 *
 * ⚠️ jsdom não faz layout: `getBoundingClientRect` devolve zeros. Isso é
 * suficiente para o que se verifica aqui (presença, atributos, estilo inline),
 * e insuficiente para qualquer coisa que dependa de posição real na tela.
 *
 * Rodar: `pnpm verificar`
 */

import { readFileSync } from "node:fs";

import { JSDOM } from "jsdom";
import { createServer } from "vite";

/* --- Ambiente ------------------------------------------------------------ */

const dom = new JSDOM("<!doctype html><html><body><div id='raiz'></div></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const w = dom.window;

const definir = (nome, valor) => {
  try {
    Object.defineProperty(globalThis, nome, { value: valor, configurable: true, writable: true });
  } catch {
    /* alguns globais do Node são só-leitura; os que importam não são */
  }
};

/*
  O anime.js checa `NodeList`, `SVGElement` e companhia por `instanceof`, então
  não basta `window` e `document` — o ambiente inteiro precisa estar no global.
*/
for (const chave of Object.getOwnPropertyNames(w)) {
  if (chave in globalThis && chave !== "window" && chave !== "document") continue;
  const valor = w[chave];
  definir(chave, typeof valor === "function" && /^[a-z]/.test(chave) ? valor.bind(w) : valor);
}

/* Herdados do protótipo de Window — não aparecem em `getOwnPropertyNames`. */
for (const metodo of [
  "addEventListener",
  "removeEventListener",
  "dispatchEvent",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
]) {
  if (typeof w[metodo] === "function") definir(metodo, w[metodo].bind(w));
}

definir("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

/* jsdom não implementa `matchMedia`. Sem ele, `usarTema` e a checagem de
   `prefers-reduced-motion` lançam antes de qualquer teste rodar. */
const matchMedia = (consulta) => ({
  matches: false,
  media: consulta,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});
definir("matchMedia", matchMedia);
w.matchMedia = matchMedia;

/* --- Coleta de avisos ---------------------------------------------------- */

/*
  Um aviso de biblioteca é um defeito silencioso esperando para acontecer — foi
  assim que a remoção do easing em string apareceu. O ruído do `act(...)` fica de
  fora: ele é do harness, não do código.
*/
const avisos = new Set();
const erroOriginal = console.error;
const avisoOriginal = console.warn;
const coletar = (args) => {
  const texto = args.map(String).join(" ");
  if (texto.includes("act(...)")) return;
  avisos.add(texto.slice(0, 200));
};
console.error = (...a) => coletar(a);
console.warn = (...a) => coletar(a);

/* --- Carga dos módulos --------------------------------------------------- */

/* O Vite compila TSX e engole os `import "./x.css"` — sem ele seria preciso um
   passo de bundle à parte só para rodar isto. */
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const {
  Abas,
  FundoDeOrbes,
  CamadaDeFundo,
  FUNDOS,
  usarFundo,
  GerenciadorDeArquivos,
  criarRepositorioEmMemoria,
  montarArvore,
  caminhoAte,
  podeMoverPasta,
  subarvoreDe,
  contarArquivos,
  buscar,
  nomeDisponivel,
  formatarTamanho,
  MenuSuspenso,
  CartaoDeDecisao,
  InterruptorDeDecisao,
  RodapeDaDecisao,
  paradasDe,
} = await vite.ssrLoadModule("/src/lib/index.ts");
const { Galeria } = await vite.ssrLoadModule("/src/demo/Galeria.tsx");
const { act } = React;

const doc = w.document;
const clicar = async (el) => {
  await act(async () => {
    el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  });
};
const teclar = async (el, key) => {
  await act(async () => {
    el.dispatchEvent(new w.KeyboardEvent("keydown", { key, bubbles: true }));
  });
};
const esperar = async (ms) => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
};

/* --- Placar -------------------------------------------------------------- */

let falhas = 0;
const checar = (nome, ok, detalhe = "") => {
  if (!ok) falhas++;
  console.log(`  ${ok ? "✓" : "✗"} ${nome}${detalhe ? `  → ${detalhe}` : ""}`);
};

/* --- Menu Suspenso ------------------------------------------------------- */

console.log("\nMenu Suspenso");

const OPCOES = Array.from({ length: 12 }, (_, i) => ({
  valor: String(i),
  rotulo: `Opção ${i + 1}`,
}));

function Campo() {
  const [valor, setValor] = React.useState(null);
  return React.createElement(MenuSuspenso, {
    valor,
    opcoes: OPCOES,
    placeholder: "Escolha",
    rotulo: "Teste",
    aoSelecionar: setValor,
  });
}

const raiz = createRoot(doc.getElementById("raiz"));
await act(async () => {
  raiz.render(React.createElement(Campo));
});

const gatilho = () => doc.querySelector(".cui-menu__gatilho");
const painel = () => doc.querySelector(".cui-menu__painel");

await clicar(gatilho());
const tetoInicial = painel()?.style.maxHeight;

/*
  ⭐ **O check que prova que a ENTRADA anima.** Logo após o clique — com os
  layout effects já processados pelo `act`, mas antes de qualquer quadro — a
  coreografia já escreveu os valores iniciais no painel. Se a entrada for pulada,
  `opacity` fica vazio e o menu simplesmente aparece.

  Esta regressão aconteceu de verdade: trocar o sinal de "já medi" de estado para
  ref tirou o pisca duplo e, junto, matou a animação inteira — ref não é
  dependência, então o efeito nunca reexecutava quando a medição chegava. Nada
  quebrava; a abertura só ficava seca.
*/
const opacidadeNaAbertura = painel()?.style.opacity;
checar(
  "a entrada COMEÇA animada (não aparece pronta)",
  opacidadeNaAbertura !== "" && opacidadeNaAbertura !== undefined,
  `opacity="${opacidadeNaAbertura}"`,
);

await esperar(1200);
checar("abre com teto de altura", Boolean(tetoInicial), `maxHeight="${tetoInicial}"`);
checar(
  "a entrada devolve os estilos ao CSS ao terminar",
  painel()?.style.opacity === "",
  `opacity="${painel()?.style.opacity}"`,
);
checar(
  "o teto sobrevive ao fim da animação",
  painel()?.style.maxHeight === tetoInicial,
  `maxHeight="${painel()?.style.maxHeight}"`,
);

/*
  O fechamento é cronometrado porque a regressão que ele pega é de RITMO, não de
  presença: encadear a saída do painel ao fim de todos os itens (em vez do início
  do último) deixava a caixa vazia na tela por quase meio segundo, e o menu levava
  ~1070ms para sumir. Nada disso quebra teste de presença.
*/
const inicioDoFechamento = Date.now();
await clicar(gatilho());
let duracaoDoFechamento = 0;
for (let i = 0; i < 60 && painel(); i++) {
  await esperar(30);
  duracaoDoFechamento = Date.now() - inicioDoFechamento;
}
checar("fecha e desmonta", !painel());
checar(
  "fecha em menos de 900ms",
  !painel() && duracaoDoFechamento < 900,
  `${duracaoDoFechamento}ms`,
);

/* Dois cliques em 60ms: fechar com a entrada ainda em voo. */
await clicar(gatilho());
await esperar(60);
await clicar(gatilho());
await esperar(1800);
checar("abrir+fechar rápido não deixa o painel montado", !painel());
checar("aria-expanded volta a false", gatilho()?.getAttribute("aria-expanded") === "false");

await clicar(gatilho());
await esperar(1200);
const itens = [...doc.querySelectorAll(".cui-menu__item")];
checar("reabre depois do ciclo rápido", Boolean(painel()));
checar("teto preservado na reabertura", Boolean(painel()?.style.maxHeight));
checar("itens sem maxHeight residual", itens.every((i) => i.style.maxHeight === ""));
checar("itens sem opacity zerada", itens.every((i) => i.style.opacity !== "0"));

/* --- Cartão de decisão --------------------------------------------------- */

console.log("\nCartão de Decisão");

function Tarefa({ inicial }) {
  const [resultado, setResultado] = React.useState(inicial);
  return React.createElement(
    CartaoDeDecisao,
    { resultado, aoDecidir: setResultado, detalhe: "Decidida agora" },
    React.createElement(InterruptorDeDecisao, null),
    React.createElement(RodapeDaDecisao, null),
  );
}

/*
  Três cartões: um que CHEGA aprovado, um que chega reprovado, e um em aberto
  para ser decidido por gesto. A regra que isto protege é a que separa retorno de
  circo — o que vem pronto do servidor não anima nada.
*/
await act(async () => {
  raiz.render(
    React.createElement(
      "div",
      null,
      React.createElement(Tarefa, { inicial: "aprovada", key: "ok" }),
      React.createElement(Tarefa, { inicial: "reprovada", key: "nao" }),
      React.createElement(Tarefa, { inicial: null, key: "aberta" }),
    ),
  );
});
await esperar(60);

const cartoes = () => [...doc.querySelectorAll(".cui-decisao")];
const parte = (i, sel) => cartoes()[i]?.querySelector(sel);
const botao = (i, tipo) => parte(i, `.cui-interruptor__lado[data-tipo="${tipo}"]`);
const knob = (i) => parte(i, ".cui-interruptor__knob");
const fechado = (i) => parte(i, ".cui-interruptor__gatilho");

/* Abre o interruptor, que nasce fechado como um botão. */
const abrirInterruptor = async (i) => {
  if (fechado(i)) await clicar(fechado(i));
  await esperar(60);
};

checar("os três cartões montaram", cartoes().length === 3);
checar(
  "aprovada e reprovada usam o MESMO desenho, só o tom muda",
  parte(0, ".cui-decisao__contorno") && parte(1, ".cui-decisao__contorno") &&
    cartoes()[0]?.dataset.resultado === "aprovada" &&
    cartoes()[1]?.dataset.resultado === "reprovada",
);
checar("cartão decidido tem contorno pronto", parte(0, "rect")?.style.strokeDashoffset === "0");
checar("cartão decidido tem malha e lavagem", Boolean(parte(1, ".cui-decisao__malha") && parte(1, ".cui-decisao__vidro")));
checar("cartão em aberto não tem camada nenhuma", !parte(2, ".cui-decisao__contorno") && !parte(2, ".cui-decisao__malha"));

/*
  ⭐ **O controle nasce FECHADO — um botão, não um switch.** Um switch com a
  alavanca no meio afirmaria uma escolha em curso que não existe; o botão não
  afirma nada, que é o estado de uma tarefa por decidir.
*/
checar("em aberto, o controle é um botão fechado", Boolean(fechado(2)) && !botao(2, "reprovada"));
checar("o botão fechado anuncia que revela opções", fechado(2)?.getAttribute("aria-expanded") === "false");
checar("cartão já decidido também mostra o botão fechado, com o resultado",
  fechado(0)?.dataset.resultado === "aprovada" && fechado(1)?.dataset.resultado === "reprovada");

await abrirInterruptor(2);
checar("clicar abre as duas opções", Boolean(botao(2, "reprovada") && botao(2, "aprovada")));
checar("e o botão fechado dá lugar a elas", !fechado(2));

/* O intervalo entre o clique e a confirmação: o estado é anunciado na hora, o
   visual espera a volta fechar. */
await clicar(botao(2, "reprovada"));
checar("o estado já é anunciado no clique", botao(2, "reprovada")?.getAttribute("aria-checked") === "true");
checar(
  "…mas a cor AGUARDA a volta fechar",
  botao(2, "reprovada")?.getAttribute("data-aceso") === "false",
);

/* Enquanto a coreografia roda, o controle CONTINUA aberto: é o que deixa ver a
   alavanca chegar ao lado escolhido antes de tudo se recolher. */
checar("durante a coreografia o controle segue aberto", Boolean(botao(2, "reprovada")));

await esperar(900);
checar(
  "⭐ ao confirmar, o controle se RECOLHE mostrando o resultado",
  Boolean(fechado(2)) && fechado(2)?.dataset.resultado === "reprovada",
);
/*
  ⚠️ **Com tolerância, e de propósito.** Uma mola para por limiar de energia, não
  no valor exato: o repouso fica em `-0.018%` em vez de `0%`. São dois centésimos
  de pixel — comparar por igualdade aqui seria um teste que falha por um defeito
  que não existe.
*/
/*
  As paradas são medidas em PIXELS a partir do controle: o centro de cada lobo
  fica a `altura / 2` das bordas. jsdom não faz layout, então `clientWidth` é 0 e
  as três paradas colapsam em 0 — o que este teste ainda pega é a REGRESSÃO que
  importava: a parada da direita não pode mais sair do controle, porque agora ela
  é derivada da largura em vez de um `100%` com margem fixa.
*/
const naParada = (i, esperado) =>
  Math.abs(parseFloat(knob(i)?.style.left ?? "NaN") - esperado) < 0.5;

checar(
  "a alavanca tem posição definida",
  Number.isFinite(parseFloat(knob(2)?.style.left ?? "NaN")),
  `left="${knob(2)?.style.left}"`,
);
checar("reprovar tinge o cartão de vermelho", cartoes()[2]?.dataset.resultado === "reprovada");
checar("a malha apareceu", Number(parte(2, ".cui-decisao__malha")?.style.opacity) === 1);
checar("o rodapé anuncia a decisão por escrito", Boolean(parte(2, ".cui-decisao__rodape")));

/*
  ⭐ **Trocar de lado com o cartão JÁ decidido tem de animar como a primeira
  vez.** Este é o caso que falhava: `confirmado` continuava `true` do estado
  anterior enquanto a nova coreografia rodava, o interruptor lia "já confirmou" no
  instante do clique e se recolhia na hora. A segunda decisão não tinha animação
  nenhuma — e nada quebrava.
*/
await abrirInterruptor(2);
await clicar(botao(2, "aprovada"));
checar(
  "⭐ trocar de lado NÃO recolhe o controle na hora",
  Boolean(botao(2, "aprovada")) && !fechado(2),
);
checar(
  "…e a cor do novo lado ainda aguarda a volta fechar",
  botao(2, "aprovada")?.getAttribute("data-aceso") === "false",
);

await esperar(900);
checar("trocar de lado troca o tom", cartoes()[2]?.dataset.resultado === "aprovada");
checar(
  "…e só então o controle se recolhe no novo resultado",
  fechado(2)?.dataset.resultado === "aprovada",
);
checar("o botão fechado agora carrega o outro resultado", fechado(2)?.dataset.resultado === "aprovada");

await abrirInterruptor(2);
await clicar(botao(2, "aprovada"));
/* A mola da alavanca leva mais que os 200ms de um fade — esperar de menos aqui
   mede a animação no meio do caminho, e o teste falha por impaciência. */
await esperar(900);
checar("clicar de novo no lado ativo desfaz", cartoes()[2]?.dataset.resultado === "aberta");
checar(
  "desfazer devolve o controle ao botão neutro",
  parte(2, ".cui-interruptor")?.dataset.resultado === "aberta" &&
    Boolean(fechado(2)) &&
    fechado(2)?.dataset.resultado === "aberta",
);
await abrirInterruptor(2);
checar(
  "reaberto, é um radiogroup sem nenhum rádio marcado",
  Boolean(parte(2, '[role="radiogroup"]')) &&
    [...(parte(2, '[role="radiogroup"]')?.querySelectorAll('[role="radio"]') ?? [])]
      .every((r) => r.getAttribute("aria-checked") === "false"),
);
checar("desfazer remove contorno, malha e lavagem",
  !parte(2, ".cui-decisao__contorno") && !parte(2, ".cui-decisao__malha") && !parte(2, ".cui-decisao__vidro"));

/*
  ⭐ **A geometria do interruptor, testada como CONTA.** jsdom não faz layout —
  `clientWidth` é sempre 0 — então nenhum teste de DOM veria a alavanca no lugar
  errado. E era exatamente aí que estava o defeito: `left: 0% / 50% / 100%` com
  margem lateral fixa acertava só a parada da esquerda, errava a do meio por 22px
  e punha a da direita 44px FORA do controle.
*/
{
  const controle = { clientWidth: 108, clientHeight: 44 };
  const p = paradasDe(controle);
  const raio = controle.clientHeight / 2;
  checar("a alavanca centra no lobo esquerdo", p.reprovada === raio, `${p.reprovada}px`);
  checar("a alavanca centra na cintura", p.aberta === controle.clientWidth / 2, `${p.aberta}px`);
  checar(
    "a alavanca centra no lobo direito — e NÃO sai do controle",
    p.aprovada === controle.clientWidth - raio && p.aprovada + raio <= controle.clientWidth,
    `${p.aprovada}px (o controle acaba em ${controle.clientWidth}px)`,
  );

  /* Escalar o controle não pode quebrar a conta: as paradas derivam das medidas,
     não de porcentagens fixas. */
  const grande = paradasDe({ clientWidth: 216, clientHeight: 88 });
  checar(
    "as paradas acompanham um controle de outro tamanho",
    grande.reprovada === 44 && grande.aberta === 108 && grande.aprovada === 172,
    `${grande.reprovada} / ${grande.aberta} / ${grande.aprovada}`,
  );

  /*
    ⭐ **Um guarda de CSS, e ele existe por um defeito específico.** O ícone de
    cada lado se ancora na borda EXTERNA à distância do raio, porque é ali que o
    lobo está — o centro do botão (metade do controle) fica 5px para dentro
    disso, e os dois ícones apareciam puxados um em direção ao outro.

    A "simplificação" tentadora é trocar as duas regras por um
    `justify-content: center` no botão. Ela reintroduz exatamente o desvio, e
    nada em DOM ou tipo acusaria — jsdom não faz layout, e o CSS não tem tipos.
  */
  const css = readFileSync("src/lib/cartao-de-decisao/cartao-de-decisao.css", "utf8");
  checar(
    "o ícone continua ancorado no lobo, e não no centro do botão",
    css.includes('[data-tipo="reprovada"] svg {') &&
      css.includes("left: calc(var(--cui-interruptor-altura) / 2)") &&
      css.includes("right: calc(var(--cui-interruptor-altura) / 2)"),
  );
}

/* --- Abas ---------------------------------------------------------------- */

console.log("\nAbas");

const SECOES = [
  { valor: "resumo", rotulo: "Resumo" },
  { valor: "andamentos", rotulo: "Andamentos", selo: "12" },
  { valor: "partes", rotulo: "Partes e advogados" },
  { valor: "financeiro", rotulo: "Financeiro", desabilitada: true },
];

function Secoes() {
  const [secao, setSecao] = React.useState("resumo");
  return React.createElement(
    Abas,
    { abas: SECOES, valor: secao, aoTrocar: setSecao, rotulo: "Seções" },
    React.createElement("p", { className: "demo-abas__texto" }, `conteúdo de ${secao}`),
  );
}

await act(async () => {
  raiz.render(React.createElement(Secoes));
});
await esperar(60);

const trilho = () => doc.querySelector(".cui-abas__trilho");
const tabs = () => [...doc.querySelectorAll('[role="tab"]')];
const tabPor = (rotulo) => tabs().find((t) => t.textContent?.includes(rotulo));
const ativa = () => tabs().find((t) => t.getAttribute("aria-selected") === "true");
const painelDaAba = () => doc.querySelector('[role="tabpanel"]');

checar("desenha um tablist com uma aba por entrada", tabs().length === SECOES.length);
checar("abre com a aba do valor selecionada", ativa()?.textContent?.includes("Resumo"));

/*
  Foco itinerante: só a aba aberta está na ordem de tabulação. Sem isso, o Tab
  percorre todas as abas antes de chegar ao conteúdo — o defeito clássico de
  tablist feito com botões soltos, e que nada em tipo ou layout acusa.
*/
checar(
  "só a aba aberta está na ordem de tabulação",
  tabs().filter((t) => t.tabIndex === 0).length === 1 &&
    ativa()?.tabIndex === 0,
  tabs().map((t) => t.tabIndex).join(","),
);

checar(
  "o painel é rotulado pela aba aberta e ela o aponta de volta",
  painelDaAba()?.getAttribute("aria-labelledby") === ativa()?.id &&
    ativa()?.getAttribute("aria-controls") === painelDaAba()?.id,
);
checar(
  "as abas fechadas NÃO apontam um painel que não existe",
  tabs()
    .filter((t) => t !== ativa())
    .every((t) => !t.hasAttribute("aria-controls")),
);

/*
  ⭐ **A cópia invertida tem de ser a barra INTEIRA, item por item.** Ela é o que
  se vê dentro da pílula; se sair de sincronia com a lista real — um selo que só
  existe de um lado, uma aba a menos — o texto de dentro da janela deixa de
  cair sobre o de fora, e o desalinhamento só aparece no meio de uma viagem. Nem
  o tipo nem o jsdom (que não faz layout) veriam isso.
*/
const camada = () => doc.querySelector(".cui-abas__invertida");
const rotulosReais = () => tabs().map((t) => t.textContent);
const rotulosDaCopia = () =>
  [...(camada()?.querySelectorAll(".cui-abas__aba") ?? [])].map((e) => e.textContent);

checar(
  "a camada invertida existe e pede o tema oposto",
  camada()?.hasAttribute("data-tema-invertido") === true,
);
checar(
  "…e some para o leitor de tela, em vez de ler a barra duas vezes",
  camada()?.getAttribute("aria-hidden") === "true",
);
checar(
  "a cópia repete a barra rótulo por rótulo",
  rotulosDaCopia().length === rotulosReais().length &&
    rotulosDaCopia().every((r, i) => r === rotulosReais()[i]),
  `real=[${rotulosReais().join("|")}] cópia=[${rotulosDaCopia().join("|")}]`,
);

/*
  A posição da pílula é escrita pelo JavaScript em custom properties. jsdom não
  faz layout, então os valores são zero — mas eles têm de EXISTIR: vazios
  significam que a medição não rodou, e no navegador a janela do recorte ficaria
  fechada em cima da primeira aba para sempre.
*/
checar(
  "a medição é escrita no trilho como custom property",
  trilho()?.style.getPropertyValue("--cui-aba-x") !== "" &&
    trilho()?.style.getPropertyValue("--cui-aba-largura") !== "",
  `x="${trilho()?.style.getPropertyValue("--cui-aba-x")}" largura="${trilho()?.style.getPropertyValue("--cui-aba-largura")}"`,
);

/* --- Troca por clique e direção da entrada -------------------------------- */

await clicar(tabPor("Partes"));
await esperar(60);
checar("clicar troca a aba aberta", ativa()?.textContent?.includes("Partes"));
checar("…e o painel troca junto", painelDaAba()?.textContent === "conteúdo de partes");

/*
  ⭐ **A direção da entrada é medida, não decorativa.** Ir para uma aba à direita
  traz o conteúdo pela direita; voltar, pela esquerda. Um lado fixo faria metade
  das trocas empurrar o conteúdo contra o gesto — e nada quebraria.
*/
checar("ir para a direita traz o painel da direita", painelDaAba()?.dataset.direcao === "frente");

await clicar(tabPor("Resumo"));
await esperar(60);
checar("voltar traz o painel da esquerda", painelDaAba()?.dataset.direcao === "tras");

/* --- Teclado -------------------------------------------------------------- */

await teclar(ativa(), "ArrowRight");
await esperar(60);
checar("→ abre a próxima aba", ativa()?.textContent?.includes("Andamentos"));
checar("…e leva o foco junto", doc.activeElement === ativa());

await teclar(ativa(), "ArrowLeft");
await esperar(60);
checar("← volta", ativa()?.textContent?.includes("Resumo"));

/*
  ⛔ **End vai à última aba HABILITADA, não à última do array.** Uma aba
  desabilitada não é uma parada: pousar nela deixaria o teclado num beco — ela
  não pode ser aberta, e a próxima seta partiria de um lugar que a pessoa não
  escolheu.
*/
await teclar(ativa(), "End");
await esperar(60);
checar("End para na última aba habilitada, pulando a desabilitada", ativa()?.textContent?.includes("Partes"));

await teclar(ativa(), "ArrowRight");
await esperar(60);
checar("→ na última dá a volta pulando a desabilitada", ativa()?.textContent?.includes("Resumo"));

await teclar(ativa(), "Home");
await esperar(60);
checar("Home volta à primeira", ativa()?.textContent?.includes("Resumo"));

checar(
  "a aba desabilitada nunca é aberta pelo teclado",
  tabPor("Financeiro")?.getAttribute("aria-selected") === "false" &&
    tabPor("Financeiro")?.disabled === true,
);

/* --- Guardas de CSS e de tokens ------------------------------------------- */

{
  const css = readFileSync("src/lib/abas/abas.css", "utf8");

  /*
    O recorte é o componente inteiro: sem as duas custom properties dentro do
    clip-path, a pílula não existe. Trocar isso por um bloco posicionado quebra
    a inversão do texto no meio da viagem — e passa em tipo, em build e em DOM.
  */
  checar(
    "a pestana continua sendo um recorte da cópia, e não um bloco",
    css.includes("clip-path: inset(") &&
      css.includes("var(--cui-aba-x, 0px)") &&
      css.includes("var(--cui-aba-largura, 0px)"),
  );
  checar(
    "a camada invertida não intercepta clique",
    /\.cui-abas__invertida \{[^}]*pointer-events: none/s.test(css),
  );

  /*
    ⛔ O peso da fonte não pode mudar com a seleção: peso muda a largura do
    rótulo, e a cópia invertida deixaria de cair sobre o texto real no meio da
    viagem — além de empurrar as abas vizinhas no instante do clique.
  */
  checar(
    "a seleção não mexe no peso da fonte (a cópia deixaria de coincidir)",
    !/aria-selected="true"[^}]*font-weight/s.test(css),
  );

  /*
    ⛔ **Os PÉS são a diferença entre pestana e retângulo.** São curvas CÔNCAVAS
    — o negativo de um raio de canto —, e por isso saem de um radial-gradient e
    não de border-radius. Trocar por um raio comum deixa a aba pousada sobre a
    linha em vez de nascer dela, e nada em tipo, DOM ou build acusa: continua
    sendo uma aba, só que outra.
  */
  checar(
    "os pés da pestana são curvas côncavas, e não raios de canto",
    /\.cui-abas__pe--esquerdo \{[^}]*radial-gradient/s.test(css) &&
      /\.cui-abas__pe--direito \{[^}]*radial-gradient/s.test(css),
  );
  checar(
    "…e as duas curvas leem as mesmas medidas do corpo",
    css.includes("left: calc(var(--cui-aba-x, 0px) - var(--cui-aba-pe-atual, var(--cui-aba-pe)))") &&
      css.includes("left: calc(var(--cui-aba-x, 0px) + var(--cui-aba-largura, 0px))"),
  );

  /*
    O tema invertido é o que pinta a pílula, e ele é GERADO. Os dois guardas
    abaixo protegem as duas metades da regra: os seletores existirem, e os
    derivados por transparência serem REDECLARADOS dentro deles — um var() de
    custom property é resolvido onde ela é declarada, então alfas herdados da
    raiz chegariam ao bloco invertido com a cor do tema de origem.
  */
  const tokens = readFileSync("src/estilos/tokens.css", "utf8");
  checar(
    "o tokens.css gerado traz os dois blocos de tema invertido",
    tokens.includes(':root:not([data-tema="escuro"]) [data-tema-invertido]') &&
      tokens.includes('[data-tema="escuro"] [data-tema-invertido]'),
  );
  const blocoInvertido = tokens.slice(
    tokens.indexOf('[data-tema="escuro"] [data-tema-invertido]'),
  );
  checar(
    "…e redeclara os derivados do acento dentro deles",
    blocoInvertido.slice(0, blocoInvertido.indexOf("\n}")).includes("--cui-acento-9:"),
  );
}

/*
  ⭐ **A prova de que a pestana ANIMA.** Este é o teste que faltava quando a
  animação parou de rodar sem ninguém perceber: a aba trocava, o painel trocava,
  o `aria-selected` mudava — e a forma saltava para o destino, seca. Tudo isso
  passa num teste de presença.

  ⚠️ jsdom não faz layout, então `offsetLeft` é sempre zero e a POSIÇÃO não tem
  caminho para percorrer. Quem prova o movimento aqui é o assentamento dos pés:
  ele vai de 35% a 100% por tempo, não por medida, e portanto anima igual sem
  layout nenhum. Se a mola deixar de rodar, esta amostra vira um valor só.
*/
{
  const trilhoDaAba = () => doc.querySelector(".cui-abas__trilho");
  const pe = () => trilhoDaAba()?.style.getPropertyValue("--cui-aba-pe-atual");

  const outraAba = tabs().find((t) => t.getAttribute("aria-selected") === "false");
  await clicar(outraAba);

  const amostras = [];
  for (let i = 0; i < 10; i++) {
    await esperar(35);
    amostras.push(pe());
  }
  const distintos = new Set(amostras.filter(Boolean));

  checar(
    "⭐ a pestana ANIMA ao trocar de aba (não salta para o destino)",
    distintos.size >= 3,
    `${distintos.size} valores no caminho: ${[...distintos].slice(0, 4).join(" → ")}`,
  );

  await esperar(500);
  const parado = parseFloat(pe() ?? "0");
  checar(
    "…e os pés terminam ESPALHADOS, no valor cheio do token",
    Math.abs(parado - 16) < 0.6,
    `${pe()} (o token vale 16px)`,
  );
}

/* --- Gerenciador de Arquivos --------------------------------------------- */

console.log("\nGerenciador de Arquivos");

/*
  ⭐ **As regras primeiro, como CONTA.** Elas são puras de propósito: mover uma
  pasta para dentro de si mesma desliga o ramo inteiro da raiz — ele continua no
  banco e some da tela —, e não existe clique que produza isso de propósito para
  conferir na mão. Testar a função é o único jeito honesto.
*/
const ACERVO_BASE = {
  pastas: [
    { id: "raiz-a", nome: "Contratos", paiId: null },
    { id: "filha", nome: "Modelos", paiId: "raiz-a" },
    { id: "neta", nome: "Antigos", paiId: "filha" },
    { id: "raiz-b", nome: "Órgãos públicos", paiId: null },
  ],
  arquivos: [
    { id: "f1", nome: "Contrato.docx", pastaId: "raiz-a", adicionadoPor: { nome: "Ana", email: "a@x.com" }, adicionadoEm: "2026-08-01T10:00:00Z", tamanho: 2048, etiquetas: ["jurídico"] },
    { id: "f2", nome: "Modelo.docx", pastaId: "filha", adicionadoPor: { nome: "Bia", email: "b@x.com" }, adicionadoEm: "2026-08-02T10:00:00Z" },
    { id: "f3", nome: "Antigo.pdf", pastaId: "neta", adicionadoPor: { nome: "Ana", email: "a@x.com" }, adicionadoEm: "2026-08-03T10:00:00Z" },
    { id: "f4", nome: "Solto.pdf", pastaId: null, adicionadoPor: { nome: "Ana", email: "a@x.com" }, adicionadoEm: "2026-08-04T10:00:00Z" },
  ],
};

{
  const p = ACERVO_BASE.pastas;

  const arvore = montarArvore(p);
  checar(
    "a árvore sai da lista plana, com os níveis certos",
    arvore.length === 2 &&
      arvore[0].filhos[0]?.pasta.id === "filha" &&
      arvore[0].filhos[0]?.filhos[0]?.pasta.id === "neta" &&
      arvore[0].filhos[0]?.filhos[0]?.nivel === 2,
  );

  checar(
    "o caminho até a neta atravessa os três degraus",
    caminhoAte(p, "neta").map((x) => x.nome).join(" / ") === "Contratos / Modelos / Antigos",
  );
  checar("o caminho da raiz é vazio", caminhoAte(p, null).length === 0);

  /* ⛔ As quatro recusas que impedem a árvore de se comer. */
  checar("⛔ mover uma pasta para dentro DELA MESMA é recusado", !podeMoverPasta(p, "raiz-a", "raiz-a"));
  checar("⛔ mover uma pasta para dentro da FILHA é recusado", !podeMoverPasta(p, "raiz-a", "filha"));
  checar("⛔ …e para dentro da NETA também", !podeMoverPasta(p, "raiz-a", "neta"));
  checar("mover para onde já está não é operação", !podeMoverPasta(p, "filha", "raiz-a"));
  checar("mover para outro ramo é permitido", podeMoverPasta(p, "filha", "raiz-b"));
  checar("mover para a raiz é permitido", podeMoverPasta(p, "neta", null));

  checar("a subárvore inclui a própria pasta e os netos",
    [...subarvoreDe(p, "raiz-a")].sort().join(",") === "filha,neta,raiz-a");

  /*
    ⚠️ A contagem é DIRETA. Se um dia alguém "melhorar" isto para somar os
    descendentes, a pasta passa a prometer arquivos que a lista não mostra.
  */
  checar("a contagem é direta, não recursiva", contarArquivos(ACERVO_BASE.arquivos, "raiz-a") === 1);
  checar("a raiz conta só o que está solto nela", contarArquivos(ACERVO_BASE.arquivos, null) === 1);

  const achado = buscar(ACERVO_BASE, "orgaos");
  checar("a busca ignora acento", achado.pastas.some((x) => x.id === "raiz-b"), `${achado.pastas.length} pasta(s)`);
  const porArquivo = buscar(ACERVO_BASE, "antigo");
  checar(
    "achar um arquivo traz junto a pasta onde ele está",
    porArquivo.arquivos.length === 1 && porArquivo.pastas.some((x) => x.id === "neta"),
  );
  const porEtiqueta = buscar(ACERVO_BASE, "jurídico");
  checar("a busca também varre as etiquetas", porEtiqueta.arquivos.some((a) => a.id === "f1"));

  checar(
    "o nome novo não colide com os irmãos",
    nomeDisponivel([...p, { id: "x", nome: "Nova pasta", paiId: null }], null, "Nova pasta") ===
      "Nova pasta 2",
  );
  checar("tamanho sem valor vira travessão, não '0 B'", formatarTamanho(undefined) === "—");
  checar("tamanho em KB", formatarTamanho(2048) === "2.0 KB", formatarTamanho(2048));
}

/* --- O repositório em memória -------------------------------------------- */

{
  const repositorio = criarRepositorioEmMemoria(ACERVO_BASE);
  const antes = await repositorio.listar();

  await repositorio.excluirPasta("raiz-a");
  const depois = await repositorio.listar();

  checar(
    "excluir uma pasta leva junto as subpastas",
    depois.pastas.length === 1 && depois.pastas[0].id === "raiz-b",
    depois.pastas.map((x) => x.id).join(","),
  );
  checar(
    "…e os arquivos que estavam dentro delas",
    depois.arquivos.map((a) => a.id).sort().join(",") === "f4",
    depois.arquivos.map((a) => a.id).join(","),
  );

  /*
    ⛔ O acervo que chega por parâmetro costuma ser uma constante de módulo.
    Mutá-lo faria a SEGUNDA montagem da página começar do estado da primeira —
    um defeito que só aparece quando alguém navega para outra tela e volta.
  */
  checar(
    "o repositório não muta o acervo que recebeu",
    ACERVO_BASE.pastas.length === 4 && antes.pastas.length === 4,
    `${ACERVO_BASE.pastas.length} pastas na constante`,
  );
}

/* --- A página montada ----------------------------------------------------- */

const repoDaPagina = criarRepositorioEmMemoria(ACERVO_BASE);

await act(async () => {
  raiz.render(
    React.createElement(GerenciadorDeArquivos, {
      repositorio: repoDaPagina,
      titulo: "Acervo",
    }),
  );
});
await esperar(120);

const noArvore = () => [...doc.querySelectorAll('[role="treeitem"]')];
const cartaoArq = () => [...doc.querySelectorAll(".cui-arq__cartao")];
const linhaArq = () => [...doc.querySelectorAll(".cui-arq__linha")];

checar("a página monta a árvore, a grade e a lista",
  noArvore().length > 0 && cartaoArq().length === 2 && linhaArq().length === 1,
  `${noArvore().length} nós, ${cartaoArq().length} cartões, ${linhaArq().length} linha`);

checar(
  "a árvore se anuncia como árvore, com nível e seleção",
  Boolean(doc.querySelector('[role="tree"]')) &&
    noArvore()[0]?.getAttribute("aria-level") === "1" &&
    noArvore()[0]?.hasAttribute("aria-selected"),
);
checar(
  "a lista é uma tabela de verdade, com cabeçalhos de coluna",
  doc.querySelectorAll('.cui-arq__tabela th[scope="col"]').length === 5,
);

/*
  ⭐ **A alternativa ACESSÍVEL ao arrasto.** Arrastar não existe para quem navega
  por teclado; se "Mover para" quebrar, mover um arquivo vira função exclusiva de
  quem usa mouse — e nada na tela denuncia isso.
*/
{
  const acoesDaLinha = doc.querySelector(".cui-arq__linha-acoes");
  await clicar(acoesDaLinha);
  await esperar(120);

  const itens = () => [...doc.querySelectorAll('[role="menuitem"]')];
  const mover = itens().find((i) => i.textContent?.includes("Mover para"));
  checar("a linha oferece 'Mover para' no menu", Boolean(mover), itens().map((i) => i.textContent).join(" | "));

  await clicar(mover);
  await esperar(120);
  const destinos = itens();
  checar(
    "o submenu é um NÍVEL do mesmo painel, com volta",
    destinos.some((i) => i.textContent?.includes("Contratos / Modelos")) &&
      Boolean(doc.querySelector(".cui-arq__menu-voltar")),
    destinos.map((i) => i.textContent).join(" | "),
  );

  const paraModelos = destinos.find((i) => i.textContent === "Contratos / Modelos");
  await clicar(paraModelos);
  await esperar(400);

  const acervo = await repoDaPagina.listar();
  checar(
    "escolher o destino move o arquivo de verdade",
    acervo.arquivos.find((a) => a.id === "f4")?.pastaId === "filha",
    `f4 está em ${acervo.arquivos.find((a) => a.id === "f4")?.pastaId}`,
  );
  checar("…e o menu fecha depois de agir", itens().length === 0);
}

/*
  ⭐ **O caminho de ERRO da camada otimista.** A tela muda antes da resposta; se
  o servidor recusar, ela precisa voltar ao que era E dizer o que houve. Sem
  este teste, a falha aparece como um estado que ficou na tela e não existe no
  banco — a pior divergência possível num gerenciador de arquivos.
*/
{
  const repoQueFalha = criarRepositorioEmMemoria(ACERVO_BASE, {
    simularFalha: (operacao) => operacao === "excluirPasta",
  });

  await act(async () => {
    raiz.render(
      React.createElement(GerenciadorDeArquivos, { repositorio: repoQueFalha, titulo: "Acervo" }),
    );
  });
  await esperar(120);

  const antesDoErro = doc.querySelectorAll(".cui-arq__cartao").length;
  const acoes = doc.querySelector(".cui-arq__cartao-acoes");
  await clicar(acoes);
  await esperar(120);
  const excluir = [...doc.querySelectorAll('[role="menuitem"]')].find((i) =>
    i.textContent?.includes("Excluir"),
  );
  await clicar(excluir);
  await esperar(80);
  const confirmar = [...doc.querySelectorAll('[role="menuitem"]')].find((i) =>
    i.textContent?.includes("Excluir a pasta"),
  );
  await clicar(confirmar);
  await esperar(400);

  checar(
    "a falha do servidor DESFAZ a exclusão otimista",
    doc.querySelectorAll(".cui-arq__cartao").length === antesDoErro,
    `${antesDoErro} → ${doc.querySelectorAll(".cui-arq__cartao").length}`,
  );
  checar(
    "…e o erro é anunciado, não engolido",
    Boolean(doc.querySelector('[role="alert"]')),
    doc.querySelector('[role="alert"]')?.textContent ?? "sem alerta",
  );
}

/* --- Guardas de CSS ------------------------------------------------------- */

{
  const css = readFileSync("src/lib/gerenciador-de-arquivos/gerenciador.css", "utf8");

  /*
    ⛔ O padrão promete ser copiável: a pasta com os .tsx e o .css, e nada mais.
    Herdar o box-sizing do reset do projeto quebra essa promessa em silêncio — a
    frente da pasta soma o padding à altura, sobe 14px e cobre os papéis. O
    desenho continua aparecendo, só que errado.
  */
  checar(
    "o CSS declara o próprio box-sizing (não depende do reset do projeto)",
    /\.cui-arq \*,[^{]*\{[^}]*box-sizing: border-box/s.test(css),
  );
  /* Um display vindo de classe vence o hidden que o navegador aplica. */
  checar(
    "a trilha respeita o atributo hidden",
    css.includes(".cui-arq__trilha[hidden]"),
  );
  /* ⛔ Sem isto o fantasma vira o alvo de elementFromPoint e nada acende. */
  checar(
    "o fantasma do arrasto não intercepta o ponteiro",
    /\.cui-arq__fantasma \{[^}]*pointer-events: none/s.test(css),
  );
  /* Sem touch-action none, o arrasto no celular vira rolagem. */
  checar(
    "os itens arrastáveis desligam o gesto de rolagem do toque",
    /\.cui-arq__linha \{[^}]*touch-action: none/s.test(css) &&
      /\.cui-arq__cartao-alvo \{[^}]*touch-action: none/s.test(css),
  );
}

/* --- Fundos --------------------------------------------------------------- */

console.log("\nFundos");

{
  /* Cada teste começa do zero: o fundo mora em localStorage, e um teste que
     herda a escolha do anterior passa por acidente. */
  localStorage.removeItem("componentes-ui:fundo");
  delete doc.documentElement.dataset.fundo;

  function Palco() {
    const { fundo, alternar } = usarFundo();
    return React.createElement(
      "div",
      null,
      React.createElement(CamadaDeFundo, null),
      React.createElement(
        "button",
        { id: "liga", onClick: () => alternar("orbes") },
        fundo ?? "nenhum",
      ),
    );
  }

  await act(async () => {
    raiz.render(React.createElement(Palco));
  });
  await esperar(60);

  const camada = () => doc.querySelector(".cui-fundo");
  const liga = () => doc.getElementById("liga");

  checar("sem fundo escolhido, a camada não existe", !camada());
  checar(
    "…e a raiz não carrega atributo nenhum",
    doc.documentElement.dataset.fundo === undefined,
  );

  await clicar(liga());
  await esperar(60);

  checar("marcar liga a camada", Boolean(camada()));
  checar(
    "…e escreve o fundo na RAIZ, que é o que faz o CSS da casca reagir",
    doc.documentElement.dataset.fundo === "orbes",
  );
  checar("…e o estado chega a quem consome o hook", liga()?.textContent === "orbes");

  /*
    ⭐ **O mesmo clique desmarca.** É a metade que costuma faltar: ligar um fundo
    decorativo é fácil de descobrir, desligar tem de ser igualmente óbvio — e no
    mesmo lugar.
  */
  await clicar(liga());
  await esperar(60);
  checar("clicar de novo DESMARCA", !camada() && liga()?.textContent === "nenhum");
  checar(
    "…e limpa a raiz",
    doc.documentElement.dataset.fundo === undefined,
  );

  /*
    ⛔ **Duas instâncias do fundo na mesma página não podem repetir id.**
    `url(#g-orbe1)` é global ao documento: com a miniatura da galeria e o fundo
    do site ligados ao mesmo tempo, o segundo SVG passaria a usar os gradientes
    do primeiro — e nada acusaria, além de uma cor estranha que ninguém liga ao
    id. Este é o teste que garante o `useId`.
  */
  await act(async () => {
    raiz.render(
      React.createElement(
        "div",
        null,
        React.createElement(FundoDeOrbes, null),
        React.createElement(FundoDeOrbes, null),
      ),
    );
  });
  await esperar(60);

  const ids = [...doc.querySelectorAll("[id]")].map((n) => n.id);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  checar(
    "dois fundos na mesma página não repetem nenhum id",
    repetidos.length === 0,
    repetidos.length ? `repetidos: ${[...new Set(repetidos)].slice(0, 3).join(", ")}` : `${ids.length} ids únicos`,
  );

  /* Cada referência interna tem de apontar para um id que EXISTE — um
     `url(#…)` órfão não desenha nada e também não dá erro. */
  const svg = doc.querySelector("svg");
  const referencias = [...(svg?.innerHTML.matchAll(/url\(#([^)]+)\)/g) ?? [])].map(
    (m) => m[1],
  );
  const existentes = new Set([...svg.querySelectorAll("[id]")].map((n) => n.id));
  checar(
    "toda referência do SVG aponta para um id existente",
    referencias.length > 0 && referencias.every((r) => existentes.has(r)),
    `${referencias.length} referências`,
  );

  checar(
    "o fundo é decorativo para o leitor de tela",
    doc.querySelector("svg")?.getAttribute("aria-hidden") === "true",
  );
  checar("o catálogo tem ao menos um fundo", FUNDOS.length >= 1, FUNDOS.map((f) => f.id).join(", "));
}

{
  const css = readFileSync("src/lib/fundos/fundos.css", "utf8");

  /* ⛔ A camada cobre a tela inteira: sem isto ela engole todo clique do site. */
  checar(
    "a camada de fundo não intercepta o ponteiro",
    /\.cui-fundo \{[^}]*pointer-events: none/s.test(css),
  );
  /* ⛔ O fundo é ambiente, não conteúdo: com `absolute` ele rolaria com a página
     e a composição sairia de quadro no primeiro scroll. */
  checar(
    "a camada é fixa, e não rola com a página",
    /\.cui-fundo \{[^}]*position: fixed/s.test(css),
  );
  /* Onde não há desfoque, o vidro vira véu leitoso sobre a composição. */
  checar(
    "há reserva para quem não tem backdrop-filter",
    css.includes("@supports not (backdrop-filter"),
  );

  const componente = readFileSync("src/lib/fundos/FundoDeOrbes.tsx", "utf8");
  /* ⛔ `slice` é o `cover` do SVG: sem ele a composição estica junto com a janela
     e as esferas viram elipses. */
  checar(
    "a composição é enquadrada, não esticada",
    componente.includes('preserveAspectRatio="xMinYMin slice"'),
  );
  /* ⚠️ O fundo não pinta a própria base: ela vem do tema, senão o tema escuro
     receberia um retângulo branco. */
  checar(
    "o SVG não pinta a base — quem faz isso é o tema",
    !/<rect[^>]*fill="#ffffff"/.test(componente),
  );
}

/* --- Galeria ------------------------------------------------------------- */

console.log("\nGaleria");

await act(async () => {
  raiz.render(React.createElement(Galeria));
});
await esperar(60);

const navItens = () => [...doc.querySelectorAll(".cui-nav__item")];
checar("a coluna lista os componentes do registro", navItens().length >= 3, navItens().map((i) => i.textContent).join(" | "));
checar("abre com o primeiro item ativo", Boolean(doc.querySelector('[aria-current="page"]')));

for (const alvo of ["Menu Suspenso", "Cartão de Decisão", "Cores e tokens"]) {
  const botao = navItens().find((i) => i.textContent?.includes(alvo));
  if (!botao) {
    checar(`item "${alvo}" existe`, false);
    continue;
  }
  await clicar(botao);
  await esperar(60);
  checar(
    `clicar em "${alvo}" troca a página`,
    doc.querySelector(".galeria__titulo")?.textContent === alvo,
    `título="${doc.querySelector(".galeria__titulo")?.textContent}" hash="${w.location.hash}"`,
  );
}

checar("a página de tokens desenha as amostras", doc.querySelectorAll(".fund-cor").length > 20, `${doc.querySelectorAll(".fund-cor").length} amostras`);

/* --- Resultado ----------------------------------------------------------- */

console.error = erroOriginal;
console.warn = avisoOriginal;

if (avisos.size > 0) {
  console.log("\nAvisos de biblioteca (cada um é um defeito silencioso em potencial):");
  for (const aviso of avisos) console.log(`  ! ${aviso}`);
}

await vite.close();

console.log(
  falhas === 0 && avisos.size === 0
    ? "\nTudo certo.\n"
    : `\n${falhas} verificação(ões) falharam, ${avisos.size} aviso(s).\n`,
);
process.exit(falhas === 0 && avisos.size === 0 ? 0 : 1);
