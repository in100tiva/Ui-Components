/**
 * **A PORTA do gerenciador** — o único ponto por onde a interface fala com
 * quem guarda os dados.
 *
 * ⭐ **Este arquivo é o que torna a página replicável.** Nenhum componente sabe
 * se os dados vêm de um `fetch`, de um banco local ou de um array em memória:
 * todos falam com um `RepositorioDeArquivos`. Trocar de back-end é escrever
 * outra implementação desta interface e passá-la por prop — sem tocar em nada
 * do que desenha.
 *
 * ⚠️ **Todos os métodos são assíncronos, inclusive na versão em memória.** Uma
 * porta síncrona parece mais simples até o dia da troca: aí cada chamada vira
 * `await` e toda a interface descobre, de uma vez, que precisa de estado de
 * carregando, de erro e de rollback. Assíncrono desde o começo é o que faz o
 * back-end real entrar sem reescrever a tela.
 */

import type { Acervo, Arquivo, Pasta } from "./tipos";

export interface RepositorioDeArquivos {
  /** O acervo inteiro. É o que a página pede ao montar. */
  listar(): Promise<Acervo>;

  criarPasta(entrada: { nome: string; paiId: string | null }): Promise<Pasta>;
  renomearPasta(id: string, nome: string): Promise<void>;
  /**
   * ⚠️ O contrato é: a pasta some COM tudo que está dentro dela. Quem quiser
   * lixeira ou promoção do conteúdo para o pai implementa isso aqui — é
   * decisão de produto, não da interface.
   */
  excluirPasta(id: string): Promise<void>;
  moverPasta(id: string, paiId: string | null): Promise<void>;

  /** Move em LOTE: um arrasto move um, uma seleção move vinte, mesma chamada. */
  moverArquivos(ids: readonly string[], pastaId: string | null): Promise<void>;
  renomearArquivo(id: string, nome: string): Promise<void>;
  excluirArquivos(ids: readonly string[]): Promise<void>;
}

/* ══════════════════════════════════════════════════════════════════════════
   Implementação em memória — a que a demonstração usa
   ══════════════════════════════════════════════════════════════════════════ */

export type OpcoesEmMemoria = {
  /**
   * Latência simulada, em ms.
   *
   * ⭐ Não é enfeite de demonstração: com zero, uma interface que só atualiza
   * DEPOIS da resposta parece instantânea e ninguém percebe que ela não é
   * otimista. Com 300ms, a diferença aparece na hora — e é a mesma diferença
   * que o servidor real vai mostrar.
   */
  atraso?: number;
  /**
   * Faz uma operação falhar, para exercitar o caminho de erro.
   * Recebe o nome do método (`"moverArquivos"`, `"excluirPasta"`…).
   */
  simularFalha?: (operacao: string) => boolean;
};

