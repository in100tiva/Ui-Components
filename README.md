# Componentes-UI

Biblioteca de componentes React + TypeScript com design próprio, extraída do
projeto **Processual** e reescrita para ser copiável para qualquer projeto.

## Princípio de portabilidade

**Duas dependências de runtime: React e anime.js.** Sem Tailwind, sem Radix, sem
lucide, sem biblioteca de posicionamento. Um componente é uma pasta: os `.tsx`,
o `.css` e nada mais. Cai em Next, Vite ou CRA sem configurar nada.

O anime.js (~17 KB gzip) entrou por uma razão só, e ela não é conveniência:
**mola de verdade não existe em CSS nem na Web Animations API.** `cubic-bezier`
é uma curva fixa que finge inércia; `spring` calcula a duração a partir de
massa, rigidez e amortecimento — o movimento para quando a energia acaba, não
quando o relógio marca. E interromper uma mola no meio continua de onde estava,
com a velocidade que tinha, em vez de saltar para o começo.

O que viaja junto é **um arquivo**: `tokens/tokens.json`. Dele saem as três
camadas do design — ver *Tokens* abaixo.

## Rodar a galeria

```bash
pnpm install
pnpm dev      # gera os tokens e sobe em http://localhost:5199
pnpm tokens   # só regenera os tokens
pnpm verificar # monta os componentes num DOM e confere o comportamento
```

`pnpm verificar` existe porque a classe de defeito mais cara desta biblioteca não
é de tipo nem de sintaxe — é estilo inline que sobrevive à animação, animação que
não é cancelada, e API de terceiro que mudou sem quebrar nada. Tudo isso passa no
`tsc` e no build. Três defeitos reais foram encontrados por ele: o painel
apagando o próprio teto de altura ao terminar de abrir, o menu "reabrindo" já
fechado quando fechado no meio da entrada, e o anime.js 4.5 tendo removido
`ease: "cubicBezier(…)"` em string — que seguia animando, com a curva errada.

A galeria lista os componentes na coluna e mostra o escolhido no cartão central.
Cada um tem endereço próprio — `#menu-suspenso` pode ser colado num chat e
recarregar não devolve ninguém para o começo.

**Para adicionar um componente à galeria**, são duas coisas: um arquivo em
`src/demo/demos/` exportando a demo, e uma entrada em `src/demo/registro.tsx`.
A coluna, o cabeçalho e a rota saem daí — não há segunda lista para manter em
dia, que é como uma galeria começa a mentir sobre o que a biblioteca tem.

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
o painel recua e sai — começando quando o ÚLTIMO item COMEÇA a se recolher, não
quando todos terminam. Essa distinção é a diferença entre uma saída fluida e um
balão vazio parado na tela: ancorado no fim, a lista sumia inteira e a caixa
ficava lá por quase meio segundo. É por isso que a coreografia roda em
JavaScript e não em CSS: altura medida não existe em folha de estilo. A entrada obedece à mesma regra de direção — quem aparece
primeiro é quem está mais perto do gatilho, e um menu que abre para cima
escalona ao contrário.

**Acessibilidade**: `listbox`/`option` com foco itinerante; no modo com busca
vira `combobox` com `aria-activedescendant`, que é o padrão correto quando o
foco do sistema precisa ficar no campo de texto.

### `CartaoDeDecisao`

Cartão de tarefa que se **contorna** ao ser aprovado ou reprovado. Três camadas
entram juntas: uma lavagem de cor toma o fundo, uma malha de pontos finos
aparece em varredura, e a borda percorre o cartão de ponta a ponta. Verde para
aprovada, vermelho para reprovada — **o mesmo desenho, só a família de cor muda**.

```tsx
<CartaoDeDecisao resultado={r} aoDecidir={setR} detalhe="Aprovada por Ana">
  <div><ControlesDeDecisao /> <strong>Protocolar contestação</strong></div>
  <RodapeDaDecisao />
</CartaoDeDecisao>
```

| Prop | Tipo | Padrão | O que faz |
|---|---|---|---|
| `resultado` | `"aprovada" \| "reprovada" \| null` | — | O estado. `null` = em aberto. |
| `aoDecidir` | `(r) => void` | — | Recebe `null` quando o lado ativo é clicado de novo. |
| `pendente` | `boolean` | `false` | Em `aria-busy`, recusa cliques, cursor de progresso. |
| `detalhe` | `string \| null` | `null` | "Aprovada por Ana em 03/08" — vira `title` e rodapé. |

