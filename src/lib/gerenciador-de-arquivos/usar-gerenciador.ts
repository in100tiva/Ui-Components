"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  arquivosDaPasta,
  buscar,
  caminhoAte,
  contarArquivos,
  etiquetasDe,
  montarArvore,
  nomeDisponivel,
  pastasFilhas,
  podeMoverPasta,
} from "./modelo";
import type { RepositorioDeArquivos } from "./repositorio";
import type { Acervo, Arquivo, Pasta } from "./tipos";

/** Onde o campo de renomear está aberto — a árvore, a grade ou a lista. */
export type OrigemDaEdicao = "arvore" | "grade" | "lista";

export type EdicaoDeNome = { id: string; origem: OrigemDaEdicao };

/**
 * **O cérebro do gerenciador.** Estado, navegação e as ações — e nenhum pixel.
 *
 * ⭐ **A divisão é esta: o hook decide, os componentes desenham.** Nenhum
 * componente da página guarda estado de dados; todos recebem o que mostrar e
 * chamam a ação correspondente. É o que permite trocar a tela inteira sem
 * reescrever regra, e trocar o back-end sem tocar em componente nenhum.
 *
 * ⭐ **Toda ação é OTIMISTA.** A tela muda no gesto e a chamada acontece atrás.
 * Esperar a resposta para mover um arquivo transforma um arrasto de 200ms numa
 * espera de meio segundo com o arquivo pendurado no lugar antigo — e é o tipo de
 * lentidão que faz a pessoa arrastar de novo, achando que falhou.
 */
