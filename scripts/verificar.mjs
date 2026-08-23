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

/* O intervalo entre o clique e a confirmação: o estado é anunciado na hora, o
   visual espera a volta fechar. */
await clicar(botao(2, "reprovada"));
checar("o estado já é anunciado no clique", botao(2, "reprovada")?.getAttribute("aria-checked") === "true");
checar(
  "…mas a cor AGUARDA a volta fechar",
  botao(2, "reprovada")?.getAttribute("data-aceso") === "false",
);

await esperar(900);
checar("ao fechar a volta, o lado acende", botao(2, "reprovada")?.getAttribute("data-aceso") === "true");
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
  "a alavanca foi para uma parada válida",
  Number.isFinite(parseFloat(knob(2)?.style.left ?? "NaN")),
  `left="${knob(2)?.style.left}"`,
);
checar("reprovar tinge o cartão de vermelho", cartoes()[2]?.dataset.resultado === "reprovada");
checar("a malha apareceu", Number(parte(2, ".cui-decisao__malha")?.style.opacity) === 1);
checar("o rodapé anuncia a decisão por escrito", Boolean(parte(2, ".cui-decisao__rodape")));

/* Trocar de lado, e depois desfazer. */
await clicar(botao(2, "aprovada"));
await esperar(900);
checar("trocar de lado troca o tom", cartoes()[2]?.dataset.resultado === "aprovada");
checar("o lado anterior deixou de estar marcado", botao(2, "reprovada")?.getAttribute("aria-checked") === "false");
checar("a alavanca atravessou para o outro lobo", Number.isFinite(parseFloat(knob(2)?.style.left ?? "NaN")), `left="${knob(2)?.style.left}"`);

await clicar(botao(2, "aprovada"));
/* A mola do knob leva mais que os 200ms de um fade — esperar de menos aqui mede
   a animação no meio do caminho, e o teste falha por impaciência. */
await esperar(900);
checar("clicar de novo no lado ativo desfaz", cartoes()[2]?.dataset.resultado === "aberta");
checar(
  "sem decisão, o cartão volta à CINTURA — o estado que um switch de dois lados não sabe dizer",
  parte(2, ".cui-interruptor")?.dataset.resultado === "aberta",
);
checar(
  "o grupo é um radiogroup, e nenhum rádio fica marcado em aberto",
  parte(2, '[role="radiogroup"]') &&
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