**Dois botões, não um interruptor.** Aprovar e reprovar são escolhas opostas, e
um `switch` obrigaria a passar por um estado para chegar ao outro — além de não
ter como representar "ainda não decidi". Com dois botões, o estado aberto é
simplesmente nenhum pressionado, e clicar de novo no lado ativo desfaz.

**A sequência**: a malha varre (620ms), o contorno percorre (700ms), e **só
quando a volta fecha** o botão preenche e estala. Preencher no clique afirmaria o
fim antes de ele existir.

⚠️ **Só o visual espera.** `aria-pressed` acompanha o estado desde o clique —
adiar o que é *anunciado* faria o leitor de tela mentir por 700ms. O CSS pinta
por `data-cheio`, nunca por `aria-pressed`.

**A malha é UM elemento.** Os pontos são um `background-image` de gradientes
radiais em ladrilho de 6px, e o degradê de densidade vem de uma máscara de duas
camadas: uma que varre (animada por `--cui-varredura`) e outra permanente, que
faz os pontos rarearem na direção da leitura. Uma versão anterior usava um
`<span>` por ponto — com pontos de 1px seriam mais de quinhentos por cartão, e
uma lista de tarefas resolvidas viraria dezenas de milhares de nós.

⛔ `--cui-varredura` precisa de `@property`. Sem o registro, o navegador trata a
custom property como string opaca: a animação salta de 0 a 1 num quadro e a onda
não existe.

**As decisões herdadas do original:**

⭐ `pathLength={100}` normaliza o perímetro — a mesma animação serve a um cartão
de três linhas e a um de trinta. ⭐ Duas camadas de borda: a de 1px em CSS é o
**trilho**, o `<rect>` SVG é a borda de verdade; com uma só, o traço se desenha
sobre o nada. ⛔ A animação pertence ao **gesto**: cartão que já chega decidido
renderiza tudo pronto, senão uma lista de vinte e cinco dispara vinte e cinco
coreografias em coro.

Contraste medido (mínimo 3:1 gráfico, 4,5:1 texto):

| | claro | escuro |
|---|---|---|
| verde sobre o cartão | 4,61:1 | 6,41:1 |
| vermelho sobre o cartão | 5,33:1 | 5,62:1 |
| texto do rodapé | 8,05–8,87:1 | 8,61–9,74:1 |

E o estado é **legível, não só colorido** — `RodapeDaDecisao` escreve a decisão.
Verde e vermelho é exatamente o par mais comum de daltonismo.

### `Casca` e `NavegacaoLateral`

O layout do app: moldura, coluna lateral e cartão central. Tem uma ideia só, e
tudo serve a ela — **o conteúdo é papel pousado sobre uma mesa**. A moldura é
mais escura que o fundo do conteúdo nos dois temas, o cartão tem raio grande,
sombra de repouso e um fio de contorno.

⭐ **A coluna não tem fundo próprio, de propósito.** Um `background` ali criaria
três superfícies empilhadas — mesa, coluna, cartão — e uma hierarquia visual que
a informação não tem. Sem ele há duas: a mesa e o papel. O item ativo aparece
justamente por ser o único pedaço de papel na coluna.

⭐ **A pílula do item ativo é UM elemento, não uma classe no item.** Essa é a
diferença inteira: pintando o fundo do item, o marcador *pisca* de um lugar ao
outro, porque são dois nós e nenhuma transição liga o fundo de um ao do outro.
Sendo um elemento só, posicionado por medição, ele **viaja** — e o olho
acompanha para onde a navegação foi. O deslize não é o indicador de estado:
quem carrega isso é `aria-current="page"`, o peso da fonte e a cor.

```tsx
<Casca marca={<Marca />} lateral={<NavegacaoLateral … />} rodapeLateral={<Tema />}>
  {conteudo}
</Casca>
```

| Token | Padrão | O que controla |
|---|---|---|
| `moldura` / `moldura-alta` | — | A mesa e o ponto claro do gradiente de 160° |
| `moldura-borda` | — | O fio que separa o cartão da mesa |
| `realce` | preto 6% / branco 8% | Hover na coluna — ⛔ não é o acento: a coluna fica calma |
| `relevo-repouso` | — | A elevação do cartão |
| `raio-casca` / `-lg` | 22 / 32 | Arredondamento do cartão |
| `lateral-largura` | 248 | Largura da coluna |
| `deslize-pilula` | 320ms | A viagem do marcador |

Abaixo de 1024px a coluna some e a galeria escolhe pelo próprio `MenuSuspenso` —
um controle a menos para manter, e a garantia de que ele é usável de verdade: se
o menu quebrar no celular, a galeria quebra junto.

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
| `margem-da-janela` | 12 | Folga que o painel nunca invade, em qualquer borda |
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

