import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import {
  atrasoDaOnda,
  coreografar,
  createTimeline,
  curva,
  devolverAoCss,
  mola,
  ondaDeItens,
  preferemenosMovimento,
  utils,
} from "../movimento/movimento";
import type { Timeline } from "../movimento/movimento";
import { curvas, tempos } from "../tokens/tokens";
import type { Lado } from "./usar-ancoragem";

export type EstadoDaCoreografia = "fechado" | "aberto" | "fechando";

/*
  ⛔ **O painel NUNCA tem `maxHeight` limpo, e é o detalhe mais importante deste
  arquivo.** Esse valor é do React — o teto de altura medido na janela, aplicado
  via `style={{ maxHeight }}`. Apagá-lo ao fim da animação fazia o menu crescer
  até caber a lista inteira, com a barra de rolagem sumindo; e o React não
  reescrevia, porque o reconciliador só toca no DOM quando o VALOR muda entre
  renders, e do ponto de vista dele nada tinha mudado.

  Os itens, ao contrário, têm `maxHeight` escrito pela própria coreografia (é
  como o colapso funciona) — ali limpar é obrigatório, senão eles reabrem com
  altura zero.
*/
const LIMPEZA_DO_PAINEL = ["opacity", "transform"] as const;
const LIMPEZA_DOS_ITENS = [
  "opacity",
  "transform",
  "maxHeight",
  "padding",
  "overflow",
] as const;

/**
 * **A coreografia do menu** — entrada e saída, num lugar só.
 *
 * ⭐ **Molas na chegada, curvas na partida.** Não é preferência estética, é
 * semântica: uma coisa que CHEGA tem massa e assenta — física descreve isso, e
 * é por isso que a entrada usa `spring`. Uma coisa que PARTE é uma decisão já
 * tomada; ela deve sair com convicção e não "assentar" em lugar nenhum. Mola na
 * saída faz o painel hesitar na porta.
 *
 * ## O que acontece, em ordem
 *
 * **Abrindo** — o painel cresce de `0.965` com a mola `painel`, e os itens
 * sobem 6px numa onda que parte de quem está mais perto do gatilho. As duas
 * coisas ao mesmo tempo, não em sequência: a lista já está se desenhando
 * enquanto a caixa chega.
 *
 * **Fechando** — cada item COLAPSA (`maxHeight` da altura medida até zero,
 * padding junto, opacidade em zero na metade do caminho), na onda invertida.
 * Só depois de tudo recolhido, mais `pausaAntesDoPainel`, o painel recua na
 * direção do gatilho e sai. A pausa é o que faz a saída ser lida como duas
 * coisas em sequência em vez de uma massa sumindo.
 *
 * ## Por que isto deixou de ser CSS
 *
 * A entrada era CSS e a saída era Web Animations API — duas linguagens para uma
 * coreografia só, e o número que as unia (`passoItem`) escrito de dois jeitos.
 * Com o anime.js as duas metades falam a mesma língua, e a entrada ganha o que
 * nenhuma das duas oferecia: **mola de verdade.** `cubic-bezier` é uma curva
 * fixa que finge inércia; `spring` calcula a duração a partir de massa, rigidez
 * e amortecimento — o movimento para quando a energia acaba, não quando o
 * relógio marca.
 *
 * ## As armadilhas que continuam resolvidas
 *
 * ⛔ **Reabrir no meio do fechamento.** As animações em voo são canceladas e os
 * nós restaurados com `utils.set` — sem isso os itens continuariam presos em
 * `maxHeight: 0` e o menu "abriria" com a lista de altura zero.
 *
 * ⛔ **Lista vazia.** A onda de zero itens não gera atraso negativo (o stagger
 * do anime.js resolve isso sozinho), e a timeline do painel simplesmente começa
 * no zero.
 *
 * ⛔ **`prefers-reduced-motion`.** Tratado em `coreografar`, indo ao ÚLTIMO
 * quadro — nunca "não animando", o que deixaria os nós nos valores iniciais.
 */
