"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { animate, curva, mola, preferemenosMovimento } from "../movimento/movimento";
import type { JSAnimation } from "../movimento/movimento";
import { curvas, formas, tempos } from "../tokens/tokens";

import "./abas.css";

export type Aba<T extends string = string> = {
  valor: T;
  rotulo: string;
  /** Um glifo antes do rótulo. Decorativo — o nome da aba é o rótulo. */
  icone?: ReactNode;
  /** Um contador ou etiqueta depois do rótulo: "12", "novo". */
  selo?: string;
  desabilitada?: boolean;
};

export type PropsDasAbas<T extends string> = {
  abas: readonly Aba<T>[];
  /** A aba aberta. Controlado — sem cópia local que se dessincronize do pai. */
  valor: T;
  aoTrocar: (valor: T) => void;
  /** Nome acessível do grupo: texto direto ou `id` de um rótulo visível. */
  rotulo?: string;
  rotuladoPor?: string;
  /**
   * O conteúdo da aba aberta. Com ele, o componente desenha o `tabpanel` e
   * amarra os `id` dos dois lados; sem ele, desenha só a barra — e aí quem
   * consome fica responsável por ligar a barra ao que ela controla.
   */
  children?: ReactNode;
};

/**
 * **Abas** — a barra de seções do topo da página, com a escolhida pintada no
 * tema OPOSTO ao da página.
 *
 * ⭐ **A seleção é uma INVERSÃO de tema, não uma cor nova.** No claro, a aba
 * aberta é um bloco com a paleta escura; no escuro, com a clara. Ela não
 * introduz um token sequer: `[data-tema-invertido]` republica a paleta do outro
 * tema para dentro do elemento, então o par texto/fundo da pestana é um par que
 * o sistema já garante — 14,96:1 no claro, 18,54:1 no escuro, ambos medidos.
 * Trocar o acento ou os cinzas em `tokens.json` repinta a aba junto.
 *
 * ⭐ **A aba aberta é uma PESTANA, não uma pílula dentro de um trilho.** O
 * corpo tem o topo arredondado e a base sobre a linha da barra; os dois pés
 * côncavos, um de cada lado, fazem a forma NASCER da linha em vez de pousar
 * sobre ela — é o que a faz ler como lingueta do painel logo abaixo.
 *
 * ⭐ **E ela é uma JANELA sobre uma cópia da barra, não um bloco com um rótulo
 * dentro.** A camada invertida é a barra inteira repetida por cima da
 * real, escondida menos onde o `clip-path` a abre. Durante a viagem, as letras
 * se invertem conforme entram na janela — e nunca existe texto claro sobre
 * fundo claro, que é o defeito da versão óbvia (pintar o texto da aba ativa e
 * deslizar um bloco atrás dele deixa 300ms de texto ilegível no caminho).
 *
 * ⚠️ **A posição é escrita em custom properties, e o JavaScript é o dono dela.**
 * `--cui-aba-x` e `--cui-aba-largura` vão no trilho a cada quadro; o CSS deriva
 * o recorte, e os pés leem as mesmas duas. Uma escrita, três consumidores — não
 * há como corpo, curvas e janela discordarem: são a mesma conta.
 *
 * ⚠️ **A primeira medição não anima.** Sem essa trava a pestana nasce no canto
 * esquerdo e corre até a aba ativa toda vez que a página carrega — um movimento
 * que ninguém pediu, e que sugere uma troca de aba que não houve.
 */
