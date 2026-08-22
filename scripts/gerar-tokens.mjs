#!/usr/bin/env node
/**
 * Gera as três camadas do design a partir de `tokens/tokens.json`.
 *
 *   tokens.json  ──┬──▶  src/estilos/tokens.css     (web: React, Next, JS puro, Vue…)
 *                  └──▶  src/lib/tokens/tokens.ts   (React Native, e os tempos que o JS lê)
 *
 * Sem dependência: Node puro. A parte não-óbvia é a conversão OKLCH → sRGB,
 * escrita à mão logo abaixo — o CSS entende `oklch()` nativamente, mas React
 * Native não entende, e uma fonte da verdade que só serve à web não é fonte da
 * verdade nenhuma.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEM = join(RAIZ, "tokens", "tokens.json");
const SAIDA_CSS = join(RAIZ, "src", "estilos", "tokens.css");
const SAIDA_TS = join(RAIZ, "src", "lib", "tokens", "tokens.ts");

const TEMAS = ["claro", "escuro"];

/* ══════════════════════════════════════════════════════════════════════════
   Cor — OKLCH para sRGB
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * OKLCH → OKLab → LMS → sRGB linear → sRGB.
 *
 * As matrizes são as da especificação do OKLab (Björn Ottosson). Elas não são
 * negociáveis nem "aproximadas": errar um dígito desloca a matiz de todo o
 * sistema de cores, e o erro aparece como um violeta que virou azul só no app
 * mobile.
 */
function oklchParaRgb(L, C, H) {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return linear.map(gama);
}

/** Curva de transferência do sRGB. Pular esta etapa clareia tudo visivelmente. */
function gama(c) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

/** Se a cor não cabia em sRGB — o valor mobile será uma aproximação. */
function foraDoGamut(L, C, H) {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.some((c) => c < -0.0001 || c > 1.0001);
}

const RE_OKLCH = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i;
const RE_HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Resolve qualquer cor da fonte para `{ r, g, b, a }`. */
function resolverCor(valor, nome) {
  const hex = valor.match(RE_HEX);
  if (hex) {
    const d = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return {
      r: parseInt(d.slice(0, 2), 16),
      g: parseInt(d.slice(2, 4), 16),
      b: parseInt(d.slice(4, 6), 16),
      a: 1,
    };
  }

  const ok = valor.match(RE_OKLCH);
  if (ok) {
    const L = ok[1].endsWith("%") ? parseFloat(ok[1]) / 100 : parseFloat(ok[1]);
    const C = parseFloat(ok[2]);
    const H = parseFloat(ok[3]);
    const a = ok[4]
      ? ok[4].endsWith("%")
        ? parseFloat(ok[4]) / 100
        : parseFloat(ok[4])
      : 1;

    if (foraDoGamut(L, C, H)) {
      avisos.push(
        `${nome}: oklch(${L} ${C} ${H}) está fora do gamut sRGB — o valor mobile é uma aproximação clampada.`,
      );
    }

    const [r, g, b] = oklchParaRgb(L, C, H);
    return { r, g, b, a };
  }

  throw new Error(
    `Cor não reconhecida em "${nome}": ${valor}\n` +
      `Formatos aceitos: #rgb, #rrggbb, oklch(L C H) e oklch(L C H / A%).`,
  );
}

