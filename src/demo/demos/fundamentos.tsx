import { camadas, cores, curvas, formas, tempos, tipografia, usarTema } from "../../lib";
import { Bancada } from "../pecas";

/*
  ⭐ **Esta página não tem uma lista própria de tokens.** Ela percorre o objeto
  gerado de `tokens.json` — então um token novo aparece aqui sozinho, e um token
  removido some. Uma galeria de design system que mantém a própria cópia da
  paleta começa a mentir na primeira mudança que alguém esquece de replicar.

  A amostra é pintada com a variável CSS (o que a web realmente mostra) e o
  valor escrito ao lado vem do TypeScript (o que o mobile receberia). Ver os
  dois lado a lado é o que denuncia uma conversão OKLCH→sRGB torta.
*/

const GRUPOS_DE_COR: readonly { titulo: string; chaves: readonly string[] }[] = [
  { titulo: "Superfícies", chaves: ["fundo", "superficie", "flutuante", "abafado", "campoFundo"] },
  { titulo: "Moldura", chaves: ["moldura", "molduraAlta", "molduraBorda", "realce"] },
  { titulo: "Texto", chaves: ["texto", "textoRotulo", "textoSuave", "textoTenue"] },
  { titulo: "Traços", chaves: ["borda", "contorno"] },
  { titulo: "Acento e foco", chaves: ["acento", "acentoTexto", "acentoBorda", "acentoPlaceholder", "foco"] },
  { titulo: "Derivados", chaves: ["acento9", "acento14", "acento60", "anelFoco", "scrollPolegar", "scrollPolegarForte"] },
];

/**
 * `acentoTexto` → `--cui-acento-texto`. O gerador faz o caminho inverso.
 *
 * ⚠️ `\d+` e não `\d`: um dígito de cada vez transformaria `acento14` em
 * `--cui-acento-1-4`, uma variável que não existe — e a amostra sairia
 * transparente sem erro nenhum no console.
 */
const paraVariavel = (chave: string) =>
  `--cui-${chave.replace(/[A-Z]|\d+/g, (c) => "-" + c.toLowerCase())}`;

export function DemoDosFundamentos() {
  const { efetivo } = usarTema();
  const paleta = cores[efetivo] as Record<string, string>;

  return (
    <>
      {GRUPOS_DE_COR.map((grupo) => (
        <Bancada key={grupo.titulo} titulo={grupo.titulo}>
          <div className="fund-paleta">
            {grupo.chaves.map((chave) => (
              <div key={chave} className="fund-cor">
                {/*
                  O xadrez atrás da amostra é o que torna a transparência
                  visível: um `acento9` sobre fundo sólido parece apenas uma cor
                  clara, e não se vê que ele é 9% de alguma coisa.
                */}
                <span className="fund-cor__amostra" aria-hidden="true">
                  <span style={{ background: `var(${paraVariavel(chave)})` }} />
                </span>
                <span className="fund-cor__nome">{paraVariavel(chave)}</span>
                <code className="fund-cor__valor">{paleta[chave] ?? "—"}</code>
              </div>
            ))}
          </div>
        </Bancada>
      ))}

      <Bancada
        titulo="Formas"
        apoio="Em número, não em string: na web some o px, no React Native é o que ele espera."
      >
        <ul className="fund-lista">
          {Object.entries(formas).map(([nome, valor]) => (
            <li key={nome}>
              <span className="fund-lista__nome">{nome}</span>
              <code className="fund-lista__valor">{valor}</code>
            </li>
          ))}
        </ul>
      </Bancada>

      <Bancada
        titulo="Tipografia e camadas"
        apoio="Pesos e z-index saem sem unidade — 600px num font-weight é um erro que o CSS engole calado."
      >
        <ul className="fund-lista">
          {/* Os dois grupos vêm de objetos `as const` distintos, então o
              espalhamento perde o tipo comum — a anotação o devolve. */}
          {Object.entries<number>({ ...tipografia, ...camadas }).map(([nome, valor]) => (
            <li key={nome}>
              <span className="fund-lista__nome">{nome}</span>
              <code className="fund-lista__valor">{valor}</code>
            </li>
          ))}
        </ul>
      </Bancada>

      <Bancada
        titulo="Curvas"
        apoio="Passe o ponteiro para ver cada curva mover o quadrado. Como tupla, elas vão direto para Easing.bezier no RN."
      >
        <div className="fund-curvas">
          {Object.entries(curvas).map(([nome, b]) => (
            <div
              key={nome}
              className="fund-curva"
              style={{ ["--curva" as string]: `cubic-bezier(${b.join(",")})` }}
            >
              <span className="fund-curva__nome">{nome}</span>
              <span className="fund-curva__trilho">
                <span className="fund-curva__bola" />
              </span>
              <code className="fund-curva__valor">{b.join(", ")}</code>
            </div>
          ))}
        </div>
      </Bancada>

      <Bancada
        titulo="Coreografia"
        apoio="Lidos ao mesmo tempo pelo CSS (entrada) e pelo JavaScript (saída), do mesmo JSON."
      >
        <ul className="fund-lista">
          {Object.entries(tempos).map(([nome, ms]) => (
            <li key={nome}>
              <span className="fund-lista__nome">{nome}</span>
              <code className="fund-lista__valor">{ms}ms</code>
            </li>
          ))}
        </ul>
      </Bancada>
    </>
  );
}
