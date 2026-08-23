/**
 * **Os glifos da página.** SVG inline, `currentColor`, 1.6px de traço.
 *
 * ⭐ Nenhuma biblioteca de ícones, pelo mesmo motivo do resto da biblioteca: um
 * pacote de mil ícones para usar oito é peso morto no bundle de quem copia a
 * pasta — e uma dependência a mais para manter alinhada com o React.
 *
 * ⚠️ Todos são DECORATIVOS. Quem os usa põe o nome acessível no elemento
 * clicável (`aria-label`), nunca no desenho: um ícone com rótulo próprio dentro
 * de um botão que já tem nome faz o leitor de tela anunciar duas vezes.
 */

type PropsDeIcone = { tamanho?: number; className?: string };

function Svg({
  tamanho = 16,
  className,
  children,
}: PropsDeIcone & { children: React.ReactNode }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconeDeLupa = (p: PropsDeIcone) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
);

export const IconeDeMais = (p: PropsDeIcone) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

/** A pasta fechada da árvore. */
export const IconeDePasta = (p: PropsDeIcone) => (
  <Svg {...p}>
    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 17.5Z" />
  </Svg>
);

/** A pasta aberta — o nó expandido, e o alvo aceso durante um arrasto. */
export const IconeDePastaAberta = (p: PropsDeIcone) => (
  <Svg {...p}>
    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v1H6.2a1.5 1.5 0 0 0-1.45 1.1L3 19Z" />
    <path d="m3 19 1.75-6.9A1.5 1.5 0 0 1 6.2 11h13.4a1 1 0 0 1 .97 1.25l-1.5 5.75A1.5 1.5 0 0 1 17.6 19Z" />
  </Svg>
);

export const IconeDeArquivo = (p: PropsDeIcone) => (
  <Svg {...p}>
    <path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7Z" />
    <path d="M14 3v4.5H18" />
  </Svg>
);

export const IconeDeChevron = ({ tamanho = 16, className }: PropsDeIcone) => (
  <Svg tamanho={tamanho} className={className}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

/** Reticências horizontais — o gatilho de "mais ações". */
export const IconeDeAcoes = (p: PropsDeIcone) => (
  <Svg {...p}>
    <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconeDeLapis = (p: PropsDeIcone) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" />
    <path d="m14.5 7.5 2 2" />
  </Svg>
);

export const IconeDeLixeira = (p: PropsDeIcone) => (
  <Svg {...p}>
    <path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
    <path d="M6.5 7 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
  </Svg>
);

export const IconeDeMover = (p: PropsDeIcone) => (
  <Svg {...p}>
    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 17.5Z" />
    <path d="M11 15h5m0 0-2-2m2 2-2 2" />
  </Svg>
);

export const IconeDePainel = (p: PropsDeIcone) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M10 4.5v15" />
  </Svg>
);

export const IconeDeEtiqueta = (p: PropsDeIcone) => (
  <Svg {...p}>
    <path d="M4 10.6V5.5A1.5 1.5 0 0 1 5.5 4h5.1a2 2 0 0 1 1.4.6l7.3 7.3a1.5 1.5 0 0 1 0 2.2l-5.2 5.2a1.5 1.5 0 0 1-2.2 0L4.6 12a2 2 0 0 1-.6-1.4Z" />
    <circle cx="8.4" cy="8.4" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   Selos de origem
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ **As cores daqui NÃO são tokens, e isso é deliberado.** Elas identificam
 * serviços de terceiros — a mesma razão pela qual um botão "entrar com o
 * Google" não usa o azul da sua marca. Elas não respondem a `tokens.json`
 * porque não pertencem ao seu design; se um dia o selo tiver de virar
 * monocromático, é aqui que ele muda, num lugar só.
 *
 * As formas são genéricas de propósito — um triângulo, um losango, uma inicial.
 * Reproduzir a marca de outra empresa dentro da sua interface é um problema de
 * licença esperando acontecer, e não é preciso: a cor já basta para reconhecer.
 */
const SELOS: Record<string, { fundo: string; frente: string; texto?: string }> = {
  drive: { fundo: "#1a73e8", frente: "#ffffff" },
  notion: { fundo: "#111111", frente: "#ffffff", texto: "N" },
  dropbox: { fundo: "#0061ff", frente: "#ffffff" },
  word: { fundo: "#2b579a", frente: "#ffffff", texto: "W" },
  powerpoint: { fundo: "#d24726", frente: "#ffffff", texto: "P" },
  pdf: { fundo: "#d93025", frente: "#ffffff", texto: "PDF" },
  local: { fundo: "#6b7280", frente: "#ffffff" },
};

export function SeloDeOrigem({
  origem,
  tamanho = 16,
}: {
  origem: string;
  tamanho?: number;
}) {
  const selo = SELOS[origem] ?? SELOS.local;
  if (!selo) return null;

  return (
    <span
      className="cui-arq__selo"
      style={{
        width: tamanho,
        height: tamanho,
        background: selo.fundo,
        color: selo.frente,
        /* O texto acompanha o selo: um "PDF" de tamanho fixo estoura quando o
           selo encolhe na lista de arquivos. */
        fontSize: Math.round(tamanho * (selo.texto && selo.texto.length > 1 ? 0.34 : 0.5)),
      }}
      aria-hidden="true"
    >
      {selo.texto ?? (
        <svg viewBox="0 0 24 24" width={tamanho * 0.62} height={tamanho * 0.62}>
          <path d="M12 4 21 20H3Z" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}