export function usarGerenciadorDeArquivos(repositorio: RepositorioDeArquivos) {
  const [acervo, setAcervo] = useState<Acervo>({ pastas: [], arquivos: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [pastaAtualId, setPastaAtualId] = useState<string | null>(null);
  const [expandidas, setExpandidas] = useState<ReadonlySet<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [etiquetaAtiva, setEtiquetaAtiva] = useState<string | null>(null);
  /**
   * Qual item está com o nome em edição, **e em qual lista**.
   *
   * ⛔ **A origem não é enfeite, é o conserto de um defeito real.** A mesma
   * pasta aparece na árvore E na grade ao mesmo tempo; com um `emEdicao` que
   * guardava só o id, os dois lugares montavam um campo de texto para ela. O
   * segundo a montar roubava o foco do primeiro, o primeiro disparava `blur`,
   * e o `blur` fechava a edição — criar uma pasta abria o campo e ele sumia no
   * mesmo quadro, sem erro nenhum no console. Um item é editado num lugar de
   * cada vez, e o estado precisa dizer qual.
   */
  const [emEdicao, setEmEdicao] = useState<EdicaoDeNome | null>(null);

  const sequencia = useRef(0);

  /* O acervo mais recente, para as ações não dependerem de closure velha. */
  const acervoRef = useRef(acervo);
  acervoRef.current = acervo;

  /* --- Carga ------------------------------------------------------------ */

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      setAcervo(await repositorio.listar());
      setErro(null);
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setCarregando(false);
    }
  }, [repositorio]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const carregado = await repositorio.listar();
        /* ⛔ Sem esta trava, desmontar a página no meio da primeira carga
           escreve estado num componente que já saiu — e o React avisa no
           console, que é onde defeito silencioso costuma nascer. */
        if (vivo) {
          setAcervo(carregado);
          setErro(null);
        }
      } catch (e) {
        if (vivo) setErro(mensagem(e));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [repositorio]);

  /**
   * Aplica a mudança na tela, chama o repositório e desfaz se ele recusar.
   *
   * ⚠️ **O rollback volta ao instantâneo de antes da ação** — simples e sempre
   * disponível, inclusive com o servidor fora do ar. O teto conhecido: duas
   * ações em voo ao mesmo tempo, e a que falhar desfaz a outra junto. Quando
   * isso importar (upload em lote, edição colaborativa), o upgrade é trocar
   * este `setAcervo(anterior)` por um `recarregar()` — a verdade passa a vir do
   * servidor, ao custo de uma ida a mais.
   */
  const otimista = useCallback(
    async (
      transformar: (acervo: Acervo) => Acervo,
      executar: () => Promise<void>,
    ): Promise<boolean> => {
      const anterior = acervoRef.current;
      const proximo = transformar(anterior);
      setAcervo(proximo);
      acervoRef.current = proximo;

      try {
        await executar();
        return true;
      } catch (e) {
        setAcervo(anterior);
        acervoRef.current = anterior;
        setErro(mensagem(e));
        return false;
      }
    },
    [],
  );

  /* --- Navegação -------------------------------------------------------- */

  const abrirPasta = useCallback(
    (id: string | null) => {
      setPastaAtualId(id);
      setEtiquetaAtiva(null);
      if (!id) return;
      /* Abrir uma pasta funda pela grade tem de abrir o ramo dela na árvore —
         senão o item selecionado fica escondido dentro de um nó fechado. */
      const ancestrais = caminhoAte(acervoRef.current.pastas, id).map((p) => p.id);
      setExpandidas((atuais) => new Set([...atuais, ...ancestrais]));
    },
    [],
  );

  const alternarExpansao = useCallback((id: string) => {
    setExpandidas((atuais) => {
      const proximo = new Set(atuais);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }, []);

  /* --- Ações sobre pastas ------------------------------------------------ */

  const criarPasta = useCallback(
    async (paiId: string | null, origem: OrigemDaEdicao = "grade") => {
      const nome = nomeDisponivel(acervoRef.current.pastas, paiId, "Nova pasta");
      const provisoria: Pasta = {
        id: `provisoria-${sequencia.current++}`,
        nome,
        paiId,
      };

      /* Ela aparece na hora e JÁ ENTRA em edição de nome: criar uma pasta é
         quase sempre o primeiro passo de "batizar uma pasta", e obrigar um
         segundo clique para renomear é atrito puro. */
      setAcervo((a) => ({ ...a, pastas: [...a.pastas, provisoria] }));
      if (paiId) setExpandidas((atuais) => new Set([...atuais, paiId]));
      setEmEdicao({ id: provisoria.id, origem });

      try {
        const criada = await repositorio.criarPasta({ nome, paiId });
        /* ⛔ Trocar o id provisório pelo real, e não só acrescentar: sem isto,
           renomear em seguida chamaria o servidor com um id que ele nunca viu. */
        setAcervo((a) => ({
          ...a,
          pastas: a.pastas.map((p) => (p.id === provisoria.id ? criada : p)),
        }));
        setEmEdicao((atual) => (atual?.id === provisoria.id ? { id: criada.id, origem } : atual));
        return criada;
      } catch (e) {
        setAcervo((a) => ({
          ...a,
          pastas: a.pastas.filter((p) => p.id !== provisoria.id),
        }));
        setEmEdicao((atual) => (atual?.id === provisoria.id ? null : atual));
        setErro(mensagem(e));
        return null;
      }
    },
    [repositorio],
  );

  const renomearPasta = useCallback(
    (id: string, nome: string) => {
      const limpo = nome.trim();
      if (!limpo) return Promise.resolve(false);
      return otimista(
        (a) => ({ ...a, pastas: a.pastas.map((p) => (p.id === id ? { ...p, nome: limpo } : p)) }),
        () => repositorio.renomearPasta(id, limpo),
      );
    },
    [otimista, repositorio],
  );

  const excluirPasta = useCallback(
    (id: string) => {
      const dentro = new Set([id]);
      let cresceu = true;
      while (cresceu) {
        cresceu = false;
        for (const pasta of acervoRef.current.pastas) {
          if (pasta.paiId && dentro.has(pasta.paiId) && !dentro.has(pasta.id)) {
            dentro.add(pasta.id);
            cresceu = true;
          }
        }
      }

      /* Sair de dentro do que foi excluído ANTES de excluir: senão a tela fica
         apontando para uma pasta que não existe mais e mostra um vazio sem
         explicação. */
      if (pastaAtualId && dentro.has(pastaAtualId)) {
        const pasta = acervoRef.current.pastas.find((p) => p.id === id);
        setPastaAtualId(pasta?.paiId ?? null);
      }

      return otimista(
        (a) => ({
          pastas: a.pastas.filter((p) => !dentro.has(p.id)),
          arquivos: a.arquivos.filter((f) => !(f.pastaId && dentro.has(f.pastaId))),
        }),
        () => repositorio.excluirPasta(id),
      );
    },
    [otimista, pastaAtualId, repositorio],
  );

  const moverPasta = useCallback(
    (id: string, destinoId: string | null) => {
      /* A regra mora no modelo, e é consultada aqui — não reescrita. */
      if (!podeMoverPasta(acervoRef.current.pastas, id, destinoId)) {
        return Promise.resolve(false);
      }
      return otimista(
        (a) => ({
          ...a,
          pastas: a.pastas.map((p) => (p.id === id ? { ...p, paiId: destinoId } : p)),
        }),
        () => repositorio.moverPasta(id, destinoId),
      );
    },
    [otimista, repositorio],
  );

  /* --- Ações sobre arquivos ---------------------------------------------- */

  const moverArquivos = useCallback(
    (ids: readonly string[], pastaId: string | null) => {
      const conjunto = new Set(ids);
      const mudam = acervoRef.current.arquivos.filter(
        (a) => conjunto.has(a.id) && a.pastaId !== pastaId,
      );
      if (mudam.length === 0) return Promise.resolve(false);

      return otimista(
        (a) => ({
          ...a,
          arquivos: a.arquivos.map((f) => (conjunto.has(f.id) ? { ...f, pastaId } : f)),
        }),
        () => repositorio.moverArquivos(ids, pastaId),
      );
    },
    [otimista, repositorio],
  );

  const renomearArquivo = useCallback(
    (id: string, nome: string) => {
      const limpo = nome.trim();
      if (!limpo) return Promise.resolve(false);
      return otimista(
        (a) => ({
          ...a,
          arquivos: a.arquivos.map((f) => (f.id === id ? { ...f, nome: limpo } : f)),
        }),
        () => repositorio.renomearArquivo(id, limpo),
      );
    },
    [otimista, repositorio],
  );

  const excluirArquivos = useCallback(
    (ids: readonly string[]) => {
      const conjunto = new Set(ids);
      return otimista(
        (a) => ({ ...a, arquivos: a.arquivos.filter((f) => !conjunto.has(f.id)) }),
        () => repositorio.excluirArquivos(ids),
      );
    },
    [otimista, repositorio],
  );

  /* --- O que a tela consome ---------------------------------------------- */

  /*
    Tudo abaixo é DERIVADO — nada aqui é guardado em estado. Uma cópia do
    "arquivos da pasta atual" em `useState` é a maneira mais confiável de a tela
    passar a mostrar uma coisa e os dados serem outra.
  */
  const filtrado = useMemo(() => buscar(acervo, busca), [acervo, busca]);
  const arvore = useMemo(() => montarArvore(filtrado.pastas), [filtrado.pastas]);
  const etiquetas = useMemo(() => etiquetasDe(acervo.arquivos), [acervo.arquivos]);
  const caminho = useMemo(
    () => caminhoAte(acervo.pastas, pastaAtualId),
    [acervo.pastas, pastaAtualId],
  );

  const subpastas = useMemo(
    () => pastasFilhas(filtrado.pastas, pastaAtualId),
    [filtrado.pastas, pastaAtualId],
  );

  const arquivosVisiveis: readonly Arquivo[] = useMemo(() => {
    if (etiquetaAtiva) {
      return acervo.arquivos.filter((a) => (a.etiquetas ?? []).includes(etiquetaAtiva));
    }
    /* Buscando, a lista deixa de ser "o que está nesta pasta" e passa a ser "o
       que casou" — em qualquer lugar do acervo. Filtrar pela pasta atual aqui
       faria a busca não achar nada na maior parte das vezes. */
    if (busca.trim()) return filtrado.arquivos;
    return arquivosDaPasta(acervo.arquivos, pastaAtualId);
  }, [acervo.arquivos, busca, etiquetaAtiva, filtrado.arquivos, pastaAtualId]);

  const contarNaPasta = useCallback(
    (id: string | null) => contarArquivos(acervo.arquivos, id),
    [acervo.arquivos],
  );

  return {
    /* estado */
    acervo,
    carregando,
    erro,
    limparErro: useCallback(() => setErro(null), []),
    recarregar,

    /* navegação */
    pastaAtualId,
    abrirPasta,
    caminho,
    expandidas,
    alternarExpansao,
    busca,
    setBusca,
    etiquetaAtiva,
    setEtiquetaAtiva,
    emEdicao,
    setEmEdicao,

    /* derivados */
    arvore,
    subpastas,
    arquivosVisiveis,
    etiquetas,
    contarNaPasta,

    /* ações */
    criarPasta,
    renomearPasta,
    excluirPasta,
    moverPasta,
    moverArquivos,
    renomearArquivo,
    excluirArquivos,
  };
}

export type Gerenciador = ReturnType<typeof usarGerenciadorDeArquivos>;

/** Erro de rede não é `Error` em todo navegador — e `[object Object]` na tela
 *  não ajuda ninguém a entender o que aconteceu. */
function mensagem(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  return typeof erro === "string" ? erro : "Não foi possível concluir a operação.";
}
