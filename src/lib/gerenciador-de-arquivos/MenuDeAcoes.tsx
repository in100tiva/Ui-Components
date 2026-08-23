"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

import { usarAncoragem } from "../menu-suspenso/usar-ancoragem";
import { usarCliqueFora } from "../menu-suspenso/usar-clique-fora";
import { formas, camadas } from "../tokens/tokens";

import { IconeDeChevron } from "./icones";

export type AcaoDeMenu = {
  id: string;
  rotulo: string;
  icone?: ReactNode;
  /** Pinta de vermelho: excluir, remover, desfazer. */
  perigosa?: boolean;
  desabilitada?: boolean;
  /**
   * Abre um SEGUNDO NÍVEL dentro do mesmo painel — "Mover para" e a lista de
   * pastas, por exemplo.
   */
  itens?: readonly AcaoDeMenu[];
  /**
   * Pede confirmação no próprio item: o rótulo vira este texto e só o segundo
   * clique executa.
   */
  confirmacao?: string;
  aoEscolher?: () => void;
};

/**
 * **O menu de ações** — o popover de "⋯" e o do título da pasta.
 *
 * ⭐ **Reusa os hooks do menu suspenso sem alterá-los** (`usarAncoragem`,
 * `usarCliqueFora`). Eles nunca foram do menu: são a base de qualquer coisa
 * flutuante — medir onde cabe, virar de lado quando não cabe, remedir ao rolar,
 * e contar o painel portalizado como "dentro" na hora de fechar.
 *
 * ⭐ **Submenu é NÍVEL, não painel voador.** "Mover para" troca o conteúdo do
 * mesmo painel e oferece um "voltar". Submenu que abre para o lado é a coisa
 * mais frágil de um menu: exige perseguir o ponteiro na diagonal, morre quando
 * o mouse passa um pixel fora, e no toque simplesmente não existe.
 *
 * ⭐ **Confirmação acontece DENTRO do item.** "Excluir" vira "Confirmar
 * exclusão" e só o segundo clique executa. Um diálogo modal para cada exclusão
 * é uma tela inteira montada para uma pergunta de uma linha — e o padrão de
 * clicar em "Ok" sem ler é justamente o que o modal produz.
 *
 * ⚠️ **A largura é do PAINEL, não do gatilho** — é a única coisa que este menu
 * calcula por conta própria. O gatilho de "⋯" tem 28px de largura; herdar isso
 * daria um menu de 28px, e ancorar por ela deixaria o painel sangrando pela
 * borda direita da janela.
 */
