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
 * Três defeitos reais foram encontrados por este arquivo:
 *   1. `devolverAoCss` apagava o `maxHeight` que o React controla, e o painel
 *      crescia até caber a lista inteira ao terminar de abrir;
 *   2. fechar no meio da abertura não cancelava a entrada, que terminava
 *      sozinha durante a saída e "reabria" o menu já fechado;
 *   3. o anime.js 4.5 removeu `ease: "cubicBezier(…)"` em string — a animação
 *      seguia rodando com o easing errado, avisando só no console.
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
const { MenuSuspenso } = await vite.ssrLoadModule("/src/lib/index.ts");
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
await esperar(1200);
checar("abre com teto de altura", Boolean(tetoInicial), `maxHeight="${tetoInicial}"`);
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

/* --- Galeria ------------------------------------------------------------- */

console.log("\nGaleria");

await act(async () => {
  raiz.render(React.createElement(Galeria));
});
await esperar(60);

const navItens = () => [...doc.querySelectorAll(".cui-nav__item")];
checar("a coluna lista os componentes do registro", navItens().length >= 2, navItens().map((i) => i.textContent).join(" | "));
checar("abre com o primeiro item ativo", Boolean(doc.querySelector('[aria-current="page"]')));

for (const alvo of ["Menu Suspenso", "Cores e tokens"]) {
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