function paraCadeia({ r, g, b, a }) {
  if (a >= 1) {
    return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
  }
  /* React Native aceita rgba(); e ele é o formato certo para alpha, porque o
     hex de 8 dígitos não é suportado em todas as versões do Android. */
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(4))})`;
}

function comAlfa(cor, alfa) {
  return paraCadeia({ ...cor, a: cor.a * alfa });
}

/* ══════════════════════════════════════════════════════════════════════════
   Geração
   ══════════════════════════════════════════════════════════════════════════ */

const avisos = [];
const fonte = JSON.parse(readFileSync(ORIGEM, "utf8"));
const p = fonte.meta.prefixo;

const AVISO_GERADO = (origem) => `/* ┌──────────────────────────────────────────────────────────────────────┐
   │  ARQUIVO GERADO — não edite à mão.                                   │
   │  Fonte: ${origem.padEnd(60)}│
   │  Regenerar: pnpm tokens                                              │
   └──────────────────────────────────────────────────────────────────────┘ */`;

/* --- CSS ---------------------------------------------------------------- */

function blocoDeTema(tema) {
  const linhas = [];

  for (const [nome, def] of Object.entries(fonte.cores)) {
    if (def.nota) linhas.push(`  /* ${def.nota} */`);
    linhas.push(`  --${p}-${nome}: ${def[tema]};`);
  }

  for (const [nome, def] of Object.entries(fonte.sombras)) {
    if (def.nota) linhas.push(`  /* ${def.nota} */`);
    linhas.push(`  --${p}-${nome}: ${def[tema]};`);
  }

  linhas.push(`  color-scheme: ${tema === "escuro" ? "dark" : "light"};`);
  return linhas.join("\n");
}

function gerarCss() {
  const alfas = Object.entries(fonte.alfas)
    .map(([nome, def]) => {
      const pct = Math.round(def.alfa * 100);
      const nota = def.nota ? `  /* ${def.nota} */\n` : "";
      /* `color-mix` no navegador em vez do valor pré-calculado: assim trocar
         `--cui-acento` em tempo de execução (um tema de cliente, por exemplo)
         continua repintando os derivados. */
      return `${nota}  --${p}-${nome}: color-mix(in oklab, var(--${p}-${def.base}) ${pct}%, transparent);`;
    })
    .join("\n");

  const formas = Object.entries(fonte.formas)
    .map(([nome, v]) => `  --${p}-${nome}: ${v}px;`)
    .join("\n");

  const curvas = Object.entries(fonte.curvas)
    .map(([nome, def]) => {
      const nota = def.nota ? `  /* ${def.nota} */\n` : "";
      return `${nota}  --${p}-${nome}: cubic-bezier(${def.bezier.join(", ")});`;
    })
    .join("\n");

  /*
    Um grupo cujas entradas trazem `px` (vira dimensão) ou `valor` (vira número
    puro — peso de fonte e z-index não têm unidade, e escrever `600px` num
    `font-weight` é um erro que o CSS engole em silêncio).
  */
  const grupoMisto = (obj, prefixoNome = "") =>
    Object.entries(obj)
      .map(([nome, def]) => {
        const v = def.px !== undefined ? `${def.px}px` : String(def.valor);
        const nota = def.nota ? `  /* ${def.nota} */\n` : "";
        return `${nota}  --${p}-${prefixoNome}${nome}: ${v};`;
      })
      .join("\n");

  const tipografia = grupoMisto(fonte.tipografia);
  const camadas = grupoMisto(fonte.camadas, "z-");

  const tempos = Object.entries(fonte.coreografia)
    .filter(([, def]) => def.ms !== undefined)
    .map(([nome, def]) => {
      const nota = def.nota ? `  /* ${def.nota} */\n` : "";
      return `${nota}  --${p}-${nome}: ${def.ms}ms;`;
    })
    .join("\n");

  return `${AVISO_GERADO("tokens/tokens.json")}

/*
 * O tema é um ATRIBUTO na raiz (\`data-tema="claro" | "escuro"\`), não uma classe:
 * atributo não colide com o \`dark:\` de Tailwind nem com o \`.dark\` do
 * next-themes se o projeto de destino já tiver um deles.
 *
 * Todo token de cor tem par nos dois temas. Um token definido só no claro é um
 * componente invisível no escuro — a falha mais cara e a mais silenciosa.
 */

:root,
[data-tema="claro"] {
${blocoDeTema("claro")}
}

[data-tema="escuro"] {
${blocoDeTema("escuro")}
}

/* Derivados do acento — trocar a matiz repinta o sistema inteiro. */
:root {
${alfas}

  /* Formas */
${formas}

  /* Tipografia */
${tipografia}

  /* Camadas */
${camadas}

  /* Curvas */
${curvas}

  /* Coreografia */
${tempos}
}

/*
 * A transição de tema fica na RAIZ e some para quem pede menos movimento. Sem o
 * \`:where\`, a especificidade zero se perderia e o seletor competiria com os
 * estados de cada componente.
 */
:where([data-tema-transicao]) * {
  transition:
    background-color 260ms ease,
    border-color 260ms ease,
    color 260ms ease;
}