export function criarRepositorioEmMemoria(
  inicial: Acervo,
  opcoes: OpcoesEmMemoria = {},
): RepositorioDeArquivos {
  /* Cópia: o acervo inicial costuma ser uma constante de módulo, e mutá-la faria
     a segunda montagem da página começar do estado da primeira. */
  let pastas: Pasta[] = inicial.pastas.map((p) => ({ ...p }));
  let arquivos: Arquivo[] = inicial.arquivos.map((a) => ({ ...a }));
  let sequencia = 0;

  const responder = async <T>(operacao: string, resultado: () => T): Promise<T> => {
    if (opcoes.atraso) await new Promise((r) => setTimeout(r, opcoes.atraso));
    if (opcoes.simularFalha?.(operacao)) {
      throw new Error(`Falha simulada em ${operacao}.`);
    }
    return resultado();
  };

  /** Ela e tudo abaixo dela — a mesma varredura de `subarvoreDe`, do lado do dado. */
  const subarvore = (id: string): Set<string> => {
    const dentro = new Set([id]);
    let cresceu = true;
    while (cresceu) {
      cresceu = false;
      for (const pasta of pastas) {
        if (pasta.paiId && dentro.has(pasta.paiId) && !dentro.has(pasta.id)) {
          dentro.add(pasta.id);
          cresceu = true;
        }
      }
    }
    return dentro;
  };

  return {
    listar: () =>
      responder("listar", () => ({
        pastas: pastas.map((p) => ({ ...p })),
        arquivos: arquivos.map((a) => ({ ...a })),
      })),

    criarPasta: (entrada) =>
      responder("criarPasta", () => {
        const nova: Pasta = {
          id: `pasta-${Date.now()}-${sequencia++}`,
          nome: entrada.nome,
          paiId: entrada.paiId,
        };
        pastas = [...pastas, nova];
        return { ...nova };
      }),

    renomearPasta: (id, nome) =>
      responder("renomearPasta", () => {
        pastas = pastas.map((p) => (p.id === id ? { ...p, nome } : p));
      }),

    excluirPasta: (id) =>
      responder("excluirPasta", () => {
        const dentro = subarvore(id);
        pastas = pastas.filter((p) => !dentro.has(p.id));
        arquivos = arquivos.filter((a) => !(a.pastaId && dentro.has(a.pastaId)));
      }),

    moverPasta: (id, paiId) =>
      responder("moverPasta", () => {
        pastas = pastas.map((p) => (p.id === id ? { ...p, paiId } : p));
      }),

    moverArquivos: (ids, pastaId) =>
      responder("moverArquivos", () => {
        const conjunto = new Set(ids);
        arquivos = arquivos.map((a) => (conjunto.has(a.id) ? { ...a, pastaId } : a));
      }),

    renomearArquivo: (id, nome) =>
      responder("renomearArquivo", () => {
        arquivos = arquivos.map((a) => (a.id === id ? { ...a, nome } : a));
      }),

    excluirArquivos: (ids) =>
      responder("excluirArquivos", () => {
        const conjunto = new Set(ids);
        arquivos = arquivos.filter((a) => !conjunto.has(a.id));
      }),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   Implementação HTTP — o esqueleto do back-end real
   ══════════════════════════════════════════════════════════════════════════ */

export type OpcoesHttp = {
  /** Base da API, sem barra no fim: `"/api/arquivos"`. */
  base: string;
  /** Injetável para teste, e para quem usa um cliente com token embutido. */
  buscar?: typeof fetch;
  /** Cabeçalhos extras — `Authorization`, por exemplo. */
  cabecalhos?: () => Record<string, string> | Promise<Record<string, string>>;
};

/**
 * A mesma porta, falando REST.
 *
 * ⭐ **Está aqui como ESQUELETO, não como cliente universal**: os caminhos e os
 * verbos abaixo são uma convenção razoável, e a chance de casarem com a API que
 * você já tem é pequena. Ajuste as seis linhas de rota — é literalmente para
 * isso que este arquivo existe, e a interface não muda uma vírgula.
 *
 * ```
 * GET    {base}                    → { pastas, arquivos }
 * POST   {base}/pastas             → Pasta
 * PATCH  {base}/pastas/:id         → { nome? , paiId? }
 * DELETE {base}/pastas/:id
 * PATCH  {base}/arquivos           → { ids, pastaId }   (mover em lote)
 * PATCH  {base}/arquivos/:id       → { nome }
 * DELETE {base}/arquivos           → { ids }
 * ```
 */
export function criarRepositorioHttp(opcoes: OpcoesHttp): RepositorioDeArquivos {
  const buscar = opcoes.buscar ?? fetch;

  const pedir = async <T>(
    caminho: string,
    init?: { metodo?: string; corpo?: unknown },
  ): Promise<T> => {
    const extras = (await opcoes.cabecalhos?.()) ?? {};
    const resposta = await buscar(`${opcoes.base}${caminho}`, {
      method: init?.metodo ?? "GET",
      headers: { "content-type": "application/json", ...extras },
      body: init?.corpo === undefined ? undefined : JSON.stringify(init.corpo),
    });

    /* ⛔ `fetch` não rejeita em 404 nem em 500 — ele resolve com `ok: false`.
       Sem esta checagem, um erro do servidor chegaria à interface como um
       `undefined` silencioso, e a tela apagaria o acervo sem dizer por quê. */
    if (!resposta.ok) {
      throw new Error(`${resposta.status} em ${caminho}: ${await resposta.text()}`);
    }
    /* 204 não tem corpo, e `.json()` de corpo vazio lança. */
    return resposta.status === 204 ? (undefined as T) : ((await resposta.json()) as T);
  };

  return {
    listar: () => pedir<Acervo>(""),
    criarPasta: (entrada) =>
      pedir<Pasta>("/pastas", { metodo: "POST", corpo: entrada }),
    renomearPasta: (id, nome) =>
      pedir<void>(`/pastas/${encodeURIComponent(id)}`, {
        metodo: "PATCH",
        corpo: { nome },
      }),
    excluirPasta: (id) =>
      pedir<void>(`/pastas/${encodeURIComponent(id)}`, { metodo: "DELETE" }),
    moverPasta: (id, paiId) =>
      pedir<void>(`/pastas/${encodeURIComponent(id)}`, {
        metodo: "PATCH",
        corpo: { paiId },
      }),
    moverArquivos: (ids, pastaId) =>
      pedir<void>("/arquivos", { metodo: "PATCH", corpo: { ids, pastaId } }),
    renomearArquivo: (id, nome) =>
      pedir<void>(`/arquivos/${encodeURIComponent(id)}`, {
        metodo: "PATCH",
        corpo: { nome },
      }),
    excluirArquivos: (ids) =>
      pedir<void>("/arquivos", { metodo: "DELETE", corpo: { ids } }),
  };
}
