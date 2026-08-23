"use client";

import { useId } from "react";

import "./fundos.css";

export type PropsDoFundoDeOrbes = {
  /** Para encaixar em outro lugar que não a camada de fundo — a miniatura, por exemplo. */
  className?: string;
};

/**
 * **Fundo de orbes iridescentes** — cinco esferas de gradiente sobre luz difusa.
 *
 * ⭐ **É SVG, e não CSS, por causa da MOLDURA.** Um fundo de tela vive em telas
 * de todas as proporções, e a composição só sobrevive a isso se ela puder ser
 * enquadrada como uma foto: `viewBox` + `preserveAspectRatio="slice"` é
 * exatamente o `background-size: cover` — as orbes mantêm posição relativa e
 * tamanho entre si, e o excesso é cortado. Em CSS, as mesmas orbes em
 * porcentagem se deformam junto com a janela: numa tela larga a esfera vira
 * elipse e a composição se desfaz.
 *
 * ⭐ **A borda nítida e o miolo macio saem da MESMA peça.** No SVG o filtro roda
 * antes do recorte: o `feGaussianBlur` funde as quatro cores livremente, vazando
 * para fora do círculo, e o `clipPath` corta reto. É o que dá esfera — miolo sem
 * nenhuma emenda entre cores, contorno duro.
 *
 * ⛔ **O blur come opacidade perto da própria borda do que ele borra.** Por isso
 * cada disco-base tem folga generosa (r=340 dentro de um recorte de r=228, com
 * σ=58): sem ela, a borda direita sairia desbotada em vez de saturada. Mexer no
 * `stdDeviation` obriga a mexer no raio da base junto — é a regra invisível
 * deste arquivo, e a que mais quebra ajuste feito às pressas.
 *
 * ⚠️ **As cores NÃO são tokens do sistema, e isso é deliberado.** Elas são a
 * arte deste fundo, como a paleta de uma ilustração: trocar o acento do produto
 * não pode repintar o céu. O que responde ao tema é a base atrás delas, no CSS.
 *
 * ⚠️ **Decorativo do começo ao fim**: `aria-hidden`, sem texto e sem foco. Um
 * fundo que se anuncia é ruído para quem usa leitor de tela.
 */