@media (prefers-reduced-motion: reduce) {
  :where([data-tema-transicao]) * {
    transition: none;
  }
}
`;
}

/* --- TypeScript --------------------------------------------------------- */

function gerarTs() {
  const cores = {};
  for (const tema of TEMAS) {
    cores[tema] = {};
    for (const [nome, def] of Object.entries(fonte.cores)) {
      cores[tema][camel(nome)] = paraCadeia(resolverCor(def[tema], `${nome}.${tema}`));
    }
    for (const [nome, def] of Object.entries(fonte.alfas)) {
      const base = resolverCor(fonte.cores[def.base][tema], `${def.base}.${tema}`);
      cores[tema][camel(nome)] = comAlfa(base, def.alfa);
    }
  }

  const formas = Object.fromEntries(
    Object.entries(fonte.formas).map(([n, v]) => [camel(n), v]),
  );
  const curvas = Object.fromEntries(
    Object.entries(fonte.curvas).map(([n, d]) => [camel(n), d.bezier]),
  );
  const tempos = Object.fromEntries(
    Object.entries(fonte.coreografia)
      .filter(([, d]) => d.ms !== undefined)
      .map(([n, d]) => [camel(n), d.ms]),
  );
  /* As chaves de nota (`_nota`, `nota`) descrevem a fonte, não o token — elas
     ficam no JSON e não viajam para o código. */
  const molas = Object.fromEntries(
    Object.entries(fonte.molas)
      .filter(([nome]) => !nome.startsWith("_"))
      .map(([nome, def]) => [
        camel(nome),
        {
          mass: def.mass,
          stiffness: def.stiffness,
          damping: def.damping,
          velocity: def.velocity,
        },
      ]),
  );

  const numeros = (obj) =>
    Object.fromEntries(
      Object.entries(obj).map(([n, d]) => [camel(n), d.px ?? d.valor]),
    );
  const tipografia = numeros(fonte.tipografia);
  const camadas = numeros(fonte.camadas);

  const contagens = Object.fromEntries(
    Object.entries(fonte.coreografia)
      .filter(([, d]) => d.itens !== undefined)
      .map(([n, d]) => [camel(n), d.itens]),
  );

  const j = (o) => JSON.stringify(o, null, 2).replace(/\n/g, "\n");

  return `${AVISO_GERADO("tokens/tokens.json")}

/**
 * Os tokens em valores que qualquer runtime JavaScript entende.
 *
 * É a camada que atravessa TUDO — inclusive React Native, onde nenhum CSS
 * chega. As cores vêm resolvidas para \`#rrggbb\` ou \`rgba()\`: o OKLCH da fonte
 * foi convertido em tempo de geração, porque nem RN nem WebViews antigas o
 * entendem.
 *
 * ⚠️ **As SOMBRAS não estão aqui.** Sombra de CSS é uma lista de deslocamentos,
 * borrão e espalhamento; no React Native ela é \`shadowOffset\`/\`shadowRadius\` no
 * iOS e um único \`elevation\` no Android, que nem aceita cor. Traduzir 1:1 seria
 * inventar equivalência que não existe — use \`sombras\` do CSS na web e a
 * elevação nativa da plataforma no app.
 */

export type NomeDeTema = "claro" | "escuro";

export const cores = ${j(cores)} as const;

/** Dimensões em NÚMERO, sem unidade: na web some o \`px\`, no RN é o que ele espera. */
export const formas = ${j(formas)} as const;

/** Tamanhos em px e pesos de fonte, todos como número. */
export const tipografia = ${j(tipografia)} as const;

/** Ordem de empilhamento. */
export const camadas = ${j(camadas)} as const;

/** Beziers como tupla — pronto para \`Easing.bezier(...curvas.mola)\` no RN. */
export const curvas = ${j(curvas)} as const;

/**
 * As molas do design — física, não curva.
 *
 * ⚠️ **Não existem no \`tokens.css\`, e não é esquecimento:** CSS não tem spring.
 * Uma mola não tem duração — ela para quando a energia acaba — e isso não é
 * representável em \`animation-duration\`. Quem as consome é o anime.js, na web e
 * no React Native (onde \`Animated.spring\` recebe exatamente estes campos).
 */
export const molas = ${j(molas)} as const;

/** Durações e atrasos, em milissegundos. */
export const tempos = ${j(tempos)} as const;

export const contagens = ${j(contagens)} as const;

/** Atalho: os tokens de cor de um tema. */
export function coresDoTema(tema: NomeDeTema) {
  return cores[tema];
}
`;
}

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

/* --- Escrita ------------------------------------------------------------ */

const css = gerarCss();
const ts = gerarTs();

mkdirSync(dirname(SAIDA_CSS), { recursive: true });
mkdirSync(dirname(SAIDA_TS), { recursive: true });
writeFileSync(SAIDA_CSS, css, "utf8");
writeFileSync(SAIDA_TS, ts, "utf8");

const conta = (o) => Object.keys(o).length;
console.log(
  `tokens: ${conta(fonte.cores)} cores × ${TEMAS.length} temas, ` +
    `${conta(fonte.alfas)} derivados, ${conta(fonte.formas)} formas, ` +
    `${conta(fonte.tipografia)} de tipografia, ${conta(fonte.camadas)} camadas, ` +
    `${conta(fonte.curvas)} curvas, ${conta(fonte.molas) - 1} molas, ` +
    `${conta(fonte.coreografia)} de coreografia`,
);
console.log(`  → src/estilos/tokens.css`);
console.log(`  → src/lib/tokens/tokens.ts`);

for (const aviso of avisos) console.warn(`  ⚠️  ${aviso}`);
