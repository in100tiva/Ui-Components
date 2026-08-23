/**
 * **As contas do gerenciador** — funções puras, sem React e sem DOM.
 *
 * ⭐ Todas as regras que decidem alguma coisa moram aqui: quem é filho de quem,
 * o que pode ser movido para onde, o que a busca acha. Ficam separadas por um
 * motivo prático — regra dentro de componente só é testável montando a tela, e
 * a mais importante delas (mover uma pasta para dentro de si mesma) é
 * justamente a que ninguém consegue clicar de propósito para conferir.
 */

/* Reusada, não recriada: é a mesma normalização que a busca do menu suspenso
   usa, e duas implementações de "texto comparável" no mesmo projeto é como
   "março" passa a ser encontrado num lugar e não no outro. */
import { normalizar } from "../menu-suspenso/filtrar-opcoes";

import type { Acervo, Arquivo, NoDaArvore, Pasta } from "./tipos";

export { normalizar };

/** Monta a árvore a partir da lista plana, preservando a ordem de entrada. */
export function montarArvore(pastas: readonly Pasta[]): NoDaArvore[] {
  const porPai = new Map<string | null, Pasta[]>();
  for (const pasta of pastas) {
    const lista = porPai.get(pasta.paiId);
    if (lista) lista.push(pasta);
    else porPai.set(pasta.paiId, [pasta]);
  }

  const construir = (paiId: string | null, nivel: number): NoDaArvore[] =>
    (porPai.get(paiId) ?? []).map((pasta) => ({
      pasta,
      nivel,
      filhos: construir(pasta.id, nivel + 1),
    }));

  return construir(null, 0);
}

/**
 * O caminho da raiz até a pasta — o que a trilha de navegação mostra.
 *
 * ⚠️ O laço tem trava de segurança: um ciclo em `paiId` (que um back-end pode
 * devolver depois de uma migração malfeita) travaria a aba do navegador, e um
 * congelamento é muito mais caro de diagnosticar que um caminho truncado.
 */
export function caminhoAte(pastas: readonly Pasta[], id: string | null): Pasta[] {
  const porId = new Map(pastas.map((p) => [p.id, p]));
  const caminho: Pasta[] = [];
  let atual = id ? porId.get(id) : undefined;

  while (atual && caminho.length <= pastas.length) {
    caminho.unshift(atual);
    atual = atual.paiId ? porId.get(atual.paiId) : undefined;
  }
  return caminho;
}

/** Todos os descendentes de uma pasta, ela inclusa. */
export function subarvoreDe(pastas: readonly Pasta[], id: string): Set<string> {
  const dentro = new Set([id]);
  /* Varre até estabilizar: a lista plana não garante que o pai venha antes do
     filho, e uma passada só perderia netos. */
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
}

/**
 * ⛔ **A regra que impede a árvore de se comer.** Mover uma pasta para dentro
 * de si mesma — ou de qualquer descendente dela — desliga o ramo inteiro da
 * raiz: ele continua existindo no banco e some da tela, porque não há mais
 * caminho até ele. É o pior tipo de perda de dados, a que não parece uma.
 */
export function podeMoverPasta(
  pastas: readonly Pasta[],
  id: string,
  destinoId: string | null,
): boolean {
  if (id === destinoId) return false;

  const pasta = pastas.find((p) => p.id === id);
  if (!pasta) return false;

  /* Já está lá: mover não é erro, mas também não é operação. */
  if (pasta.paiId === destinoId) return false;
  if (destinoId === null) return true;

  return !subarvoreDe(pastas, id).has(destinoId);
}

/** Quantos arquivos estão DIRETAMENTE na pasta. */
export function contarArquivos(
  arquivos: readonly Arquivo[],
  pastaId: string | null,
): number {
  return arquivos.reduce((total, a) => (a.pastaId === pastaId ? total + 1 : total), 0);
}

/**
 * ⚠️ **A contagem é DIRETA, não recursiva**, e a diferença precisa ser dita.
 * Uma pasta que mostra "18" somando netos, com três filhas mostrando "3", "5" e
 * "10", faz a pessoa procurar dezoito arquivos numa lista onde só existem três.
 * O número ao lado do nome responde "quantos vou ver se eu abrir isto".
 */
export function arquivosDaPasta(
  arquivos: readonly Arquivo[],
  pastaId: string | null,
): Arquivo[] {
  return arquivos.filter((a) => a.pastaId === pastaId);
}

export function pastasFilhas(pastas: readonly Pasta[], paiId: string | null): Pasta[] {
  return pastas.filter((p) => p.paiId === paiId);
}

/**
 * A busca varre pastas E arquivos, e devolve os dois — uma caixa de busca que
 * só acha pasta obriga a abrir pasta por pasta para achar um arquivo, que é
 * exatamente o trabalho que ela existe para evitar.
 */
export function buscar(acervo: Acervo, termo: string): Acervo {
  const alvo = normalizar(termo);
  if (!alvo) return acervo;

  const arquivos = acervo.arquivos.filter(
    (a) =>
      normalizar(a.nome).includes(alvo) ||
      (a.etiquetas ?? []).some((e) => normalizar(e).includes(alvo)),
  );

  /* Uma pasta entra no resultado se o nome dela casa OU se ela contém algo que
     casou — senão o arquivo encontrado apareceria sem o lugar onde ele está. */
  const comAchado = new Set(arquivos.map((a) => a.pastaId).filter(Boolean) as string[]);
  const pastas = acervo.pastas.filter(
    (p) => normalizar(p.nome).includes(alvo) || comAchado.has(p.id),
  );

  return { pastas, arquivos };
}

export type Etiqueta = { nome: string; contagem: number };

/** As etiquetas do acervo, da mais usada para a menos usada. */
export function etiquetasDe(arquivos: readonly Arquivo[]): Etiqueta[] {
  const contagem = new Map<string, number>();
  for (const arquivo of arquivos) {
    for (const etiqueta of arquivo.etiquetas ?? []) {
      contagem.set(etiqueta, (contagem.get(etiqueta) ?? 0) + 1);
    }
  }
  return [...contagem]
    .map(([nome, total]) => ({ nome, contagem: total }))
    .sort((a, b) => b.contagem - a.contagem || a.nome.localeCompare(b.nome));
}

/**
 * Um nome que não colide com os irmãos: "Nova pasta", "Nova pasta 2"…
 *
 * Sem isto, criar duas pastas seguidas deixa duas "Nova pasta" lado a lado — e
 * a segunda parece que não foi criada.
 */
export function nomeDisponivel(
  pastas: readonly Pasta[],
  paiId: string | null,
  base: string,
): string {
  const usados = new Set(
    pastas.filter((p) => p.paiId === paiId).map((p) => normalizar(p.nome)),
  );
  if (!usados.has(normalizar(base))) return base;

  for (let n = 2; n < 1000; n++) {
    const tentativa = `${base} ${n}`;
    if (!usados.has(normalizar(tentativa))) return tentativa;
  }
  return base;
}

/** Bytes em algo legível. `undefined` vira travessão — não "0 B", que mente. */
export function formatarTamanho(bytes: number | undefined): string {
  if (bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const unidades = ["KB", "MB", "GB", "TB"];
  let valor = bytes / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  return `${valor.toFixed(valor < 10 ? 1 : 0)} ${unidades[i]}`;
}

/** "12 de março de 2026" no formato curto do local do navegador. */
export function formatarData(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