export function FundoDeOrbes({ className }: PropsDoFundoDeOrbes) {
  /*
    ⛔ **Os ids do SVG precisam ser únicos POR INSTÂNCIA.** `url(#g-orbe1)` é
    global ao documento: com dois fundos na mesma página — a miniatura da
    galeria e o fundo ligado no site — o segundo passaria a usar os gradientes
    do primeiro, e nada acusaria o erro além de uma cor estranha. `useId` dá o
    prefixo; os dois-pontos que ele devolve saem porque `url(#…)` os trata como
    separador em alguns navegadores.
  */
  const base = useId().replace(/:/g, "");
  const u = (nome: string) => `${base}-${nome}`;
  const ref = (nome: string) => `url(#${u(nome)})`;

  return (
    <svg
      className={className ?? "cui-fundo-orbes"}
      viewBox="0 0 734 1024"
      preserveAspectRatio="xMinYMin slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/*
          `color-interpolation-filters="sRGB"`: o padrão da especificação é
          linearRGB, que lava os pastéis e devolve um cinza esverdeado. A região
          do filtro também é ampliada — na região padrão (-10%/120%) um blur
          forte é cortado, e o corte aparece como uma borda reta no meio do
          desfoque.
        */}
        <filter
          id={u("f-mesh-grande")}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="58" />
        </filter>

        {/* A orbe pequena leva blur proporcional: com o mesmo σ da grande, as
            três cores dela viram uma chapada só. */}
        <filter
          id={u("f-mesh-pequeno")}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="17" />
        </filter>

        {/* A luz de ambiente: é ela que faz as cinco orbes parecerem estar no
            mesmo lugar, em vez de coladas na mesma tela. */}
        <filter
          id={u("f-halo")}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="90" />
        </filter>

        {/* ORBE 1 — violeta em cima, dissolvida em nada por volta de y=430.
            `userSpaceOnUse` para ancorar o fim do gradiente numa coordenada da
            composição, e não numa fração da caixa do círculo. */}
        <linearGradient
          id={u("g-orbe1")}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="-95"
          x2="0"
          y2="430"
        >
          <stop offset="0" stopColor="#8f8ff2" stopOpacity="1" />
          <stop offset="0.42" stopColor="#9494f3" stopOpacity="0.88" />
          <stop offset="0.7" stopColor="#b6b6f6" stopOpacity="0.52" />
          <stop offset="0.88" stopColor="#dcdcfa" stopOpacity="0.18" />
          {/* Termina em TRANSPARENTE, não em branco: é o que permite este
              mesmo fundo funcionar sobre a base escura do tema escuro. */}
          <stop offset="1" stopColor="#dcdcfa" stopOpacity="0" />
        </linearGradient>

        {/* ORBE 5 — mesma lógica, em ciano. */}
        <linearGradient
          id={u("g-orbe5")}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="808"
          x2="0"
          y2="988"
        >
          <stop offset="0" stopColor="#7fe8e6" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#8deae7" stopOpacity="0.78" />
          <stop offset="0.72" stopColor="#bdf2f0" stopOpacity="0.4" />
          <stop offset="1" stopColor="#bdf2f0" stopOpacity="0" />
        </linearGradient>

        {/* ORBE 2 — cada cor é um radial que morre em transparente, para que
            elas se somem sem nenhuma emenda entre si. */}
        <radialGradient
          id={u("g2-rosa")}
          gradientUnits="userSpaceOnUse"
          cx="505"
          cy="78"
          r="82"
        >
          <stop offset="0" stopColor="#f2cfe8" stopOpacity="1" />
          <stop offset="0.6" stopColor="#f2cfe8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f2cfe8" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={u("g2-ciano")}
          gradientUnits="userSpaceOnUse"
          cx="612"
          cy="118"
          r="86"
        >
          <stop offset="0" stopColor="#a9e9e2" stopOpacity="1" />
          <stop offset="0.6" stopColor="#a9e9e2" stopOpacity="0.6" />
          <stop offset="1" stopColor="#a9e9e2" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={u("g2-menta")}
          gradientUnits="userSpaceOnUse"
          cx="546"
          cy="188"
          r="86"
        >
          <stop offset="0" stopColor="#a8ecc4" stopOpacity="1" />
          <stop offset="0.6" stopColor="#a8ecc4" stopOpacity="0.6" />
          <stop offset="1" stopColor="#a8ecc4" stopOpacity="0" />
        </radialGradient>
        {/* O aro de volume: transparente até 74% e só então escurece. O foco
            deslocado para cima e para a esquerda engrossa o aro embaixo à
            direita — é o que transforma um disco numa esfera. */}
        <radialGradient
          id={u("g2-anel")}
          gradientUnits="userSpaceOnUse"
          cx="548"
          cy="120"
          r="80"
          fx="512"
          fy="86"
        >
          <stop offset="0" stopColor="#5fb9ad" stopOpacity="0" />
          <stop offset="0.74" stopColor="#5fb9ad" stopOpacity="0" />
          <stop offset="0.93" stopColor="#63bdb2" stopOpacity="0.3" />
          <stop offset="1" stopColor="#4fa79d" stopOpacity="0.48" />
        </radialGradient>
        <clipPath id={u("clip-orbe2")}>
          <circle cx="548" cy="120" r="80" />
        </clipPath>

        {/* ORBE 3 — as quatro cores do mesh principal. */}
        <radialGradient
          id={u("g3-violeta")}
          gradientUnits="userSpaceOnUse"
          cx="300"
          cy="500"
          r="235"
        >
          <stop offset="0" stopColor="#7b7ff0" stopOpacity="1" />
          <stop offset="0.55" stopColor="#7b7ff0" stopOpacity="0.7" />
          <stop offset="1" stopColor="#7b7ff0" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={u("g3-violeta2")}
          gradientUnits="userSpaceOnUse"
          cx="352"
          cy="655"
          r="190"
        >
          <stop offset="0" stopColor="#8286f2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#8286f2" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={u("g3-topo")}
          gradientUnits="userSpaceOnUse"
          cx="455"
          cy="368"
          r="200"
        >
          <stop offset="0" stopColor="#f6eef8" stopOpacity="1" />
          <stop offset="0.6" stopColor="#f6eef8" stopOpacity="0.72" />
          <stop offset="1" stopColor="#f6eef8" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={u("g3-menta")}
          gradientUnits="userSpaceOnUse"
          cx="648"
          cy="530"
          r="230"
        >
          <stop offset="0" stopColor="#a5f0c8" stopOpacity="1" />
          <stop offset="0.6" stopColor="#a5f0c8" stopOpacity="0.7" />
          <stop offset="1" stopColor="#a5f0c8" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={u("g3-agua")}
          gradientUnits="userSpaceOnUse"
          cx="600"
          cy="722"
          r="215"
        >
          <stop offset="0" stopColor="#8ae8d2" stopOpacity="1" />
          <stop offset="0.6" stopColor="#8ae8d2" stopOpacity="0.72" />
          <stop offset="1" stopColor="#8ae8d2" stopOpacity="0" />
        </radialGradient>
        <clipPath id={u("clip-orbe3")}>
          <circle cx="452" cy="570" r="228" />
        </clipPath>
        {/* A máscara apaga a borda ESQUERDA antes de ela chegar ao contorno: ali
            a orbe não termina, ela se dissolve no halo. Branco é opaco, preto é
            buraco — e o meio-tom é justamente a dissolução. */}
        <linearGradient
          id={u("g3-fade-esq")}
          gradientUnits="userSpaceOnUse"
          x1="214"
          y1="0"
          x2="348"
          y2="0"
        >
          <stop offset="0" stopColor="#000000" />
          <stop offset="0.45" stopColor="#8a8a8a" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <mask
          id={u("mask-orbe3")}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="734"
          height="1024"
        >
          <rect x="0" y="0" width="734" height="1024" fill={ref("g3-fade-esq")} />
        </mask>

        {/* HALO — luz de ambiente. */}
        <radialGradient
          id={u("g4-violeta")}
          gradientUnits="userSpaceOnUse"
          cx="318"
          cy="690"
          r="240"
        >
          <stop offset="0" stopColor="#8f8ff2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8f8ff2" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={u("g4-violeta-alto")}
          gradientUnits="userSpaceOnUse"
          cx="292"
          cy="520"
          r="185"
        >
          <stop offset="0" stopColor="#9a9af4" stopOpacity="0.42" />
          <stop offset="1" stopColor="#9a9af4" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={u("g4-ciano")}
          gradientUnits="userSpaceOnUse"
          cx="556"
          cy="858"
          r="215"
        >
          <stop offset="0" stopColor="#7fe8e6" stopOpacity="0.5" />
          <stop offset="1" stopColor="#7fe8e6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/*
        ⛔ **Não há retângulo de fundo aqui.** A base atrás das orbes é do CSS,
        que a tira do tema: pintada no SVG, ela seria branca também no tema
        escuro — e o fundo deixaria de servir metade do site.
      */}

      {/* O halo fica na camada mais baixa: é luz, não objeto. Por baixo, ele
          preenche o vazio que a máscara abre na esquerda da orbe 3. */}
      <g filter={ref("f-halo")}>
        <ellipse cx="318" cy="690" rx="215" ry="245" fill={ref("g4-violeta")} />
        <ellipse cx="292" cy="520" rx="170" ry="165" fill={ref("g4-violeta-alto")} />
        <ellipse cx="556" cy="858" rx="195" ry="180" fill={ref("g4-ciano")} />
      </g>

      {/* Orbes 1 e 5: sem filtro nenhum — a borda de cima precisa ser nítida, e
          quem dissolve a de baixo é o gradiente. */}
      <circle cx="285" cy="205" r="300" fill={ref("g-orbe1")} />
      <circle cx="148" cy="900" r="92" fill={ref("g-orbe5")} />

      {/* Orbe 3 — máscara (dissolve a esquerda) > recorte (borda nítida) >
          filtro (funde as quatro cores). A ordem é o efeito. */}
      <g mask={ref("mask-orbe3")}>
        <g clipPath={ref("clip-orbe3")}>
          <g filter={ref("f-mesh-grande")}>
            <circle cx="452" cy="570" r="340" fill="#eef1fb" />
            <ellipse cx="300" cy="500" rx="215" ry="215" fill={ref("g3-violeta")} />
            <ellipse cx="352" cy="655" rx="175" ry="175" fill={ref("g3-violeta2")} />
            <ellipse cx="455" cy="368" rx="185" ry="160" fill={ref("g3-topo")} />
            <ellipse cx="648" cy="530" rx="215" ry="205" fill={ref("g3-menta")} />
            <ellipse cx="600" cy="722" rx="200" ry="190" fill={ref("g3-agua")} />
          </g>
        </g>
      </g>

      {/* Orbe 2 por último: ela passa por cima da orbe 1. */}
      <g clipPath={ref("clip-orbe2")}>
        <g filter={ref("f-mesh-pequeno")}>
          <circle cx="548" cy="120" r="125" fill="#f4f0fa" />
          <ellipse cx="505" cy="78" rx="72" ry="72" fill={ref("g2-rosa")} />
          <ellipse cx="612" cy="118" rx="76" ry="76" fill={ref("g2-ciano")} />
          <ellipse cx="546" cy="188" rx="76" ry="72" fill={ref("g2-menta")} />
        </g>
        {/* O aro fica FORA do grupo borrado: o blur apagaria justamente a parte
            dele que encosta na borda, que é a que desenha o volume. */}
        <circle cx="548" cy="120" r="80" fill={ref("g2-anel")} />
      </g>
    </svg>
  );
}
