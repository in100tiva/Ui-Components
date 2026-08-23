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
    "moldura": "#e4ebf1",
    "molduraAlta": "#edf1f6",
    "molduraBorda": "#d6dce2",
    "realce": "rgba(0, 0, 0, 0.06)",
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
    "sucesso": "#318454",
    "sucessoTexto": "#115531",
    "sucessoSuperficie": "#eaf8ee",
    "sucessoBorda": "#bee2c9",
    "perigo": "#c92f33",
    "perigoTexto": "#972527",
    "perigoSuperficie": "#fff2f0",
    "perigoBorda": "#fdcdc9",
    "trilho": "#e9edf3",
    "alavanca": "#ffffff",
    "acento9": "rgba(131, 118, 213, 0.09)",
    "acento14": "rgba(131, 118, 213, 0.14)",
    "acento60": "rgba(131, 118, 213, 0.6)",
    "anelFoco": "rgba(42, 103, 189, 0.28)",
    "scrollPolegar": "rgba(131, 118, 213, 0.22)",
    "scrollPolegarForte": "rgba(131, 118, 213, 0.42)",
    "sucessoMalha": "rgba(49, 132, 84, 0.16)",
    "sucessoMalhaTenue": "rgba(49, 132, 84, 0.05)",
    "perigoMalha": "rgba(201, 47, 51, 0.16)",
    "perigoMalhaTenue": "rgba(201, 47, 51, 0.05)",
    "sucessoVidro": "rgba(49, 132, 84, 0.07)",
    "perigoVidro": "rgba(201, 47, 51, 0.07)"
  },
  "escuro": {
    "fundo": "#181a1f",
    "moldura": "#0e1115",
    "molduraAlta": "#13161b",
    "molduraBorda": "rgba(255, 255, 255, 0.07)",
    "realce": "rgba(255, 255, 255, 0.08)",
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
    "sucesso": "#59b47d",
    "sucessoTexto": "#8ed8a8",
    "sucessoSuperficie": "#173523",
    "sucessoBorda": "#2a583c",
    "perigo": "#ff6367",
    "perigoTexto": "#ffaaa7",
    "perigoSuperficie": "#472020",
    "perigoBorda": "#773736",
    "trilho": "#111419",
    "alavanca": "#3a3d44",
    "acento9": "rgba(161, 152, 235, 0.09)",
    "acento14": "rgba(161, 152, 235, 0.14)",
    "acento60": "rgba(161, 152, 235, 0.6)",
    "anelFoco": "rgba(106, 159, 238, 0.28)",
    "scrollPolegar": "rgba(161, 152, 235, 0.22)",
    "scrollPolegarForte": "rgba(161, 152, 235, 0.42)",
    "sucessoMalha": "rgba(89, 180, 125, 0.16)",
    "sucessoMalhaTenue": "rgba(89, 180, 125, 0.05)",
    "perigoMalha": "rgba(255, 99, 103, 0.16)",
    "perigoMalhaTenue": "rgba(255, 99, 103, 0.05)",
    "sucessoVidro": "rgba(89, 180, 125, 0.07)",
    "perigoVidro": "rgba(255, 99, 103, 0.07)"
  }
} as const;

/** Dimensões em NÚMERO, sem unidade: na web some o `px`, no RN é o que ele espera. */
export const formas = {
  "raioCampo": 14,
  "raioPainel": 18,
  "raioItem": 12,
  "painelRespiro": 8,
  "margemDaJanela": 12,
  "itemRespiroY": 11,
  "itemRespiroX": 14,
  "campoRespiroX": 16,
  "alturaCampo": 44,
  "alturaCampoLg": 46,
  "alturaBusca": 36,
  "scrollLargura": 11,
  "scrollRespiro": 3,
  "raioPilula": 999,
  "raioCasca": 22,
  "raioCascaLg": 32,
  "raioCartao": 16,
  "contornoEspessura": 3,
  "checkTamanho": 24,
  "alvoDeToque": 44,
  "malhaPasso": 6,
  "malhaPonto": 1,
  "interruptorAltura": 44,
  "interruptorLargura": 108,
  "interruptorKnob": 38,
  "molduraRespiro": 8,
  "molduraRespiroLg": 12,
  "lateralLargura": 248,
  "itemLateralRespiro": 14
} as const;

/** Tamanhos em px e pesos de fonte, todos como número. */
export const tipografia = {
  "textoCorpo": 14,
  "textoApoio": 12,
  "pesoLeve": 450,
  "pesoMedio": 500,
  "pesoForte": 600
} as const;

/** Ordem de empilhamento. */
export const camadas = {
  "painel": 60,
  "barraDeBusca": 10,
  "cabecalhoMovel": 20
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
  ],
  "percurso": [
    0.4,
    0,
    0.2,
    1
  ]
} as const;

/**
 * As molas do design — física, não curva.
 *
 * ⚠️ **Não existem no `tokens.css`, e não é esquecimento:** CSS não tem spring.
 * Uma mola não tem duração — ela para quando a energia acaba — e isso não é
 * representável em `animation-duration`. Quem as consome é o anime.js, na web e
 * no React Native (onde `Animated.spring` recebe exatamente estes campos).
 */
export const molas = {
  "painel": {
    "mass": 1,
    "stiffness": 190,
    "damping": 22,
    "velocity": 0
  },
  "item": {
    "mass": 1,
    "stiffness": 240,
    "damping": 26,
    "velocity": 0
  },
  "chevron": {
    "mass": 1,
    "stiffness": 160,
    "damping": 12,
    "velocity": 0
  },
  "pulso": {
    "mass": 1,
    "stiffness": 420,
    "damping": 18,
    "velocity": 0
  },
  "interruptor": {
    "mass": 1,
    "stiffness": 210,
    "damping": 17,
    "velocity": 0
  }
} as const;

/** Durações e atrasos, em milissegundos. */
export const tempos = {
  "passoItem": 45,
  "saidaItem": 300,
  "saidaPainel": 240,
  "pausaAntesDoPainel": 60,
  "folgaDoTimer": 80,
  "transicaoEstado": 160,
  "transicaoItem": 180,
  "deslizePilula": 320,
  "desenhoDoContorno": 700,
  "acenderDaMalha": 620,
  "abrirInterruptor": 260
} as const;

export const contagens = {
  "tetoEscalonado": 8
} as const;

/** Atalho: os tokens de cor de um tema. */
export function coresDoTema(tema: NomeDeTema) {
  return cores[tema];
}
