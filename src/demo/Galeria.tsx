import { useEffect, useState } from "react";

import { CamadaDeFundo, Casca, MenuSuspenso, NavegacaoLateral, usarTema } from "../lib";
import { REGISTRO, acharEntrada, gruposDoRegistro } from "./registro";

import "./galeria.css";

const GRUPOS = gruposDoRegistro();
const PRIMEIRO = REGISTRO[0]?.id ?? null;

/** O id que está no hash da URL, se for um componente que existe. */
function idDoHash(): string | null {
  const cru = location.hash.replace(/^#/, "");
  return acharEntrada(cru) ? cru : null;
}

/**
 * **A galeria** — a coluna lista os componentes, o cartão central mostra um.
 *
 * ⭐ **A seleção mora no HASH da URL, não em `useState` puro.** Assim um
 * componente tem endereço: `#menu-suspenso` pode ser colado num chat, recarregar
 * a página não devolve a pessoa para o começo, e o botão Voltar do navegador
 * funciona como qualquer um espera. É o mínimo de roteamento que uma galeria
 * precisa — e não custa um router.
 */
export function Galeria() {
  const { efetivo, alternar } = usarTema();
  const [id, setId] = useState<string | null>(null);

  /* A leitura inicial fica no efeito, e não no `useState`: `location` não existe
     em SSR, e ler ali quebraria a galeria no dia em que ela virar página Next. */
  useEffect(() => {
    setId(idDoHash() ?? PRIMEIRO);

    /* Voltar/avançar do navegador troca o hash sem passar por `escolher`. */
    const aoTrocarHash = () => setId(idDoHash() ?? PRIMEIRO);
    addEventListener("hashchange", aoTrocarHash);
    return () => removeEventListener("hashchange", aoTrocarHash);
  }, []);

  function escolher(novo: string) {
    /* Escrever no hash dispara `hashchange`, que atualiza o estado — uma via só,
       em vez de o estado e a URL se atualizarem em paralelo e discordarem. */
    location.hash = novo;
  }

  const entrada = acharEntrada(id);

  return (
    <Casca
      fundo={<CamadaDeFundo />}
      marca={<Marca />}
      lateral={
        <NavegacaoLateral
          grupos={GRUPOS}
          ativo={id}
          aoEscolher={escolher}
          rotulo="Componentes"
        />
      }
      rodapeLateral={
        <button
          type="button"
          onClick={alternar}
          className="galeria__tema"
          aria-label={`Mudar para o tema ${efetivo === "escuro" ? "claro" : "escuro"}`}
        >
          {efetivo === "escuro" ? <IconeSol /> : <IconeLua />}
          <span>Tema {efetivo === "escuro" ? "claro" : "escuro"}</span>
        </button>
      }
    >
      {/*
        Abaixo do breakpoint a coluna some, e a galeria escolhe o componente por
        um MenuSuspenso — o próprio componente da biblioteca fazendo o trabalho.
        Um controle a menos para manter, e a garantia de que ele é usável de
        verdade: se o menu quebrar no celular, a galeria quebra junto.
      */}
      <div className="galeria__seletor-movel">
        <MenuSuspenso
          valor={id}
          opcoes={REGISTRO.map((e) => ({ valor: e.id, rotulo: e.nome }))}
          placeholder="Escolha um componente"
          rotulo="Componente"
          aoSelecionar={escolher}
        />
      </div>

      {entrada ? (
        <article>
          <header className="galeria__cabecalho">
            <p className="galeria__olho">{entrada.grupo}</p>
            <h1 className="galeria__titulo">{entrada.nome}</h1>
            <p className="galeria__resumo">{entrada.resumo}</p>
          </header>

          <entrada.Demo />
        </article>
      ) : (
        <p className="galeria__vazio">Nenhum componente no registro ainda.</p>
      )}
    </Casca>
  );
}

function Marca() {
  return (
    <div className="galeria__marca">
      <span aria-hidden="true" className="galeria__selo" />
      <span className="galeria__marca-texto">
        <strong>Componentes</strong>
        <small>UI</small>
      </span>
    </div>
  );
}

function IconeSol() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
