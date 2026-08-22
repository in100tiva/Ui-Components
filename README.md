# Componentes-UI

Biblioteca de componentes React + TypeScript com design próprio, extraída do
projeto **Processual** e reescrita para ser copiável para qualquer projeto.

## Princípio de portabilidade

**Zero dependência de runtime além do React.** Sem Tailwind, sem Radix, sem
lucide, sem biblioteca de posicionamento. Um componente é uma pasta: os `.tsx`,
o `.css` e nada mais. Cai em Next, Vite ou CRA sem configurar nada.

O que viaja junto é **um arquivo**: `tokens/tokens.json`. Dele saem as três
camadas do design — ver *Tokens* abaixo.

## Rodar a vitrine

```bash
pnpm install
pnpm dev      # gera os tokens e sobe em http://localhost:5199
pnpm tokens   # só regenera os tokens
```

## Tokens: uma fonte, três camadas

`tokens/tokens.json` é o **único** arquivo de design que se edita à mão. Dele
são gerados:

```
tokens/tokens.json ──┬──▶ src/estilos/tokens.css    web (React, Next, JS puro, Vue…)
                     └──▶ src/lib/tokens/tokens.ts  React Native — e os tempos que o JS lê
```

Os dois arquivos de saída são **gerados e sobrescritos** — editá-los é trabalho
perdido no próximo `pnpm tokens`.

O `.ts` existe porque nenhum CSS chega ao React Native. O gerador converte o
OKLCH da fonte para `#rrggbb`/`rgba()` com a matemática do OKLab escrita à mão
(sem dependência), avisa quando uma cor não cabe no gamut sRGB, e emite as
dimensões como **número** — na web some o `px`, no RN é o que ele espera. As
curvas saem como tupla, prontas para `Easing.bezier(...curvas.mola)`.

**Sombras ficam de fora do `.ts`, de propósito.** Sombra de CSS é uma lista de
deslocamentos e borrão; no RN é `shadowOffset`/`shadowRadius` no iOS e um
`elevation` sem cor no Android. Traduzir 1:1 seria inventar uma equivalência que
não existe.

O círculo se fecha nos dois sentidos: o CSS lê `--cui-passo-item` e o
`usar-coreografia.ts` lê `tempos.passoItem`. **Nenhuma duração está escrita duas
vezes** — antes disso, esquecer um dos dois lugares deixava entrada e saída em
cadências diferentes, o defeito que se sente sem se enxergar.

## Usar em outro projeto

1. Copie `src/estilos/tokens.css` e importe uma vez, na raiz da aplicação.
2. Copie a pasta `src/lib/menu-suspenso/` **e** `src/lib/tokens/tokens.ts` — o
   componente lê os tempos da coreografia de lá.
3. Garanta que a raiz do documento tenha `data-tema="claro"` ou `"escuro"` —
   o hook `usarTema` faz isso, ou o seu tema atual faz.

Para manter o design sincronizado entre projetos, leve também `tokens/` e
`scripts/`: aí um `pnpm tokens` no destino reaplica qualquer mudança de tema.

```tsx
import { MenuSuspenso } from "@/lib/menu-suspenso/MenuSuspenso";

const MESES = [
  { valor: "01", rotulo: "Janeiro" },
  { valor: "02", rotulo: "Fevereiro" },
] as const;

<MenuSuspenso
  valor={mes}
  opcoes={MESES}
  placeholder="Todos os meses"
  rotulo="Mês"
  aoSelecionar={setMes}   // recebe "01" | "02", não `string`
/>;
```

## Fazer o design ser SEU

Troque `cores.acento` em `tokens/tokens.json` e rode `pnpm tokens`. Hover,
seleção, chevron e anel de foco derivam dele, então uma linha repinta o sistema
inteiro — na web e no mobile ao mesmo tempo. Raio de canto, curvas e ritmo da
coreografia seguem a mesma regra.

