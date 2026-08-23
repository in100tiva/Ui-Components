"use client";

import { useId } from "react";

import type { MovimentoDoFundo } from "./movimento";

import "./fundos.css";

export type PropsDoFundoDeSeda = {
  className?: string;
  /** Ver `movimento.ts`: `formas` ondula as dobras, `luz` corre o brilho por elas. */
  movimento?: MovimentoDoFundo;
};

/**
 * **Fundo de dobras de seda** — lençóis de cetim em rosa, lilás e azul.
 *
 * ⭐ **Cada dobra é um PAR, e é o par que produz volume**: o corpo com um
 * gradiente perpendicular à curva (branco na crista, cor no meio, sombra no
 * vale) mais uma sombra própria logo abaixo da crista, que é o que a dobra
 * projeta sobre o lençol de baixo. Só o gradiente do corpo dá uma faixa
 * chapada; só a sombra dá um borrão. Juntos, dão tecido.
 *
 * ⭐ **A crista tem um traço de luz separado.** É ele que faz o acetinado — um
 * stroke largo e desfocado correndo por cima da mesma curva do corpo. Sem ele o
 * conjunto lê como papel colorido, não como seda.
 *
 * ⛔ **Toda dobra que termina no meio do quadro precisa de máscara.** A aba do
 * alto acabava numa borda reta vertical, e uma linha reta perfeita no meio de
 * um tecido denuncia o path na hora. A máscara a dissolve antes que ela termine.
 *
 * ⚠️ As cores NÃO são tokens: são a arte deste fundo. O que responde ao tema é a
 * base atrás dele, no CSS.
 */