**Campo de busca**

| Token | Padrão | O que controla |
|---|---|---|
| `altura-busca` | 36 | Altura do campo |
| `borda` → `acento` | — | O divisor em repouso → com foco |

⭐ **O campo não tem moldura, e o divisor é o indicador de foco.** O painel já é
a superfície elevada; um input que desenha a própria caixa dentro dela é moldura
sobre moldura. E como este campo recebe foco no instante em que o menu abre, um
anel de foco não seria um estado — seria a aparência padrão do componente, acesa
o tempo todo. O traço que separa a busca da lista já existe, já tem a largura
certa e já está onde o olho procura a fronteira: ele trocar de cor resolve as
duas coisas com um elemento só. Só a cor muda, nunca a espessura — engrossar
empurraria a lista no exato momento em que a pessoa começa a ler. Medido:
**3,81:1 no claro, 6,38:1 no escuro**, acima dos 3:1 que a WCAG 1.4.11 pede.

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

**Movimento**

| Mola | Física | Onde |
|---|---|---|
| `painel` | r 190 · a 22 | O painel chegando. Amortecida quase até o crítico: assenta com um respiro, sem quicar |
| `item` | r 240 · a 26 | Cada opção. Mais rígida — o item percorre 6px, e mola mole nessa distância só parece atraso |
| `chevron` | r 160 · a 12 | ⭐ A única com quique de verdade. A seta passa do ponto e volta |
| `pulso` | r 420 · a 18 | A troca do rótulo no campo. ~130ms — se der para perceber a duração, está errado |

⚠️ **As molas não existem no `tokens.css`**, e não é esquecimento: CSS não tem
spring. Uma mola não tem duração, e isso não é representável em
`animation-duration`. Elas saem no `tokens.ts` — que é também o formato que o
`Animated.spring` do React Native recebe, campo por campo.

Curvas (`saida`, `colapso`) continuam existindo, e são usadas onde devem:
**molas na chegada, curvas na partida.** Uma coisa que chega tem massa e
assenta; uma coisa que parte é uma decisão já tomada, e deve sair com convicção.
Mola na saída faz o painel hesitar na porta.

Tempos: `passo-item`, `saida-item`, `saida-painel`, `pausa-antes-do-painel`,
`teto-escalonado`.

## Decisões que valem para todo componente novo

1. **Medir, não decretar.** Altura de painel é o espaço que sobra na janela;
   `60vh` num campo perto do rodapé ainda manda conteúdo para fora da tela. A
   margem da janela (`margem-da-janela`) é descontada do espaço disponível nos
   quatro lados — e um mínimo de altura é critério para VIRAR de lado, nunca
   piso de tamanho: confundir os dois faz o painel atravessar a borda.
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
8. **Nenhum componente importa `animejs` direto.** Tudo passa por
   `lib/movimento/`, que traduz as molas do design para a API da biblioteca.
   Números de física espalhados por vinte arquivos são vinte dialetos de
   movimento — é assim que uma interface ganha cinco personalidades sem ninguém
   decidir isso. E se o anime.js sair um dia, sai de um arquivo só.

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
    movimento/
      movimento.ts      ← a única porta para o anime.js
    cartao-de-decisao/
      CartaoDeDecisao.tsx  ← o contorno que percorre o cartão
      cartao-de-decisao.css
    menu-suspenso/
      MenuSuspenso.tsx
      menu-suspenso.css
      usar-ancoragem.ts    ← onde o painel cabe (medição + flip)
      usar-coreografia.ts  ← entrada e saída, num lugar só
      usar-clique-fora.ts  ← fecha fora, contando o portal como dentro
      filtrar-opcoes.ts    ← busca sem acento
      tipos.ts
    casca/
      Casca.tsx            ← moldura + coluna + cartão
      NavegacaoLateral.tsx ← a pílula que desliza
      casca.css
    tema/
      usar-tema.ts         ← claro / escuro / sistema
  demo/
    Galeria.tsx           ← a casca + o registro, com rota por hash
    registro.tsx          ← ✏️  uma entrada por componente
    pecas.tsx             ← bancada e campo (só da galeria)
    demos/
      fundamentos.tsx     ← a paleta, lida do tokens.ts gerado
      menu-suspenso.tsx
```

Os três hooks de `menu-suspenso/` **não são do menu**: são a base de qualquer
popover. O próximo componente flutuante — Combobox, Menu de ações, Seletor de
data — reusa os três sem alteração.