Uma exceção deliberada: `cores.foco` é **azul**, não o acento violeta. O anel de
foco precisa ser distinguível do estado de seleção — iguais, quem navega por
teclado não vê diferença entre "está aqui" e "está escolhido".

## Componentes

### `MenuSuspenso`

Lista de escolha única. Controlado, acessível, posicionado por medição.

| Prop | Tipo | Padrão | O que faz |
|---|---|---|---|
| `valor` | `T \| null` | — | O escolhido. `null` mostra o placeholder. |
| `opcoes` | `readonly OpcaoMenu<T>[]` | — | `{ valor, rotulo, apoio?, desabilitada? }`. |
| `placeholder` | `string` | — | Texto do campo vazio e nome da lista. |
| `aoSelecionar` | `(valor: T) => void` | — | O valor escolhido. |
| `rotulo` / `rotuladoPor` | `string` | — | Nome acessível: texto direto ou `id` de um rótulo visível. |
| `tamanho` | `"md" \| "lg"` | `"md"` | 44px ou 46px de altura. |
| `alinhamento` | `"inicio" \| "fim"` | `"inicio"` | Borda do campo em que o painel ancora. |
| `buscavel` | `boolean` | `false` | Liga a barra de filtrar — que só aparece de 8 opções em diante. |
| `desabilitado` | `boolean` | `false` | Fecha o menu se estiver aberto. |

**Teclado**: ↑ ↓ Home End navegam (pulando desabilitadas), Enter e Espaço
escolhem, Esc fecha devolvendo o foco, Tab fecha sem prender o foco. Digitar
letras salta para a opção — aberto ou fechado, com acento ou sem.

**A coreografia de saída** é o que dá o caráter, e não é um fade. Em ordem:
cada item **colapsa** — `maxHeight` da altura medida até zero, padding junto,
opacidade já em zero na metade do caminho — escalonado a partir do item mais
longe do gatilho, de modo que a lista se recolhe *em direção ao campo*. Só
depois de tudo retraído, mais uma pausa de 200ms, o painel recua e sai. É por
isso que ela roda em Web Animations API e não em CSS: altura medida não existe
em folha de estilo. A entrada obedece à mesma regra de direção — quem aparece
primeiro é quem está mais perto do gatilho, e um menu que abre para cima
escalona ao contrário.

**Acessibilidade**: `listbox`/`option` com foco itinerante; no modo com busca
vira `combobox` com `aria-activedescendant`, que é o padrão correto quando o
foco do sistema precisa ficar no campo de texto.

### Superfície de personalização

Tudo que o `MenuSuspenso` desenha sai de um token. Nada de cor, medida ou tempo
está escrito dentro do CSS do componente — mexer aqui muda o menu **e** todo
componente futuro que compartilhe o token.

**Campo (o gatilho)**

| Token | Padrão | O que controla |
|---|---|---|
| `altura-campo` / `altura-campo-lg` | 44 / 46 | Altura nos dois tamanhos |
| `campo-respiro-x` | 16 | Recuo do texto até a borda |
| `raio-campo` | 14 | Arredondamento |
| `acento-borda` → `acento-60` → `acento` | — | Traço em repouso → hover → aberto |
| `acento-texto` / `acento-placeholder` | — | Valor escolhido / campo vazio |
| `peso-medio` / `peso-leve` | 500 / 450 | ⭐ Escolhido é mais pesado que vazio — dá para ver se o campo está preenchido de relance, sem ler |
| `anel-foco` | acento azul 28% | Halo de 3px no foco por teclado |
| `giro-chevron` | 200ms | A seta virando 180° |

**Painel**

| Token | Padrão | O que controla |
|---|---|---|
| `flutuante` | — | Fundo. Separado de `superficie` de propósito: o dia em que popover ganhar vidro, muda só aqui |
| `raio-painel` | 18 | Arredondamento |
| `painel-respiro` | 8 | Recuo interno — e onde a barra de rolagem começa |
| `sombra-painel` | — | Elevação |
| `z-painel` | 60 | ⚠️ Vence a página, perde para diálogo modal |

**Itens**