export function FundoDeSeda({ className, movimento = "nenhum" }: PropsDoFundoDeSeda) {
  /* Os ids do SVG precisam ser únicos por instância: `url(#…)` é global ao
     documento, e a miniatura da galeria convive com o fundo do site. */
  const base = useId().replace(/:/g, "");
  const u = (nome: string) => `${base}-${nome}`;
  const ref = (nome: string) => `url(#${u(nome)})`;

  return (
    <svg
      className={className ?? "cui-fundo-orbes"}
      data-movimento={movimento === "nenhum" ? undefined : movimento}
      viewBox="0 0 1100 640"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* O ar: rosa no alto à esquerda, azul descendo para a direita. */}
        <linearGradient
          id={u("ar")}
          gradientUnits="userSpaceOnUse"
          x1="80"
          y1="0"
          x2="1000"
          y2="640"
        >
          <stop offset="0" stopColor="#fbe7ee" />
          <stop offset="0.4" stopColor="#e6e6f5" />
          <stop offset="1" stopColor="#9fc0e6" />
        </linearGradient>

        {/* Os quatro corpos. Todos com a mesma lógica de luz: branco na crista,
            cor no ventre, sombra no vale. */}
        <linearGradient id={u("rosa")} gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="470">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.18" stopColor="#fde3ec" />
          <stop offset="0.62" stopColor="#f3bcd4" />
          <stop offset="1" stopColor="#dda0c4" />
        </linearGradient>

        <linearGradient id={u("lilas")} gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2="600">
          <stop offset="0" stopColor="#fdf2f7" />
          <stop offset="0.22" stopColor="#e9d4ea" />
          <stop offset="0.7" stopColor="#c4b6e0" />
          <stop offset="1" stopColor="#a9a2d6" />
        </linearGradient>

        <linearGradient id={u("azul")} gradientUnits="userSpaceOnUse" x1="0" y1="360" x2="0" y2="700">
          <stop offset="0" stopColor="#f2f7fd" />
          <stop offset="0.2" stopColor="#cfe0f4" />
          <stop offset="0.68" stopColor="#9dc0e6" />
          <stop offset="1" stopColor="#7ba3d3" />
        </linearGradient>

        <linearGradient id={u("azul-fundo")} gradientUnits="userSpaceOnUse" x1="0" y1="470" x2="0" y2="760">
          <stop offset="0" stopColor="#e4eefb" />
          <stop offset="0.25" stopColor="#a9c9ec" />
          <stop offset="1" stopColor="#6d97cc" />
        </linearGradient>

        <linearGradient id={u("veu")} gradientUnits="userSpaceOnUse" x1="640" y1="0" x2="1100" y2="330">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="0.55" stopColor="#dbe8f8" stopOpacity="0.8" />
          <stop offset="1" stopColor="#a9c9ec" stopOpacity="0.55" />
        </linearGradient>

        {/* A sombra do vale: forte no encosto da dobra, sumindo logo adiante. */}
        <linearGradient id={u("vale")} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a5f86" stopOpacity="0.42" />
          <stop offset="1" stopColor="#6a5f86" stopOpacity="0" />
        </linearGradient>

        {/* A luz que corre pela crista — o acetinado. */}
        <linearGradient id={u("crista")} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1100" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.22" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* ⛔ A aba do alto termina no meio do quadro; sem esta máscara, ela
            acaba numa borda reta vertical que denuncia o path. */}
        <linearGradient id={u("fade-aba")} gradientUnits="userSpaceOnUse" x1="560" y1="0" x2="820" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <mask id={u("m-aba")} maskUnits="userSpaceOnUse" x="0" y="0" width="1100" height="640">
          <rect width="1100" height="640" fill={ref("fade-aba")} />
        </mask>

        <filter id={u("f6")} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={u("f14")} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={u("f16")} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      {/* ⛔ Sem retângulo branco: a base vem do tema, no CSS. Este `rect` é o AR
          da composição, e ele é parte da arte — não do tema. */}
      <rect width="1100" height="640" fill={ref("ar")} />

      {/* ── O lençol azul do fundo ─────────────────────────────────────── */}
      <g className="cui-dobra" data-dobra="4">
        <g filter={ref("f14")}>
          <path
            d="M -60 470 C 140 386, 330 520, 540 476 C 760 430, 900 350, 1160 404 L 1160 700 L -60 700 Z"
            fill={ref("azul-fundo")}
          />
        </g>
      </g>

      {/* ── A dobra azul média, cruzando por cima ───────────────────────── */}
      <g className="cui-dobra" data-dobra="3">
        <g filter={ref("f6")}>
          <path
            d="M -60 556 C 190 452, 430 590, 690 518 C 900 460, 1010 452, 1160 492 L 1160 700 L -60 700 Z"
            fill={ref("azul")}
          />
          <path
            d="M -60 556 C 190 452, 430 590, 690 518 C 900 460, 1010 452, 1160 492 L 1160 560 C 1010 520, 900 528, 690 586 C 430 658, 190 520, -60 624 Z"
            fill={ref("vale")}
            opacity="0.55"
          />
        </g>
        <g className="cui-brilho" data-brilho="c" filter={ref("f16")}>
          <path
            d="M -60 552 C 190 448, 430 586, 690 514 C 900 456, 1010 448, 1160 488"
            stroke={ref("crista")}
            strokeWidth="16"
            fill="none"
          />
        </g>
      </g>

      {/* ── A grande dobra rosa/lilás do meio ───────────────────────────── */}
      <g className="cui-dobra" data-dobra="2">
        <g filter={ref("f6")}>
          <path
            d="M -60 300 C 120 214, 290 336, 470 300 C 700 254, 880 210, 1160 320 L 1160 620 C 880 500, 700 560, 470 520 C 290 488, 120 430, -60 500 Z"
            fill={ref("lilas")}
          />
          <path
            d="M -60 300 C 120 214, 290 336, 470 300 C 700 254, 880 210, 1160 320 L 1160 392 C 880 282, 700 326, 470 372 C 290 408, 120 286, -60 372 Z"
            fill={ref("vale")}
            opacity="0.5"
          />
        </g>
        <g className="cui-brilho" data-brilho="b" filter={ref("f14")}>
          <path
            d="M -60 296 C 120 210, 290 332, 470 296 C 700 250, 880 206, 1160 316"
            stroke={ref("crista")}
            strokeWidth="20"
            fill="none"
          />
        </g>
      </g>

      {/* ── A aba rosa clara enrolada, no alto ──────────────────────────── */}
      <g className="cui-dobra" data-dobra="1">
        <g mask={ref("m-aba")} filter={ref("f6")}>
          <path
            d="M -60 120 C 110 60, 250 190, 420 140 C 560 98, 660 120, 790 196 L 790 300 C 640 226, 560 246, 420 270 C 250 300, 110 262, -60 330 Z"
            fill={ref("rosa")}
          />
          <path
            d="M -60 120 C 110 60, 250 190, 420 140 C 560 98, 660 120, 790 196 L 790 240 C 660 164, 560 142, 420 184 C 250 234, 110 104, -60 164 Z"
            fill={ref("vale")}
            opacity="0.4"
          />
        </g>
        <g className="cui-brilho" data-brilho="a" mask={ref("m-aba")} filter={ref("f14")}>
          <path
            d="M -60 116 C 110 56, 250 186, 420 136 C 560 94, 660 116, 790 192"
            stroke={ref("crista")}
            strokeWidth="18"
            fill="none"
          />
        </g>
      </g>

      {/* ── O véu azul que desce da direita, por cima de tudo ───────────── */}
      <g className="cui-dobra" data-dobra="5">
        <g filter={ref("f14")} opacity="0.92">
          <path d="M 560 -40 C 700 90, 800 40, 1160 96 L 1160 -60 Z" fill={ref("veu")} />
          <path
            d="M 520 -30 C 660 140, 830 170, 1160 236 L 1160 120 C 820 60, 690 96, 560 -40 Z"
            fill={ref("veu")}
            opacity="0.75"
          />
        </g>
        <g className="cui-brilho" data-brilho="d" filter={ref("f16")}>
          <path
            d="M 520 -30 C 660 140, 830 170, 1160 236"
            stroke={ref("crista")}
            strokeWidth="14"
            fill="none"
            opacity="0.7"
          />
        </g>
      </g>
    </svg>
  );
}