export function usarCoreografia({
  painelRef,
  listaRef,
  direcaoRef,
  /**
   * Se o painel já foi medido — só então ele tem onde ser desenhado.
   *
   * ⛔ **Ref e não booleano, e a diferença é um pisca.** Um `useState` ligado por
   * `useEffect` só chega aqui um ciclo de pintura depois da medição, e nesse
   * intervalo o navegador pinta o painel inteiro e opaco antes de a coreografia
   * ter zerado a opacidade. A ref está atualizada no mesmo ciclo.
   */
  medindoRef,
}: {
  painelRef: RefObject<HTMLElement | null>;
  listaRef: RefObject<HTMLElement | null>;
  direcaoRef: RefObject<Lado>;
  medindoRef: RefObject<boolean>;
}) {
  const [estado, setEstado] = useState<EstadoDaCoreografia>("fechado");

  const linhaRef = useRef<Timeline | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revelou = useRef(false);

  const itensDo = useCallback(
    (painel: HTMLElement) =>
      Array.from((listaRef.current ?? painel).children) as HTMLElement[],
    [listaRef],
  );

  const encerrar = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    linhaRef.current = null;
    setEstado("fechado");
  }, []);

  /** Cancela o que estiver em voo e devolve os nós ao estado neutro. */
  const limpar = useCallback(() => {
    linhaRef.current?.cancel();
    linhaRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;

    const painel = painelRef.current;
    if (!painel) return;

    devolverAoCss(painel, LIMPEZA_DO_PAINEL);
    devolverAoCss(itensDo(painel), LIMPEZA_DOS_ITENS);
  }, [painelRef, itensDo]);

  const abrir = useCallback(() => {
    limpar();
    revelou.current = false;
    setEstado("aberto");
  }, [limpar]);

  /* --- Entrada ----------------------------------------------------------- */

  useLayoutEffect(() => {
    if (estado !== "aberto" || !medindoRef.current || revelou.current) return;

    const painel = painelRef.current;
    if (!painel) return;

    revelou.current = true;
    const itens = itensDo(painel);
    const paraCima = direcaoRef.current === "cima";
    const sentido = paraCima ? 1 : -1;

    /*
      Os valores iniciais entram ANTES da timeline, no mesmo quadro de layout.
      Deixar que a animação os aplique no primeiro tick expõe um quadro do painel
      já opaco e no lugar — o flash que se vê como um "pisca" na abertura.
    */
    utils.set(painel, { opacity: 0, scale: 0.965, translateY: -sentido * 10 });
    utils.set(itens, { opacity: 0, translateY: -sentido * 6 });

    linhaRef.current = coreografar(() => {
      const linha = createTimeline({
        defaults: { composition: "replace" },
        onComplete: () => {
          linhaRef.current = null;
          /* Sair limpo: sem isto o `opacity: 1` inline da animação venceria o
             `:hover` de cada item para sempre. */
          devolverAoCss(painel, LIMPEZA_DO_PAINEL);
          devolverAoCss(itens, LIMPEZA_DOS_ITENS);
        },
      });

      linha.add(painel, { opacity: 1, scale: 1, translateY: 0, ease: mola("painel") }, 0);

      if (itens.length > 0) {
        linha.add(
          itens,
          {
            opacity: 1,
            translateY: 0,
            ease: mola("item"),
            delay: ondaDeItens(paraCima ? "last" : "first", itens.length),
          },
          0,
        );
      }

      return linha;
    });
    /* `medindoRef` fora das dependências de propósito: ref não dispara efeito, e
       o que reexecuta este bloco é a medição chegar como novo render — que
       acontece porque `ancoragem` é estado no componente. */
  }, [estado, painelRef, direcaoRef, itensDo, medindoRef]);

  /* --- Saída ------------------------------------------------------------- */

  const fechar = useCallback(
    (imediato = false) => {
      const painel = painelRef.current;

      if (imediato || !painel || preferemenosMovimento()) {
        limpar();
        encerrar();
        return;
      }

      /* Já fechando: deixa a coreografia em voo terminar em vez de empilhar uma
         segunda sobre os mesmos nós. */
      if (estado === "fechando") return;

      /*
        ⛔ **Cancelar a ENTRADA antes de montar a saída, e sem devolver ao CSS.**

        Sem esta linha, fechar o menu no meio da abertura — dois cliques rápidos
        bastam — deixava a timeline de entrada viva. Ela terminava sozinha
        durante a saída e disparava o próprio `onComplete`, que limpa os estilos:
        no meio do fechamento, o painel voltava a `opacity: 1` sem transform e
        sem teto de altura. O sintoma era o menu REABRIR expandido depois de já
        ter fechado.

        `cancel()` e não `revert()`: cancelar deixa os nós onde estão, e a saída
        parte da posição real: um painel pego a 60% da entrada recua de lá.
        `revert()` os jogaria de volta ao estado inicial, e o fechamento
        começaria com um salto.
      */
      linhaRef.current?.cancel();
      linhaRef.current = null;

      setEstado("fechando");

      const itens = itensDo(painel);
      const paraCima = direcaoRef.current === "cima";
      const sentido = paraCima ? 1 : -1;

      /*
        ⭐ **A altura medida vira ponto de partida ANTES da timeline, e não um
        `from` calculado por índice dentro dela.**

        `maxHeight` é `none` por padrão, e "de `none` até 0" não é interpolável —
        alguém precisa dizer de onde. Fixando o valor medido no próprio elemento,
        a timeline anima do estado atual até zero, sem função por índice e sem
        guardar array nenhum. Medir agora também é obrigatório: depois do
        primeiro quadro de colapso, `offsetHeight` já não é a altura real de
        ninguém.
      */
      for (const item of itens) {
        /* Sem `overflow: hidden` o texto continua desenhado sobre um item de
           altura zero. */
        item.style.overflow = "hidden";
        utils.set(item, { maxHeight: `${item.offsetHeight}px` });
      }

      linhaRef.current = coreografar(
        () => {
          const linha = createTimeline({ onComplete: encerrar });

          if (itens.length > 0) {
            linha.add(
              itens,
              {
                /* A opacidade some na METADE do colapso: o item termina de se
                   recolher já invisível, e o que se vê é a lista encurtando —
                   não texto sendo espremido. */
                opacity: { to: 0, duration: tempos.saidaItem * 0.5 },
                maxHeight: 0,
                paddingTop: 0,
                paddingBottom: 0,
                translateY: sentido * 4,
                duration: tempos.saidaItem,
                ease: curva(curvas.colapso),
                delay: ondaDeItens(paraCima ? "first" : "last", itens.length),
              },
              0,
            );
          }

          linha.add(
            painel,
            {
              opacity: 0,
              translateY: sentido * 10,
              scale: 0.965,
              duration: tempos.saidaPainel,
              ease: curva(curvas.saida),
            },
            /*
              ⛔ **Posição ABSOLUTA, contada do início da timeline — e não
              `+=pausa`, que é relativo ao FIM de tudo que veio antes.**

              Com o `+=`, o painel esperava o ÚLTIMO item terminar de colapsar e
              só então contava a pausa: a lista já tinha sumido inteira e a caixa
              ficava na tela, parada e vazia, por quase meio segundo. Ancorando
              no INÍCIO do último item, a caixa começa a sair enquanto as últimas
              opções ainda se recolhem — os dois movimentos terminam quase
              juntos, e o fechamento inteiro cai de ~1070ms para ~630ms.
            */
            atrasoDaOnda(itens.length) + tempos.pausaAntesDoPainel,
          );

          return linha;
        },
        /* `prefers-reduced-motion` pula a coreografia — e o menu tem de fechar
           assim mesmo, senão ele fica montado e invisível para sempre. */
        encerrar,
      );

      /*
        Rede de segurança: o relógio do anime.js é o `requestAnimationFrame`, que
        NÃO roda em aba de segundo plano. Sem este timer, trocar de aba no meio
        do fechamento deixaria o painel montado capturando cliques até a pessoa
        voltar.
      */
      /* A rede de segurança acompanha a duração real, que agora é a do que
         terminar por último: o colapso dos itens ou a saída do painel. */
      const fimDosItens = atrasoDaOnda(itens.length) + tempos.saidaItem;
      const fimDoPainel =
        atrasoDaOnda(itens.length) + tempos.pausaAntesDoPainel + tempos.saidaPainel;

      timerRef.current = setTimeout(
        encerrar,
        Math.max(fimDosItens, fimDoPainel) + tempos.folgaDoTimer,
      );
    },
    [painelRef, itensDo, direcaoRef, estado, encerrar, limpar],
  );

  /* Desmontar com timeline em voo deixa `onComplete` chamando setState em
     componente morto. */
  useEffect(() => limpar, [limpar]);

  return {
    estado,
    aberto: estado === "aberto",
    montado: estado !== "fechado",
    abrir,
    fechar,
  };
}
