import type { ReactNode } from "react";

/**
 * As peças da GALERIA — não da biblioteca.
 *
 * Elas existem para que cada demo seja só o componente em exame, sem repetir
 * cabeçalho, moldura e painel de saída. Não são candidatas a componente: uma
 * bancada de teste não tem uso fora daqui.
 */

/** Uma seção de demonstração: título, explicação e o que saiu. */
export function Bancada({
  titulo,
  apoio,
  saida,
  children,
}: {
  titulo: string;
  apoio?: string;
  /** O estado atual, para ver o que o componente devolveu. */
  saida?: readonly { rotulo: string; valor: string }[];
  children: ReactNode;
}) {
  return (
    <section className="demo-bancada">
      <header className="demo-bancada__cabecalho">
        <h3 className="demo-bancada__titulo">{titulo}</h3>
        {apoio ? <p className="demo-bancada__apoio">{apoio}</p> : null}
      </header>

      <div className="demo-bancada__palco">{children}</div>

      {saida ? (
        /* `aria-live`: quem usa leitor de tela também precisa saber o que o
           componente devolveu — senão a bancada só funciona para quem enxerga. */
        <footer className="demo-bancada__saida" aria-live="polite">
          {saida.map((s) => (
            <span key={s.rotulo} className="demo-saida">
              <span className="demo-saida__rotulo">{s.rotulo}</span>
              <span className="demo-saida__valor">{s.valor}</span>
            </span>
          ))}
        </footer>
      ) : null}
    </section>
  );
}

/** Rótulo + controle. O `id` é o que o componente aponta em `rotuladoPor`. */
export function Campo({
  rotulo,
  id,
  estreito,
  children,
}: {
  rotulo: string;
  id: string;
  estreito?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={estreito ? "demo-campo demo-campo--estreito" : "demo-campo"}>
      <span className="demo-campo__rotulo" id={id}>
        {rotulo}
      </span>
      {children}
    </div>
  );
}