export function Abas<T extends string>({
  abas,
  valor,
  aoTrocar,
  rotulo,
  rotuladoPor,
  children,
}: PropsDasAbas<T>) {
  const base = useId();
  const trilhoRef = useRef<HTMLDivElement>(null);
  const botoesRef = useRef(new Map<string, HTMLButtonElement>());
  const animacaoRef = useRef<JSAnimation | null>(null);

  /*
    O objeto que a mola anima. É ele, e não um estado do React: a mola escreve
    ~60 vezes por segundo, e cada escrita seria um render. Os PÉS leem as mesmas
    variáveis, então corpo e curvas nunca discordam de onde a aba está.

    ⭐ `assento` é a terceira, e é ela que dá o caráter: 0 com os pés recolhidos,
    1 com eles espalhados. Durante a viagem a pestana corre meio descolada da
    linha; ao parar, as curvas se abrem e ela ASSENTA. Sem isso o movimento é
    correto e inerte — uma forma rígida escorregando de um lado para o outro.
  */
  const posicao = useRef({ x: 0, largura: 0, assento: 1 });
  const jaMediu = useRef(false);

  const indiceAtivo = abas.findIndex((a) => a.valor === valor);

  const escrever = useCallback(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    const { x, largura, assento } = posicao.current;
    trilho.style.setProperty("--cui-aba-x", `${x}px`);
    trilho.style.setProperty("--cui-aba-largura", `${largura}px`);
    /* O pé nunca chega a zero: some por completo e a pestana vira um retângulo
       flutuando por um instante, que é pior que não animar. 35% é o piso. */
    trilho.style.setProperty(
      "--cui-aba-pe-atual",
      `${formas.abaPe * (0.35 + 0.65 * assento)}px`,
    );
  }, []);

  const medir = useCallback(
    (animar: boolean) => {
      const alvo = botoesRef.current.get(valor);
      if (!trilhoRef.current || !alvo) return;

      /* `offsetLeft` é relativo ao trilho (o `offsetParent`), e já inclui o
         respiro — que é exatamente a origem do recorte no CSS. */
      const destino = { x: alvo.offsetLeft, largura: alvo.offsetWidth };

      /* ⛔ Cancelar a anterior ANTES de criar a próxima. Duas molas escrevendo no
         mesmo objeto disputam quadro a quadro, e a pestana treme. */
      animacaoRef.current?.pause();
      animacaoRef.current = null;

      if (!animar || !jaMediu.current || preferemenosMovimento()) {
        posicao.current.x = destino.x;
        posicao.current.largura = destino.largura;
        posicao.current.assento = 1;
        escrever();
        jaMediu.current = true;
        return;
      }

      /*
        A mola parte de onde o objeto está — inclusive no meio de uma viagem
        interrompida, com a velocidade que tinha. É o que `pause()` preserva.

        ⭐ **Os pés têm tempo PRÓPRIO, e mais longo que o da posição.** Eles
        recolhem no início e se espalham no fim, terminando depois de a pestana
        já ter parado: é a diferença entre uma forma que chega e uma forma que
        chega e ASSENTA. Com o mesmo tempo dos outros dois, o efeito some — tudo
        acaba junto e o assentamento deixa de ser perceptível como um segundo
        movimento.
      */
      posicao.current.assento = 0;
      animacaoRef.current = animate(posicao.current, {
        x: destino.x,
        largura: destino.largura,
        assento: { to: 1, duration: tempos.assentarAba, ease: curva(curvas.mola) },
        ease: mola("aba"),
        onUpdate: escrever,
      });
    },
    [valor, escrever],
  );

  /* `useLayoutEffect`: medir depois da pintura deixaria a pestana um quadro atrás
     do clique — visível como um tranco na primeira troca. */
  useLayoutEffect(() => {
    medir(true);

    const trilho = trilhoRef.current;
    if (!trilho || typeof ResizeObserver === "undefined") return;

    /*
      A barra muda de tamanho sem a aba mudar: janela redimensionada, fonte do
      sistema aumentada, um selo que aparece. Aí a pestana é REPOSICIONADA, nunca
      animada — animar um resize a faz perseguir o ponteiro enquanto a
      janela é arrastada.
    */
    const observador = new ResizeObserver(() => medir(false));
    observador.observe(trilho);
    return () => observador.disconnect();
  }, [medir]);

  /* Desmontar com a mola em voo deixaria o anime.js escrevendo num objeto de um
     componente que já não existe. */
  useEffect(
    () => () => {
      animacaoRef.current?.pause();
    },
    [],
  );

  /*
    ⭐ **A direção do painel sai da comparação com o índice ANTERIOR.** Ir para a
    aba da direita traz o conteúdo pela direita; voltar, pela esquerda. Sem essa
    memória, a entrada teria um lado fixo e metade das trocas pareceria empurrar
    o conteúdo contra o gesto.
  */
  const indiceAnterior = useRef(indiceAtivo);
  const direcao = indiceAtivo >= indiceAnterior.current ? "frente" : "tras";
  useEffect(() => {
    indiceAnterior.current = indiceAtivo;
  }, [indiceAtivo]);

  /** A próxima aba habilitada a partir de um índice, dando a volta. */
  const proximaHabilitada = (de: number, passo: number): Aba<T> | null => {
    const total = abas.length;
    for (let i = 1; i <= total; i++) {
      const candidata = abas[(((de + passo * i) % total) + total) % total];
      if (candidata && !candidata.desabilitada) return candidata;
    }
    return null;
  };

  const irPara = (alvo: Aba<T> | null) => {
    if (!alvo || alvo.valor === valor) return;
    aoTrocar(alvo.valor);
    /* O foco acompanha a seleção: o teclado tem de deixar a pessoa no controle
       que ela acabou de escolher, senão a próxima seta parte do lugar errado. */
    botoesRef.current.get(alvo.valor)?.focus();
  };

  /*
    Setas escolhem na hora (o padrão ARIA chama de "ativação automática"), e é o
    certo aqui porque trocar de aba é barato e reversível — obrigar a confirmar
    com Enter faria a navegação por teclado custar o dobro de teclas para chegar
    ao mesmo lugar que o mouse alcança num clique.
  */
  const aoTeclar = (evento: KeyboardEvent<HTMLDivElement>) => {
    const de = indiceAtivo < 0 ? 0 : indiceAtivo;
    const primeira = () => proximaHabilitada(-1, 1);
    const ultima = () => proximaHabilitada(abas.length, -1);

    switch (evento.key) {
      case "ArrowRight":
        irPara(proximaHabilitada(de, 1));
        break;
      case "ArrowLeft":
        irPara(proximaHabilitada(de, -1));
        break;
      case "Home":
        irPara(primeira());
        break;
      case "End":
        irPara(ultima());
        break;
      default:
        return;
    }
    /* Só o que foi tratado; deixar passar rolaria a página nas setas. */
    evento.preventDefault();
  };

  const idDoPainel = `${base}-painel`;
  const idDaAba = (v: string) => `${base}-aba-${v}`;

  /* A cópia invertida usa os mesmos rótulos e as mesmas classes — é a única
     forma de ela cair pixel a pixel sobre o texto real. */
  const conteudoDaAba = (aba: Aba<T>) => (
    <>
      {aba.icone ? (
        <span aria-hidden="true" className="cui-abas__icone">
          {aba.icone}
        </span>
      ) : null}
      <span>{aba.rotulo}</span>
      {aba.selo ? <span className="cui-abas__selo">{aba.selo}</span> : null}
    </>
  );

  return (
    <div className="cui-abas">
      <div className="cui-abas__rolagem">
        <div ref={trilhoRef} className="cui-abas__trilho">
          <div
            role="tablist"
            aria-label={rotuladoPor ? undefined : rotulo}
            aria-labelledby={rotuladoPor}
            className="cui-abas__lista"
            onKeyDown={aoTeclar}
          >
            {abas.map((aba) => {
              const ativa = aba.valor === valor;
              return (
                <button
                  key={aba.valor}
                  type="button"
                  role="tab"
                  id={idDaAba(aba.valor)}
                  ref={(el) => {
                    if (el) botoesRef.current.set(aba.valor, el);
                    else botoesRef.current.delete(aba.valor);
                  }}
                  aria-selected={ativa}
                  /* Só a aba aberta aponta o painel: ele existe apenas para ela,
                     e `aria-controls` para um `id` inexistente é pior que
                     ausente — o leitor de tela anuncia um destino que não há. */
                  aria-controls={ativa && children != null ? idDoPainel : undefined}
                  /* Foco itinerante: o Tab entra na barra pela aba aberta e sai
                     dela para o conteúdo, em vez de percorrer todas as abas. */
                  tabIndex={ativa ? 0 : -1}
                  disabled={aba.desabilitada}
                  onClick={() => aoTrocar(aba.valor)}
                  className="cui-abas__aba"
                >
                  {conteudoDaAba(aba)}
                </button>
              );
            })}
          </div>

          {/* ⭐ Os PÉS da pestana: as duas curvas côncavas que a fazem nascer da
              linha da barra em vez de pousar sobre ela. Ficam FORA da camada
              recortada — `clip-path: inset()` só sabe desenhar cantos convexos,
              e o negativo de um raio não é um raio. Carregam o tema invertido
              por conta própria para a cor bater com a do corpo. */}
          <span
            aria-hidden="true"
            data-tema-invertido=""
            data-visivel={indiceAtivo >= 0 ? "true" : "false"}
            className="cui-abas__pe cui-abas__pe--esquerdo"
          />
          <span
            aria-hidden="true"
            data-tema-invertido=""
            data-visivel={indiceAtivo >= 0 ? "true" : "false"}
            className="cui-abas__pe cui-abas__pe--direito"
          />

          {/* A camada invertida: a barra repetida, visível só na janela do
              recorte. `aria-hidden` porque é a MESMA informação — sem ele, um
              leitor de tela leria a barra inteira duas vezes. */}
          <div
            aria-hidden="true"
            data-tema-invertido=""
            data-visivel={indiceAtivo >= 0 ? "true" : "false"}
            className="cui-abas__invertida"
          >
            <div className="cui-abas__lista">
              {abas.map((aba) => (
                /* `data-desabilitada` porque um `<span>` não tem `:disabled`, e
                   uma aba aberta que perde a permissão apareceria esmaecida
                   fora da janela e viva dentro dela. */
                <span
                  key={aba.valor}
                  data-desabilitada={aba.desabilitada ? "true" : undefined}
                  className="cui-abas__aba"
                >
                  {conteudoDaAba(aba)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {children != null ? (
        /*
          `key`: trocar de aba REMONTA o painel, e é o que dispara a entrada em
          CSS. Sem ela o React reusaria o nó, o conteúdo trocaria sem animação
          nenhuma, e o estado interno do painel anterior vazaria para o próximo.

          `tabIndex={0}`: o painel pode não ter nada focável dentro, e aí o Tab
          pularia direto da barra para o rodapé da página, deixando quem navega
          por teclado sem forma de rolar o conteúdo que acabou de escolher.
        */
        <div
          key={valor}
          role="tabpanel"
          id={idDoPainel}
          aria-labelledby={indiceAtivo >= 0 ? idDaAba(valor) : undefined}
          tabIndex={0}
          data-direcao={direcao}
          className="cui-abas__painel"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