| Token | Padrão | O que controla |
|---|---|---|
| `item-respiro-y` / `item-respiro-x` | 11 / 14 | Altura efetiva da linha |
| `raio-item` | 12 | Arredondamento |
| `acento-9` / `acento-14` | 9% / 14% | Hover e selecionado / linha em foco |
| `texto-corpo` / `texto-apoio` | 14 / 12 | Rótulo e linha de apoio |
| `transicao-item` | 180ms | O fundo acendendo |

**Barra de rolagem**

| Token | Padrão | O que controla |
|---|---|---|
| `scroll-largura` | 11 | Área de ARRASTO — não o que se vê |
| `scroll-respiro` | 3 | Quanto a pílula encolhe de cada lado |
| `scroll-polegar` / `-forte` | 22% / 42% | Em repouso / com o ponteiro no painel |
| `raio-pilula` | 999 | Arredondamento total |

A barra desenhada mede `scroll-largura − 2 × scroll-respiro` — **5px aos olhos,
11px ao mouse**. Sem essa separação, uma barra bonita de 5px vira uma barra que
ninguém consegue agarrar. Não há trilho, não há setas, e o polegar só ganha
corpo quando o ponteiro entra no painel: em repouso ele informa *quanto falta*
sem disputar atenção com o texto que está sendo lido.

**Coreografia** — `passo-item`, `entrada-painel`, `entrada-item`, `saida-item`,
`saida-painel`, `pausa-antes-do-painel`, `teto-escalonado`. Lidos ao mesmo tempo
pelo CSS (entrada) e pelo JS (saída), do mesmo JSON.

## Decisões que valem para todo componente novo

1. **Medir, não decretar.** Altura de painel é o espaço que sobra na janela;
   `60vh` num campo perto do rodapé ainda manda conteúdo para fora da tela.
2. **Portal + `fixed`** para qualquer coisa flutuante. `absolute` é recortado
   por qualquer ancestral com `overflow`, e recorte não é empilhamento —
   nenhum `z-index` traz de volta o que deixou de ser desenhado.
3. **Controlado por padrão.** Sem cópia local do valor não existe o estado que
   se dessincroniza do pai.
4. **Genérico em `T extends string`.** A tipagem descreve os dados de quem usa,
   não o componente.
5. **Todo token tem par nos dois temas.** Um token definido só no claro é um
   componente invisível no escuro.
6. **`prefers-reduced-motion` respeitado**, e de duas formas diferentes: a
   entrada em CSS é *encurtada* (removê-la deixaria nós presos em `opacity: 0`
   pelo `both`), e a saída em script é *pulada* — a Web Animations API não
   consulta a media query sozinha.
7. **Nada de tempo ou cor escrito duas vezes.** Se o CSS e o JS precisam do
   mesmo número, ele nasce em `tokens.json` e os dois o leem.

## Estrutura

```
tokens/
  tokens.json           ← ✏️  A ÚNICA coisa de design que se edita à mão
scripts/
  gerar-tokens.mjs      ← Node puro; a conversão OKLCH→sRGB mora aqui
src/
  estilos/
    tokens.css          ← 🤖 gerado
    base.css
  lib/
    index.ts            ← ponto único de entrada
    tokens/
      tokens.ts         ← 🤖 gerado
    menu-suspenso/
      MenuSuspenso.tsx
      menu-suspenso.css
      usar-ancoragem.ts    ← onde o painel cabe (medição + flip)
      usar-coreografia.ts  ← a saída medida, e a montagem que sobrevive a ela
      usar-clique-fora.ts  ← fecha fora, contando o portal como dentro
      filtrar-opcoes.ts    ← busca sem acento
      tipos.ts
    tema/
      usar-tema.ts         ← claro / escuro / sistema
  demo/
    Vitrine.tsx
```

Os três hooks de `menu-suspenso/` **não são do menu**: são a base de qualquer
popover. O próximo componente flutuante — Combobox, Menu de ações, Seletor de
data — reusa os três sem alteração.
