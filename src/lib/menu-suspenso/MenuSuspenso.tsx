"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { animate, mola, preferemenosMovimento, utils } from "../movimento/movimento";
import { formas } from "../tokens/tokens";
import { filtrarOpcoes, normalizar } from "./filtrar-opcoes";
import { usarAncoragem } from "./usar-ancoragem";
import type { Lado } from "./usar-ancoragem";
import { usarCliqueFora } from "./usar-clique-fora";
import { usarCoreografia } from "./usar-coreografia";
import type {
  AlinhamentoDoMenu,
  OpcaoMenu,
  TamanhoDoMenu,
} from "./tipos";

import "./menu-suspenso.css";

/** Distância entre o campo e o painel, em px. Um número só, usado uma vez. */
const AFASTAMENTO = 8;

/** Teto de altura do painel. O piso real é o espaço que sobra — ver `usar-ancoragem`. */
const TETO = 304;

/** Abaixo disto o espaço não serve, e o painel prefere virar para cima. */
const ALTURA_MINIMA = 168;

/** A folga que o painel nunca invade, em qualquer borda da janela. */
const MARGEM_DA_JANELA = formas.margemDaJanela;

/**
 * A partir de quantas opções a barra de filtrar aparece — em quem pediu `buscavel`.
 *
 * O teto de altura é que define o número, e ele foi medido: um item mede 42px
 * (11px de padding sobre 14px de texto) e o painel de 304px mostra 7,2 deles —
 * com a barra em cena, 6,0. Até sete opções a lista inteira já está na tela e
 * não há o que "procurar": a barra só roubaria uma linha de quem enxergava tudo.
 */
const MINIMO_PARA_BUSCA = 8;

/** Quanto tempo as letras digitadas seguem contando como a MESMA palavra. */
const JANELA_DO_TYPEAHEAD = 600;

export type PropsDoMenuSuspenso<T extends string> = {
  /** O que está escolhido. `null` mostra o placeholder. */
  valor: T | null;
  opcoes: readonly OpcaoMenu<T>[];
  /** O texto do campo quando nada está escolhido — e o nome da lista para leitor de tela. */
  placeholder: string;
  /**
   * O valor escolhido.
   *
   * O componente é CONTROLADO de propósito: ele não guarda cópia do valor, então
   * não existe o estado local que se dessincroniza do estado do pai — a família
   * de defeitos em que o menu mostra "Março" sobre uma lista já recortada por
   * abril simplesmente não é representável.
   */
  aoSelecionar: (valor: T) => void;
  /** `id` de um rótulo externo. Substitui o texto do botão para leitor de tela. */
  rotuladoPor?: string;
  /** Alternativa ao `rotuladoPor` quando não há rótulo visível na tela. */
  rotulo?: string;
  tamanho?: TamanhoDoMenu;
  alinhamento?: AlinhamentoDoMenu;
  desabilitado?: boolean;
  /** Liga a barra de filtrar — que só aparece de fato a partir de 8 opções. */
  buscavel?: boolean;
  placeholderBusca?: string;
  textoVazio?: string;
  className?: string;
};

/**
 * **Menu suspenso** — a lista de escolha única do design.
 *
 * O que ele é, em uma linha: um `listbox` acessível, controlado, posicionado por
 * medição e portalizado, com a coreografia de entrada escalonada que dá o
 * caráter do design.
 *
 * ## O que resolve, e por que cada peça existe
 *
 * - **Portal + `fixed` medido** — nenhum ancestral com `overflow` recorta a
 *   lista, e a altura é o espaço que sobra na janela, não um `vh` chutado.
 * - **Foco itinerante** (`tabIndex: -1` + `.focus()`) sem barra de busca, e
 *   `aria-activedescendant` com ela: são os dois padrões corretos do WAI-ARIA, e
 *   qual vale depende de onde o foco do sistema precisa estar. Misturar os dois
 *   é o que faz o leitor de tela anunciar o item errado.
 * - **Typeahead** — digitar "mar" num menu fechado ou aberto salta para Março.
 *   É o comportamento do `<select>` nativo, e a ausência dele é a queixa nº 1 de
 *   quem trocou um `<select>` por um menu custom.
 * - **Genérico em `T`** — com `opcoes` declarado `as const`, `aoSelecionar`
 *   recebe o literal, não `string`.
 *
 * ## O que ele deliberadamente NÃO faz
 *
 * Ele não navega, não busca no servidor e não guarda o valor. Quem decide o que
 * a escolha significa é quem o usa.
 */
