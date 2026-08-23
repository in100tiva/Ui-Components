"use client";

import { useEffect, useRef, useState } from "react";

/**
 * **Renomear no lugar** — o campo que substitui o rótulo enquanto se digita.
 *
 * ⭐ **É edição no lugar, e não um diálogo, porque renomear é a operação mais
 * frequente de um gerenciador.** Um modal para trocar uma palavra custa dois
 * cliques a mais e tira a pessoa do contexto — ela deixa de ver a lista onde o
 * nome vai viver, que é justamente o que ajuda a escolher o nome.
 *
 * ⭐ **O texto já nasce selecionado.** Quem renomeia quase sempre troca o nome
 * inteiro ("Nova pasta" → "Contratos"); começar com o cursor no fim obrigaria a
 * apagar dezesseis caracteres antes de escrever o primeiro.
 *
 * ⚠️ **Confirmar no `blur`, e não descartar.** Clicar fora com um nome digitado
 * é a ação de quem terminou, não de quem desistiu — descartar ali perde
 * trabalho de verdade. Para desistir existe Esc, que é explícito.
 */
export function CampoDeNome({
  valorInicial,
  aoConfirmar,
  aoCancelar,
  rotulo,
}: {
  valorInicial: string;
  aoConfirmar: (nome: string) => void;
  aoCancelar: () => void;
  rotulo: string;
}) {
  const [valor, setValor] = useState(valorInicial);
  const campoRef = useRef<HTMLInputElement>(null);
  /* Esc precisa impedir que o blur seguinte confirme o que foi descartado. */
  const cancelado = useRef(false);

  useEffect(() => {
    campoRef.current?.focus();
    campoRef.current?.select();
  }, []);

  const confirmar = () => {
    if (cancelado.current) return;

    /*
      ⛔ **Blur de elemento REMOVIDO não é blur de pessoa saindo do campo**, e
      confundir os dois custou um defeito inteiro: ao criar uma pasta, o id
      provisório é trocado pelo real quando o servidor responde; a troca muda a
      `key` do item, o React remonta a linha, e o navegador dispara `blur` no
      input que acabou de sair do DOM. Esse blur fechava a edição que tinha sido
      reaberta um instante antes — resultado: criar pasta abria o campo e ele
      sumia sozinho, só com servidor lento o bastante.

      Um nó que já saiu do documento tem `isConnected` falso. Foi ele quem saiu,
      não o foco.
    */
    if (!campoRef.current?.isConnected) return;

    const limpo = valor.trim();
    /* Nome vazio não é renomear, é apagar o rótulo: volta ao que era. */
    if (!limpo || limpo === valorInicial) aoCancelar();
    else aoConfirmar(limpo);
  };

  return (
    <input
      ref={campoRef}
      type="text"
      value={valor}
      aria-label={rotulo}
      className="cui-arq__campo-nome"
      onChange={(e) => setValor(e.target.value)}
      onBlur={confirmar}
      /* ⛔ O clique no campo não pode subir: o pai é um item selecionável, e sem
         isto posicionar o cursor com o mouse navegaria para outra pasta. */
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmar();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelado.current = true;
          aoCancelar();
        }
        /* As setas pertencem ao campo enquanto ele existe — sem parar aqui, a
           árvore ao redor navegaria de item enquanto se move o cursor no texto. */
        e.stopPropagation();
      }}
    />
  );
}
