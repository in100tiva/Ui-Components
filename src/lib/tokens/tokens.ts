/* ┌──────────────────────────────────────────────────────────────────────┐
   │  ARQUIVO GERADO — não edite à mão.                                   │
   │  Fonte: tokens/tokens.json                                          │
   │  Regenerar: pnpm tokens                                              │
   └──────────────────────────────────────────────────────────────────────┘ */

/**
 * Os tokens em valores que qualquer runtime JavaScript entende.
 *
 * É a camada que atravessa TUDO — inclusive React Native, onde nenhum CSS
 * chega. As cores vêm resolvidas para `#rrggbb` ou `rgba()`: o OKLCH da fonte
 * foi convertido em tempo de geração, porque nem RN nem WebViews antigas o
 * entendem.
 *
 * ⚠️ **As SOMBRAS não estão aqui.** Sombra de CSS é uma lista de deslocamentos,
 * borrão e espalhamento; no React Native ela é `shadowOffset`/`shadowRadius` no
 * iOS e um único `elevation` no Android, que nem aceita cor. Traduzir 1:1 seria
 * inventar equivalência que não existe — use `sombras` do CSS na web e a
 * elevação nativa da plataforma no app.
 */

export type NomeDeTema = "claro" | "escuro";

export const cores = {
  "claro": {
    "fundo": "#f7f8fa",
    "superficie": "#ffffff",
    "flutuante": "#ffffff",
    "abafado": "#eef1f6",
    "campoFundo": "#fcfdfe",
    "texto": "#0f1417",
    "textoRotulo": "#414852",
    "textoSuave": "#5a626d",
    "textoTenue": "#5f6873",
    "borda": "#d9e0ea",
    "contorno": "#7f8792",
    "acento": "#8376d5",
    "acentoTexto": "#51468b",
    "acentoBorda": "#ecebf3",
    "acentoPlaceholder": "#6b6f89",
    "foco": "#2a67bd",
    "acento9": "rgba(131, 118, 213, 0.09)",
    "acento14": "rgba(131, 118, 213, 0.14)",
    "acento60": "rgba(131, 118, 213, 0.6)",
    "anelFoco": "rgba(42, 103, 189, 0.28)"
  },
  "escuro": {
    "fundo": "#181a1f",
    "superficie": "#1d2026",
    "flutuante": "#1d2026",
    "abafado": "#282b31",
    "campoFundo": "rgba(255, 255, 255, 0.02)",
    "texto": "#f6f5f1",
    "textoRotulo": "#cbd2d9",
    "textoSuave": "#a5acb2",
    "textoTenue": "#9399a0",
    "borda": "rgba(255, 255, 255, 0.09)",
    "contorno": "#707883",
    "acento": "#a198eb",
    "acentoTexto": "#cecbf7",
    "acentoBorda": "rgba(255, 255, 255, 0.08)",
    "acentoPlaceholder": "#9695b0",
    "foco": "#6a9fee",
    "acento9": "rgba(161, 152, 235, 0.09)",
    "acento14": "rgba(161, 152, 235, 0.14)",
    "acento60": "rgba(161, 152, 235, 0.6)",
    "anelFoco": "rgba(106, 159, 238, 0.28)"
  }
} as const;

/** Dimensões em NÚMERO, sem unidade: na web some o `px`, no RN é o que ele espera. */
export const formas = {
  "raioCampo": 14,
  "raioPainel": 18,
  "raioItem": 12,
  "raioBusca": 11,
  "alturaCampo": 44,
  "alturaCampoLg": 46,
  "alturaBusca": 36
} as const;

/** Beziers como tupla — pronto para `Easing.bezier(...curvas.mola)` no RN. */
export const curvas = {
  "mola": [
    0.16,
    1,
    0.3,
    1
  ],
  "saida": [
    0.7,
    0,
    0.84,
    0
  ],
  "colapso": [
    0.65,
    0,
    0.35,
    1
  ]
} as const;

/** Durações e atrasos, em milissegundos. */
export const tempos = {
  "passoItem": 45,
  "entradaPainel": 420,
  "entradaItem": 380,
  "saidaItem": 300,
  "saidaPainel": 240,
  "pausaAntesDoPainel": 200,
  "folgaDoTimer": 80
} as const;

export const contagens = {
  "tetoEscalonado": 8
} as const;

/** Atalho: os tokens de cor de um tema. */
export function coresDoTema(tema: NomeDeTema) {
  return cores[tema];
}