export function MenuSuspenso<T extends string>({
  valor,
  opcoes,
  placeholder,
  aoSelecionar,
  rotuladoPor,
  rotulo,
  tamanho = "md",
  alinhamento = "inicio",
  desabilitado = false,
  buscavel = false,
  placeholderBusca = "Filtrar a lista",
  textoVazio = "Nada na lista corresponde a esse texto.",
  className,
}: PropsDoMenuSuspenso<T>) {
  const [indiceFoco, setIndiceFoco] = useState(0);
  const [consulta, setConsulta] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  const itensRef = useRef<(HTMLDivElement | null)[]>([]);
  const chevronRef = useRef<SVGSVGElement>(null);
  const rotuloRef = useRef<HTMLSpanElement>(null);

  const ids = useId();
  const idPainel = `${ids}-painel`;
  const idLista = `${ids}-lista`;

  /* A direção viaja por ref porque a coreografia decide se o painel monta, e a
     medição do lado só existe depois disso — ver a nota em `usarCoreografia`. */
  const direcaoRef = useRef<Lado>("baixo");

  const [ancoragemPronta, setAncoragemPronta] = useState(false);

  const { estado, aberto, montado, abrir: abrirPainel, fechar } =
    usarCoreografia({ painelRef, listaRef, direcaoRef, pronto: ancoragemPronta });

  const ancoragem = usarAncoragem({
    gatilhoRef,
    ativo: montado,
    afastamento: AFASTAMENTO,
    teto: TETO,
    alinhamento,
    alturaMinima: ALTURA_MINIMA,
    margem: MARGEM_DA_JANELA,
  });

  const lado = ancoragem?.lado ?? "baixo";
  const barraEmbaixo = lado === "cima";

  useEffect(() => {
    direcaoRef.current = lado;
  }, [lado]);

  /* A coreografia de entrada espera a medição: animar antes é animar um nó em
     (0,0), com o salto visível até o lugar certo. */
  useEffect(() => {
    setAncoragemPronta(ancoragem !== null);
  }, [ancoragem]);

  /* --- Micro-interações do campo ----------------------------------------- */

  /**
   * ⭐ **A seta gira com QUIQUE.** É a mola `chevron` (damping 12, a mais solta
   * do sistema): ela passa alguns graus do ponto e volta. Não é enfeite gratuito
   * — o quique é o que responde ao clique no instante do clique, antes de o
   * painel ter chegado. Sem ele, os 200ms até a lista aparecer são 200ms em que
   * a interface não disse nada.
   *
   * ⛔ Isto NÃO cabe em `transition: transform`. Uma curva de Bézier pode passar
   * do ponto (`cubic-bezier` com y > 1), mas o retorno é sempre o mesmo desenho,
   * independente de onde o giro começou. A mola parte da posição e da VELOCIDADE
   * atuais: interromper o giro no meio — clicar duas vezes rápido — continua de
   * onde estava, em vez de saltar para o começo.
   */
  const girou = useRef(false);
  useEffect(() => {
    const seta = chevronRef.current;
    if (!seta) return;

    const angulo = aberto ? 0 : 180;

    /* O primeiro quadro é estado, não gesto: a seta nasce apontando para baixo
       sem girar até lá na frente da pessoa. */
    if (!girou.current) {
      girou.current = true;
      utils.set(seta, { rotate: angulo });
      return;
    }

    animate(seta, { rotate: angulo, ease: mola("chevron") });
  }, [aberto]);

  /**
   * ⭐ **O rótulo do campo TROCA, e a troca é vista.**
   *
   * Escolher uma opção muda o texto do gatilho no mesmo quadro — enquanto o
   * painel ainda está se recolhendo, do outro lado da tela. Sem marcar essa
   * troca, o valor novo simplesmente já está lá quando a pessoa volta a olhar, e
   * a única confirmação de que a escolha pegou é o painel ter fechado.
   *
   * Um deslocamento de 4px com a mola `pulso` (rígida, ~130ms) resolve: rápido
   * demais para atrasar qualquer coisa, longo o bastante para o olho registrar
   * que aquele campo mudou.
   */
  const rotuloAnterior = useRef(valor);
  useEffect(() => {
    if (rotuloAnterior.current === valor) return;
    rotuloAnterior.current = valor;

    const alvo = rotuloRef.current;
    if (!alvo || preferemenosMovimento()) return;

    animate(alvo, {
      translateY: [6, 0],
      opacity: [0, 1],
      ease: mola("pulso"),
    });
  }, [valor]);

  const indiceSelecionado = opcoes.findIndex((o) => o.valor === valor);
  const rotuloAtual =
    indiceSelecionado >= 0 ? opcoes[indiceSelecionado]!.rotulo : placeholder;

  const comBusca = buscavel && opcoes.length >= MINIMO_PARA_BUSCA;

  const visiveis = useMemo(
    () => (comBusca ? filtrarOpcoes(opcoes, consulta) : opcoes),
    [comBusca, opcoes, consulta],
  );

  /* --- Abrir e fechar ---------------------------------------------------- */

  const abrir = useCallback(() => {
    if (desabilitado) return;
    setConsulta("");
    /* Abrir com o foco no que já está escolhido: a seta seguinte anda a partir
       dali, e não do topo de uma lista de 12 meses. */
    setIndiceFoco(indiceSelecionado >= 0 ? indiceSelecionado : 0);
    abrirPainel();
  }, [desabilitado, indiceSelecionado, abrirPainel]);

  const fecharEDevolverFoco = useCallback(
    (imediato = false) => {
      fechar(imediato);
      gatilhoRef.current?.focus();
    },
    [fechar],
  );

  usarCliqueFora(
    [containerRef, painelRef],
    montado,
    /* Clique fora NÃO devolve o foco ao gatilho: a pessoa está indo para outro
       lugar da tela, e roubar o foco de volta cancelaria o clique de destino. */
    useCallback(() => fechar(), [fechar]),
  );

  /* Um menu que fica aberto depois de desabilitado aceita clique no que já não
     deveria ser escolhível. */
  useEffect(() => {
    if (desabilitado && montado) fechar(true);
  }, [desabilitado, montado, fechar]);

  const escolher = useCallback(
    (opcao: OpcaoMenu<T> | undefined, imediato = false) => {
      if (!opcao || opcao.desabilitada) return;
      aoSelecionar(opcao.valor);
      fecharEDevolverFoco(imediato);
    },
    [aoSelecionar, fecharEDevolverFoco],
  );

  /* --- Foco -------------------------------------------------------------- */

  /*
    Sem barra, quem manda no foco do SISTEMA é o índice: o item focado recebe
    `.focus()` de verdade. Com barra, o foco fica no input (senão digitar é
    impossível) e o destaque vira `aria-activedescendant` — o padrão de combobox.
  */
  useEffect(() => {
    if (!aberto || comBusca) return;
    itensRef.current[indiceFoco]?.focus({ preventScroll: true });
  }, [aberto, comBusca, indiceFoco]);

  const focouNaAbertura = useRef(false);
  useEffect(() => {
    if (!aberto || !comBusca) {
      focouNaAbertura.current = false;
      return;
    }
    /* Só depois de o painel ter posição: focar um nó ainda invisível faz o
       navegador rolar a página até ele, em (0,0). */
    if (!ancoragem || focouNaAbertura.current) return;
    focouNaAbertura.current = true;
    buscaRef.current?.focus();
  }, [aberto, comBusca, ancoragem]);

  /*
    Manter o item destacado na vista. `scrollIntoView` não serve aqui: ele rola
    TODOS os ancestrais roláveis, então a página atrás do menu passeia junto.
    Mexer no `scrollTop` do painel mexe só no painel.
  */
  useEffect(() => {
    if (!aberto) return;
    const painel = painelRef.current;
    const item = itensRef.current[indiceFoco];
    if (!painel || !item) return;

    const topo = item.offsetTop;
    const base = item.offsetTop + item.offsetHeight;

    if (topo < painel.scrollTop) painel.scrollTop = topo;
    else if (base > painel.scrollTop + painel.clientHeight) {
      painel.scrollTop = base - painel.clientHeight;
    }
  }, [aberto, indiceFoco, consulta]);

  /* --- Teclado ----------------------------------------------------------- */

  /** Anda pulando o que está desabilitado; devolve o índice atual se tudo estiver. */
  const proximoHabilitado = useCallback(
    (partida: number, passo: number) => {
      const total = visiveis.length;
      if (total === 0) return 0;
      for (let i = 1; i <= total; i++) {
        const candidato = (partida + passo * i + total * total) % total;
        if (!visiveis[candidato]?.desabilitada) return candidato;
      }
      return partida;
    },
    [visiveis],
  );

  const bufferRef = useRef("");
  const bufferTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Typeahead: as letras digitadas em sequência formam uma palavra, e o menu
   * salta para o primeiro item que começa com ela. Repetir a MESMA letra é o
   * caso especial do `<select>` nativo — "m, m, m" cicla entre Março, Maio e
   * Março de novo em vez de procurar por "mmm".
   */
  const saltarPorTexto = useCallback(
    (letra: string) => {
      if (bufferTimer.current) clearTimeout(bufferTimer.current);
      bufferTimer.current = setTimeout(() => {
        bufferRef.current = "";
      }, JANELA_DO_TYPEAHEAD);

      const repetindo =
        bufferRef.current.length > 0 &&
        bufferRef.current.split("").every((c) => c === letra);

      bufferRef.current = repetindo ? letra : bufferRef.current + letra;
      const alvo = normalizar(bufferRef.current);

      const total = visiveis.length;
      if (total === 0) return;

      const partida = repetindo ? indiceFoco + 1 : indiceFoco;
      for (let i = 0; i < total; i++) {
        const candidato = (partida + i) % total;
        const opcao = visiveis[candidato];
        if (!opcao || opcao.desabilitada) continue;
        if (normalizar(opcao.rotulo).startsWith(alvo)) {
          setIndiceFoco(candidato);
          return;
        }
      }
    },
    [visiveis, indiceFoco],
  );

  useEffect(() => () => {
    if (bufferTimer.current) clearTimeout(bufferTimer.current);
  }, []);

  function aoTeclar(evento: React.KeyboardEvent) {
    if (evento.key === "Escape") {
      if (!montado) return;
      /* Um menu aberto dentro de um diálogo: sem parar a propagação aqui, o
         mesmo Escape fecha os dois de uma vez. */
      evento.stopPropagation();
      evento.preventDefault();
      fecharEDevolverFoco(true);
      return;
    }

    if (!aberto) {
      if (evento.key === "ArrowDown" || evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        abrir();
        return;
      }
      /* Typeahead com o menu FECHADO troca a seleção direto, como no nativo. */
      if (ehLetra(evento)) {
        evento.preventDefault();
        const alvo = normalizar(evento.key);
        const achado = opcoes.find(
          (o) => !o.desabilitada && normalizar(o.rotulo).startsWith(alvo),
        );
        if (achado) aoSelecionar(achado.valor);
      }
      return;
    }

    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        setIndiceFoco((i) => proximoHabilitado(i, 1));
        break;

      case "ArrowUp":
        evento.preventDefault();
        setIndiceFoco((i) => proximoHabilitado(i, -1));
        break;

      case "Home":
        if (comBusca) break; /* Home/End pertencem ao texto do input. */
        evento.preventDefault();
        setIndiceFoco(proximoHabilitado(-1, 1));
        break;

      case "End":
        if (comBusca) break;
        evento.preventDefault();
        setIndiceFoco(proximoHabilitado(visiveis.length, -1));
        break;

      case "Enter":
        evento.preventDefault();
        escolher(visiveis[indiceFoco], true);
        break;

      case " ":
        /* Com a barra em cena, espaço é espaço: separa palavras do filtro. */
        if (comBusca) break;
        evento.preventDefault();
        escolher(visiveis[indiceFoco], true);
        break;

      case "Tab":
        /* Fecha sem devolver o foco: o Tab já está levando para o próximo campo,
           e um `.focus()` aqui o traria de volta ao gatilho — a armadilha de
           foco clássica de menu mal fechado. */
        fechar(true);
        break;

      default:
        if (!comBusca && ehLetra(evento)) {
          evento.preventDefault();
          saltarPorTexto(evento.key);
        }
    }
  }

  /* --- Render ------------------------------------------------------------ */

  itensRef.current.length = visiveis.length;

  /*
    ⭐ **A ordem da entrada não é calculada aqui — e antes era.** Havia neste
    lugar uma conta de "linhas do painel", com deslocamento pela barra de busca,
    inversão pelo lado e teto de escalonamento, servida ao CSS por uma custom
    property. O `stagger` do anime.js faz exatamente isso com `from: "first" |
    "last"`, sobre os nós reais — ver `ondaDeItens`. Vinte linhas a menos, e a
    regra passa a estar escrita num lugar só, valendo para entrada e saída.
  */
  const itens = visiveis.map((opcao, i) => (
    <div
      key={opcao.valor}
      ref={(el) => {
        itensRef.current[i] = el;
      }}
      id={`${idLista}-${i}`}
      role="option"
      tabIndex={-1}
      aria-selected={opcao.valor === valor}
      aria-disabled={opcao.desabilitada || undefined}
      data-focado={comBusca && i === indiceFoco ? "true" : undefined}
      onClick={() => escolher(opcao)}
      /*
        O mouse move o destaque só no modo com busca, onde ele é pintura pura.
        Sem busca o destaque É o foco do sistema, e segui-lo com o mouse faria a
        lista rolar sozinha sob o cursor — o efeito que mantém o item focado na
        vista puxaria o painel a cada item que o mouse atravessasse.
      */
      onPointerEnter={
        comBusca && !opcao.desabilitada ? () => setIndiceFoco(i) : undefined
      }
      className="cui-menu__item"
    >
      <span className="cui-menu__item-texto">
        <span className="cui-menu__item-rotulo">{opcao.rotulo}</span>
        {opcao.apoio ? (
          <span className="cui-menu__item-apoio">{opcao.apoio}</span>
        ) : null}
      </span>
      <IconeMarca />
    </div>
  ));

  const painel = montado ? (
    <div
      ref={painelRef}
      id={idPainel}
      role={comBusca ? undefined : "listbox"}
      aria-label={comBusca ? undefined : (rotulo ?? placeholder)}
      data-estado={estado}
      data-lado={lado}
      data-alinhamento={alinhamento}
      data-com-busca={comBusca ? "true" : "false"}
      data-medido={ancoragem ? "true" : "false"}
      className="cui-menu__painel"
      /*
        ⛔ **Sem `onKeyDown` aqui, e isso não é esquecimento.** O painel está num
        portal, mas evento de portal propaga pela árvore REACT, não pela do DOM:
        um handler aqui e outro no container fariam o mesmo keydown rodar duas
        vezes, e cada seta andaria duas posições. O container cobre os dois.
      */
      style={{
        left: ancoragem?.esquerda,
        width: ancoragem?.largura,
        /* `null` viraria a string "null" no style — daí o `?? undefined`. Um dos
           dois é sempre nulo: subir ancora pela base para crescer para cima. */
        top: ancoragem?.topo ?? undefined,
        bottom: ancoragem?.base ?? undefined,
        maxHeight: ancoragem?.alturaMaxima,
      }}
    >
      {comBusca ? (
        <div
          className="cui-menu__barra"
          data-posicao={barraEmbaixo ? "base" : "topo"}
        >
          <div className="cui-menu__busca-caixa">
            <IconeLupa />
            <input
              ref={buscaRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={idLista}
              aria-autocomplete="list"
              aria-activedescendant={
                visiveis[indiceFoco] ? `${idLista}-${indiceFoco}` : undefined
              }
              aria-label={placeholderBusca}
              /* Preenchimento automático sobre uma lista já carregada não
                 completa nada — só cobre as opções com um painel do sistema. */
              autoComplete="off"
              value={consulta}
              onChange={(e) => {
                setConsulta(e.target.value);
                setIndiceFoco(0);
              }}
              placeholder={placeholderBusca}
              className="cui-menu__busca"
            />
          </div>
        </div>
      ) : null}

      {comBusca ? (
        /*
          `listaRef` é o que a coreografia de saída percorre. Sem ela, os
          "itens" a colapsar seriam os filhos diretos do painel — a barra de
          busca e o aviso de lista vazia —, e a lista inteira sairia de uma vez
          enquanto o campo de digitar se retraía sozinho.
        */
        <div
          ref={listaRef}
          id={idLista}
          role="listbox"
          aria-label={rotulo ?? placeholder}
          className="cui-menu__lista"
        >
          {itens}
        </div>
      ) : (
        itens
      )}

      {comBusca ? (
        /* Leitor de tela só anuncia mudança dentro de um `aria-live` que JÁ
           existia; um `<p>` que aparece do nada costuma passar em silêncio. */
        <p aria-live="polite" className="cui-menu__vazio">
          {visiveis.length === 0 ? textoVazio : ""}
        </p>
      ) : null}
    </div>
  ) : null;

  return (
    <div
      ref={containerRef}
      className={["cui-menu", className].filter(Boolean).join(" ")}
      onKeyDown={aoTeclar}
    >
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => (aberto ? fechar() : abrir())}
        disabled={desabilitado}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={montado ? idPainel : undefined}
        aria-labelledby={rotuladoPor}
        aria-label={rotuladoPor ? undefined : rotulo}
        data-tamanho={tamanho}
        data-vazio={indiceSelecionado < 0 ? "true" : "false"}
        className="cui-menu__gatilho"
      >
        <span ref={rotuloRef} className="cui-menu__rotulo">
          {rotuloAtual}
        </span>
      </button>

      <IconeChevron ref={chevronRef} />

      {/* `document` só existe no cliente: em SSR o painel simplesmente não sai —
          e não precisa sair, já que só existe depois de um gesto. */}
      {painel && typeof document !== "undefined"
        ? createPortal(painel, document.body)
        : null}
    </div>
  );
}

/** Tecla que produz um caractere, e sem modificador — o que alimenta o typeahead. */
function ehLetra(evento: React.KeyboardEvent): boolean {
  return (
    evento.key.length === 1 &&
    evento.key !== " " &&
    !evento.ctrlKey &&
    !evento.metaKey &&
    !evento.altKey
  );
}

/* Ícones inline: uma dependência a menos, e são três caminhos SVG. */

function IconeChevron({ ref }: { ref: React.Ref<SVGSVGElement> }) {
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="cui-menu__chevron"
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function IconeLupa() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="cui-menu__lupa"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconeMarca() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="cui-menu__marca"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