export function MenuDeAcoes({
  acoes,
  rotulo,
  className,
  children,
  alinhamento = "fim",
}: {
  acoes: readonly AcaoDeMenu[];
  /** Nome acessível do gatilho. */
  rotulo: string;
  className?: string;
  children: ReactNode;
  alinhamento?: "inicio" | "fim";
}) {
  const [aberto, setAberto] = useState(false);
  /** A pilha de níveis abertos. Vazia = o menu raiz. */
  const [trilha, setTrilha] = useState<readonly AcaoDeMenu[]>([]);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  const ancoragem = usarAncoragem({
    gatilhoRef,
    ativo: aberto,
    afastamento: 6,
    teto: 420,
    alinhamento,
    alturaMinima: 160,
    margem: formas.margemDaJanela,
  });

  const fechar = useCallback(() => {
    setAberto(false);
    setTrilha([]);
    setConfirmando(null);
    /* Devolver o foco ao gatilho: sem isto o Tab recomeça do topo da página, e
       quem usa teclado perde o lugar a cada menu aberto. */
    gatilhoRef.current?.focus();
  }, []);

  usarCliqueFora([gatilhoRef, painelRef], aberto, () => {
    setAberto(false);
    setTrilha([]);
    setConfirmando(null);
  });

  /*
    A correção horizontal, medindo a largura REAL do painel depois de montado.
    `useLayoutEffect` porque acontece antes da pintura — num `useEffect` o menu
    aparece uma vez fora do lugar e corrige no quadro seguinte, o que se vê.
  */
  useLayoutEffect(() => {
    const painel = painelRef.current;
    if (!painel || !ancoragem) return;

    const gatilho = gatilhoRef.current?.getBoundingClientRect();
    const margem = formas.margemDaJanela;
    const largura = painel.offsetWidth;
    const janela = document.documentElement.clientWidth;

    const preferida =
      alinhamento === "fim" && gatilho ? gatilho.right - largura : ancoragem.esquerda;

    painel.style.left = `${Math.max(margem, Math.min(preferida, janela - largura - margem))}px`;
  }, [ancoragem, alinhamento, trilha]);

  const nivel = trilha.length > 0 ? (trilha[trilha.length - 1]?.itens ?? []) : acoes;

  const escolher = (acao: AcaoDeMenu) => {
    if (acao.desabilitada) return;

    if (acao.itens) {
      setTrilha((atual) => [...atual, acao]);
      setConfirmando(null);
      return;
    }
    if (acao.confirmacao && confirmando !== acao.id) {
      setConfirmando(acao.id);
      return;
    }
    acao.aoEscolher?.();
    fechar();
  };

  /* Foco itinerante pelas setas — o teclado esperado de um `menu`. */
  const aoTeclar = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    const itens = [
      ...(painelRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? []),
    ];
    const atual = itens.indexOf(document.activeElement as HTMLButtonElement);

    if (evento.key === "Escape") {
      evento.preventDefault();
      /* Esc dentro de um nível volta um nível — fechar tudo faria perder o
         caminho percorrido só porque a pessoa se enganou de submenu. */
      if (trilha.length > 0) setTrilha((t) => t.slice(0, -1));
      else fechar();
      return;
    }
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      const passo = evento.key === "ArrowDown" ? 1 : -1;
      const proximo = itens[(atual + passo + itens.length) % itens.length];
      proximo?.focus();
      return;
    }
    if (evento.key === "Home" || evento.key === "End") {
      evento.preventDefault();
      (evento.key === "Home" ? itens[0] : itens[itens.length - 1])?.focus();
      return;
    }
    if (evento.key === "Tab") fechar();
  };

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className={className}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setAberto((a) => !a);
          setTrilha([]);
          setConfirmando(null);
        }}
      >
        {children}
      </button>

      {aberto && ancoragem && typeof document !== "undefined"
        ? createPortal(
            /*
              Portal + `fixed`: a mesma regra do menu suspenso. Um menu `absolute`
              é recortado por qualquer ancestral com `overflow` — e o painel
              lateral deste gerenciador rola, o que faria o menu do item da
              árvore ser cortado na borda da coluna.
            */
            <div
              ref={painelRef}
              role="menu"
              aria-label={rotulo}
              className="cui-arq__menu"
              onKeyDown={aoTeclar}
              style={{
                position: "fixed",
                left: ancoragem.esquerda,
                top: ancoragem.topo ?? undefined,
                bottom: ancoragem.base ?? undefined,
                maxHeight: ancoragem.alturaMaxima,
                zIndex: camadas.painel,
              }}
            >
              {trilha.length > 0 ? (
                <button
                  type="button"
                  role="menuitem"
                  className="cui-arq__menu-voltar"
                  onClick={() => setTrilha((t) => t.slice(0, -1))}
                >
                  <IconeDeChevron tamanho={14} className="cui-arq__menu-voltar-seta" />
                  {trilha[trilha.length - 1]?.rotulo}
                </button>
              ) : null}

              {nivel.length === 0 ? (
                <p className="cui-arq__menu-vazio">Nada por aqui</p>
              ) : null}

              {nivel.map((acao) => {
                const confirmandoEste = confirmando === acao.id;
                return (
                  <button
                    key={acao.id}
                    type="button"
                    role="menuitem"
                    disabled={acao.desabilitada}
                    data-perigosa={acao.perigosa || confirmandoEste ? "true" : undefined}
                    className="cui-arq__menu-item"
                    /* O primeiro item recebe o foco ao abrir: o menu foi aberto
                       para escolher algo, e a primeira seta já parte de dentro. */
                    autoFocus={acao === nivel[0]}
                    onClick={() => escolher(acao)}
                  >
                    {acao.icone ? (
                      <span className="cui-arq__menu-icone">{acao.icone}</span>
                    ) : null}
                    <span className="cui-arq__menu-rotulo">
                      {confirmandoEste ? acao.confirmacao : acao.rotulo}
                    </span>
                    {acao.itens ? (
                      <IconeDeChevron tamanho={14} className="cui-arq__menu-seta" />
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
