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

**O tema invertido sai do mesmo lugar.** Além dos dois blocos de tema, o
gerador emite um par de blocos para `[data-tema-invertido]`: o que estiver
dentro desse atributo é pintado com a paleta do tema OPOSTO ao da página — no
claro usa a escura, no escuro a clara. É o que a aba selecionada usa, e ele não
inventa cor nenhuma: como o par texto/superfície de dentro dele já é um par que
o sistema garante nos dois temas, nada ali precisa ser medido de novo.

```html
<div data-tema-invertido>  <!-- paleta invertida daqui para dentro -->
```

⛔ **Os derivados por transparência são REDECLARADOS dentro do bloco**, e isso
não é redundância: o `var()` de dentro de uma custom property é substituído
onde ela é DECLARADA, não onde é usada. Herdados da raiz, `acento-9` e
`anel-foco` chegariam ao bloco invertido com o acento do tema de origem — fundo
invertido, hover e foco do tema antigo.

⚠️ **A inversão é relativa à RAIZ, e não é recursiva.** Um invertido dentro de
outro continua sendo o tema oposto ao da página.

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

**O `InterruptorDeDecisao`** tem três formas, e a do meio é efêmera:

| Estado | Forma |
|---|---|
| **Sem decisão** | Um botão redondo com reticências — como um menu fechado |
| **Aberto** | Dois lobos ligados por uma cintura, com as duas opções |
| **Decidido** | Volta ao círculo, com o ícone e a cor do que foi escolhido |

⭐ **Por que colapsar, em vez de deixar o switch sempre aberto.** Um switch de
duas posições com a alavanca no meio afirma uma escolha *em curso* que não
existe — ela fica entre aprovar e reprovar, encostando nos dois. O botão fechado
não afirma nada, que é exatamente o estado de uma tarefa por decidir. As opções
aparecem quando alguém vai usá-las.

⭐ **A transformação é uma largura só.** O `<svg>` do trilho tem `viewBox` fixo e
`preserveAspectRatio="xMinYMid slice"`: com 44px de largura, o que cabe no quadro
é exatamente o lobo esquerdo — um círculo perfeito. Crescendo até 108px, a
cintura e o segundo lobo entram em cena. Não são duas formas trocando de lugar: é
uma sendo revelada.

⭐ **`ancora` escolhe de que borda a forma se abre**, e a escolha é pelo lado do
cartão em que o controle vive. Com ele à direita (`ancora="fim"`), o espaço para
crescer está à esquerda: o desenho ancora na borda direita e o segundo lobo entra
pela esquerda, com o primeiro parado exatamente onde o dedo tocou. Com a âncora
errada, o lobo que estava sob o dedo *viaja para longe dele* durante a expansão.

⚠️ **Reserve a largura expandida no layout.** O controle mede 44px fechado e
108px aberto; deixado no fluxo sem reserva, abrir empurra o texto e o título pode
quebrar linha no meio da animação. Um slot de `flex: 0 0 108px` com
`justify-content: flex-end` resolve — o controle cresce para dentro do espaço que
já era dele.

⭐ **Quem recolhe o controle é a CONFIRMAÇÃO, não o clique.** A alavanca vai
para o lado escolhido, o contorno percorre a borda, e quando a volta fecha tudo
se recolhe junto. Desfazer recolhe na hora — senão o controle ficaria aberto com
a alavanca na cintura, o estado ambíguo que a forma fechada existe para eliminar.

⛔ **`confirmado` é derivado de *qual* resultado foi confirmado, e não um
booleano.** Com um booleano, trocar de lado num cartão já decidido mantinha o
`true` do estado anterior durante a nova coreografia: o controle lia "já
confirmou" no instante do clique e se recolhia na hora, sem a alavanca atravessar
nem o contorno percorrer. E zerá-lo dentro do efeito não resolve — **efeitos de
filho rodam antes dos do pai**, então o controle já teria lido o valor velho.
Comparando *para qual resultado* a confirmação vale, ela dá `false` no mesmo
render em que o novo resultado chega.

⭐ **É um `radiogroup`, não um `switch`.** Um switch tem dois estados e nenhum
jeito de dizer "ainda não decidi"; um grupo de rádios tem exatamente isso —
nenhuma opção marcada. De quebra vem o teclado certo: as setas percorrem, e só o
lado marcado fica na ordem de tabulação.

⛔ **Os alvos são retângulos, não os círculos que se vê.** Cada metade do
controle é clicável: o desenho tem 38px, a área de acerto tem 54×44. Alvo do
tamanho do desenho é o erro clássico do switch bonito — bonito e difícil de
acertar.

A cintura é um `<path>`, não dois círculos que se tocam: dois círculos
sobrepostos deixam um vinco em V no encontro, e a curva côncava é o que faz a
forma ler como uma peça só. Ela é estática — o que se move é o knob.

⛔ **As paradas são medidas em pixels, não em porcentagem da largura.** O centro
de cada lobo fica a `altura / 2` das bordas — porque o lobo é um círculo de raio
igual à metade da altura — e isso não é fração fixa da largura. Uma versão usava
`0% / 50% / 100%` com margem lateral constante: só a parada da esquerda caía no
lugar, a do meio errava por 22px e a da direita punha a alavanca **44px fora** do
controle. Centrar em três pontos diferentes é trabalho do `transform`, não de
margem.

⛔ **`trilho` e `alavanca` são tokens próprios, e não `abafado` e `superficie`.**
A diferença só aparece no escuro: `abafado` (L 0,288) é mais claro que a
superfície do cartão (L 0,243), então a alavanca sumia dentro do próprio sulco.
Um sulco é uma cavidade — tem de ser mais escuro que a peça que corre nele, nos
dois temas.

⚠️ **A mola para por limiar, não no valor exato.** A alavanca assenta a
centésimos de pixel do destino. Tentei cravar o valor em `onComplete` (o anime.js
escreve o render final depois dele) e devolver a posição ao CSS (mesmo problema);
a conclusão foi que a briga não valia. O JavaScript é o dono da posição, e o
resíduo está documentado em vez de combatido.

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

### `Abas`

A barra de seções do topo de uma página. Controlada, genérica em `T`, com o
padrão ARIA de `tablist`/`tabpanel`.

```tsx
<Abas abas={SECOES} valor={secao} aoTrocar={setSecao} rotulo="Seções do processo">
  {conteudoDaSecao}
</Abas>
```

| Prop | Tipo | Padrão | O que faz |
|---|---|---|---|
| `abas` | `readonly Aba<T>[]` | — | `{ valor, rotulo, icone?, selo?, desabilitada? }`. |
| `valor` | `T` | — | A aba aberta. |
| `aoTrocar` | `(valor: T) => void` | — | Recebe o valor escolhido — `"resumo" \| "partes"`, não `string`. |
| `rotulo` / `rotuladoPor` | `string` | — | Nome acessível do grupo: texto direto ou `id` de um rótulo visível. |
| `children` | `ReactNode` | — | O conteúdo da aba aberta. Com ele vem o `tabpanel` e os `id` amarrados dos dois lados; sem ele, só a barra. |

⭐ **A seleção é uma INVERSÃO de tema, não uma cor nova.** No claro a aba aberta
é um bloco escuro, no escuro é um bloco claro — e o componente não define um
token sequer para isso: ele marca a camada com `data-tema-invertido` e a paleta
do outro tema vem junto. Trocar o acento ou os cinzas em `tokens.json` repinta a
aba no mesmo movimento.

⭐ **A aba aberta é uma PESTANA, e a barra não tem fundo — tem uma LINHA DE
BASE.** O corpo arredonda só o topo; a base fica sobre a linha; e os dois **pés
côncavos**, um de cada lado, fazem a forma NASCER da linha em vez de pousar
sobre ela. É o que a faz ler como a lingueta do painel logo abaixo — e é a razão
de o painel encostar na barra, sem respiro.

⛔ **Os pés não são `border-radius`.** Um raio de canto é convexo por definição; a
curva daqui é o negativo dele. Cada pé é um quarto de disco recortado de um
quadrado por um `radial-gradient` centrado no canto de fora — a mesma técnica das
abas do navegador, e a única que acompanha a posição sem recalcular caminho
nenhum a cada quadro. Eles carregam `data-tema-invertido` por conta própria: a cor
tem de ser a MESMA do corpo, e herdada da página o pé sairia claro colado a um
corpo escuro.

⭐ **A pestana é uma JANELA sobre uma cópia da barra, e não um bloco com um
rótulo dentro.** A camada invertida é a barra inteira repetida por cima da real,
escondida menos onde o `clip-path` a abre. Como as duas ocupam exatamente as
mesmas coordenadas, o que se vê na janela é o mesmo texto, invertido.

O ganho aparece na VIAGEM: as letras se invertem conforme entram na janela —
"Anda|mentos" fica meio claro, meio escuro, como uma régua passando. ⛔ A versão
óbvia (pintar o texto da aba ativa de claro e deslizar um bloco atrás) tem um
defeito que não se contorna: no meio do caminho o texto claro está sobre o fundo
claro, ilegível por uns 300ms.

⚠️ **Recorte não é sombra.** `box-shadow` na camada seria cortado junto, então a
pestana não tem elevação — ela é uma janela para outro tema, não um objeto
pousado sobre a barra. A inversão já a separa do fundo com folga: **16,3:1 nos
dois temas** contra a superfície da página.

⛔ **O peso da fonte NÃO muda com a seleção**, e é a única regra do sistema que
este componente quebra de propósito. Peso muda a LARGURA do rótulo: a aba
escolhida engordaria, empurrando as vizinhas no instante do clique, e a cópia
deixaria de cair sobre o texto real no meio da viagem. Quem carrega o estado
aqui é `aria-selected`, a cor e o bloco invertido.

⭐ **O anel de foco continua visível na aba aberta**, e é geometria que garante
isso: o halo é desenhado FORA da caixa do botão, e a camada por cima está
recortada exatamente NA caixa. Fora do recorte ela não pinta pixel nenhum. Um
anel por dentro sumiria justamente na aba que tem o foco.

⚠️ **A posição vive em custom properties** (`--cui-aba-x`, `--cui-aba-largura`),
escritas na barra a cada quadro pela mola; delas saem o recorte do corpo E a
posição dos dois pés. Uma escrita, três consumidores — não há como corpo, curvas
e janela discordarem de onde a aba está, porque são a mesma conta. A primeira
medição não anima: sem essa trava, a pestana corre do canto até a aba aberta
toda vez que a página carrega.

**As micro animações** — três, e cada uma responde a uma coisa diferente:

⭐ **A pestana desliza com mola**, e a largura viaja junto com a posição: sem
isso ela chegaria ao destino com a medida da aba anterior e só então esticaria,
que é o movimento em dois tempos que se vê em toda barra de abas mal resolvida.

⭐ **Os pés ASSENTAM, e é a animação que dá o caráter.** Eles recolhem a 35% no
início da viagem — a pestana corre meio descolada da linha — e se espalham ao
chegar, num tempo PRÓPRIO e mais longo que o do deslize (`assentar-aba`, 260ms).
Terminar depois é o ponto: uma forma que chega e assenta lê como matéria; com
tudo acabando no mesmo instante, o assentamento simplesmente some.

⚠️ O piso de 35% não é estético: em zero a pestana vira um retângulo flutuando
sobre a linha por um instante, o que é pior que não animar.

⭐ **O traço do ponteiro** cresce do centro na base da aba fechada, no acento, e
some do mesmo jeito. É feedback de PONTEIRO, não indicador de estado — por isso
só existe no hover e no foco: a aba aberta já é a própria marca, e um traço
aceso ao lado dela daria à barra dois marcadores dizendo coisas diferentes.
Ele usa `scaleX`, não `width`: transformação não recalcula layout, e esta roda a
cada aba que o ponteiro atravessa ao varrer a barra.

E o painel entra pelo lado de onde a aba veio, em 180ms.

⚠️ **Tudo isso desaparece para quem pediu menos movimento** — o deslize e o
assentamento pelo JavaScript (`preferemenosMovimento` escreve a medição de uma
vez), a entrada do painel encurtada no CSS.

**Teclado**: ← → percorrem e já abrem a seção (ativação automática — trocar de
aba é barato e reversível; exigir Enter faria o teclado custar o dobro de teclas
para chegar onde o mouse chega num clique). Home e End vão às pontas, as
desabilitadas são puladas — uma aba que não abre não é uma parada —, e o Tab
entra na barra pela aba aberta e sai dela para o conteúdo.

Contraste medido:

| | claro | escuro |
|---|---|---|
| texto da aba aberta (invertida) | 14,96:1 | 18,54:1 |
| texto da aba fechada | 6,17:1 | 7,11:1 |
| texto da aba fechada em hover | 9,24:1 | 10,69:1 |
| a pestana contra a superfície | 16,32:1 | 16,32:1 |

| Token | Padrão | O que controla |
|---|---|---|
| `altura-aba` | 44 | Altura de cada aba |
| `aba-respiro-x` | 18 | Recuo do rótulo até a borda da aba |
| `raio-aba` | 16 | Arredondamento do TOPO da pestana |
| `aba-pe` | 16 | O raio da curva côncava do pé — e o recuo da primeira aba, para a curva dela caber |
| `assentar-aba` | 260ms | Os pés se espalhando ao fim da viagem |
| `borda` | — | A linha de base da barra, que a pestana interrompe ao passar |
| `transicao-item` | 180ms | A entrada do painel |

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
| `aba` | r 240 · a 30 | A pestana das abas. ⛔ A única em amortecimento crítico: ela CARREGA texto, e texto que passa do ponto e volta balança enquanto está sendo lido |

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

## Padrões de página

Um **padrão de página** é o degrau acima do componente: várias peças, um hook de
estado e uma porta de dados que se copiam JUNTOS e viram uma tela inteira. O
componente resolve um controle; o padrão resolve um trabalho.

### Gerenciador de Arquivos

Organiza arquivos que **já foram enviados**: árvore de pastas, grade, lista,
arrasta-e-solta, criar/renomear/mover/excluir. Ele não faz upload — quem envia é
outro fluxo; este arruma o que chegou.

```tsx
import { GerenciadorDeArquivos, criarRepositorioEmMemoria } from "@/lib";

const repositorio = useMemo(() => criarRepositorioEmMemoria(ACERVO), []);

<GerenciadorDeArquivos repositorio={repositorio} titulo="Base de Conhecimento" />;
```

| Prop | Tipo | Padrão | O que faz |
|---|---|---|---|
| `repositorio` | `RepositorioDeArquivos` | — | A porta para os dados. ⚠️ Precisa ser estável — `useMemo(…, [])`. |
| `titulo` | `string` | `"Base de Conhecimento"` | O nome do acervo: topo da coluna, raiz da trilha e destino "mover para a raiz". |
| `acoesDoCabecalho` | `ReactNode` | — | Botões extras no topo — "Enviar arquivos", por exemplo. |

#### A divisão de responsabilidades

É o ponto do padrão, e o que torna a troca de back-end barata:

| Camada | Arquivo | Responsabilidade | Sabe de… |
|---|---|---|---|
| **Dados** | `repositorio.ts` | Falar com quem guarda | rede, formato do servidor |
| **Regras** | `modelo.ts` | Árvore, caminho, o que pode mover, busca | nada além de dados puros |
| **Estado** | `usar-gerenciador.ts` | Navegação e ações otimistas | o repositório e as regras |
| **Gesto** | `usar-arrastar.ts` | Arrastar e soltar | ponteiro e DOM, não o domínio |
| **Desenho** | os `.tsx` | Recebem dados, chamam callbacks | nada — não guardam estado de dados |

#### Ligar num back-end real

Uma linha. `RepositorioDeArquivos` é a única fronteira:

```ts
// Antes (demonstração)
const repositorio = useMemo(() => criarRepositorioEmMemoria(ACERVO), []);

// Depois (produção)
const repositorio = useMemo(
  () => criarRepositorioHttp({ base: "/api/arquivos", cabecalhos: () => ({ Authorization: token }) }),
  [token],
);
```

O `criarRepositorioHttp` é um **esqueleto**, não um cliente universal — a chance
de as rotas casarem com a sua API é pequena, e ajustá-las é o trabalho esperado:

```
GET    {base}              → { pastas, arquivos }
POST   {base}/pastas       → Pasta
PATCH  {base}/pastas/:id   ← { nome? , paiId? }
DELETE {base}/pastas/:id
PATCH  {base}/arquivos     ← { ids, pastaId }     (mover em lote)
PATCH  {base}/arquivos/:id ← { nome }
DELETE {base}/arquivos     ← { ids }
```

Escrever a sua própria implementação é igualmente válido — Supabase, Firebase,
tRPC, um `IndexedDB` local. **Nenhum componente da página sabe a diferença.**

⚠️ **Todos os métodos são `async`, inclusive na versão em memória**, e isso não é
cerimônia: uma porta síncrona parece mais simples até o dia da troca, quando
toda a tela descobre de uma vez que precisa de carregando, erro e rollback.

#### O que copiar

A pasta `src/lib/gerenciador-de-arquivos/` e mais o que ela reusa —
deliberadamente, em vez de duplicar:

```
gerenciador-de-arquivos/   ← a página inteira
abas/                      ← a barra Pastas | Etiquetas
movimento/                 ← as molas (o abas/ depende)
tokens/tokens.ts           ← camadas, formas
menu-suspenso/usar-ancoragem.ts    ← onde o menu cabe
menu-suspenso/usar-clique-fora.ts  ← fecha fora, contando o portal como dentro
menu-suspenso/filtrar-opcoes.ts    ← a normalização sem acento da busca
estilos/tokens.css         ← importado uma vez, na raiz
```

#### As decisões

⭐ **A lista é PLANA e a árvore é derivada.** Guardar filhos dentro de cada pasta
parece natural até a primeira mudança de pai: mover vira cirurgia em duas listas,
e qualquer back-end devolve linhas de tabela — que são exatamente a lista plana.
`montarArvore` calcula a árvore quando a tela precisa dela.

⛔ **Mover uma pasta para dentro de si mesma desliga o ramo da raiz.** Ele
continua no banco e some da tela, porque não há mais caminho até ele — o pior
tipo de perda de dados, o que não parece uma. `podeMoverPasta` recusa a pasta
nela mesma, em qualquer descendente, e no pai onde ela já está. É a regra mais
testada do arquivo, e a que ninguém consegue clicar de propósito para conferir.

⭐ **Toda ação é OTIMISTA, com desfazer.** A tela muda no gesto; a chamada corre
atrás; se o servidor recusar, o estado volta e um `role="alert"` diz o que houve.
Esperar a resposta transformaria um arrasto de 200ms numa espera de meio segundo
com o arquivo pendurado no lugar antigo — e é o tipo de lentidão que faz a pessoa
arrastar de novo, achando que falhou.

⛔ **O arrasto é por eventos de PONTEIRO, não pela API `draggable` do HTML.** A
nativa desenha um fantasma que ninguém consegue estilizar, não dispara em toque
na maioria dos navegadores móveis, e exige `preventDefault` no `dragover` para
permitir a soltura — o defeito mais comum do arrasto nativo, e o mais difícil de
perceber: a única consequência é o cursor "proibido", sem erro nenhum.

⚠️ **Arrastar NÃO é acessível, e não há como torná-lo.** Por isso "Mover para"
existe no menu de ações de toda pasta e todo arquivo, com a lista de destinos
escrita por caminho completo. Se você replicar o padrão, replique a alternativa:
o arrasto é o atalho, nunca o único caminho.

⭐ **O arrasto só começa depois de 6px.** Sem o limiar, todo clique numa linha
vira um micro-arrasto e a página fica escorregadia — abrir uma pasta passaria a
exigir mão firme.

⛔ **O estado de edição guarda o id E o lugar.** A mesma pasta aparece na árvore e
na grade ao mesmo tempo; com um `emEdicao` só de id, os dois montavam um campo de
texto para ela, o segundo roubava o foco do primeiro, e o `blur` do primeiro
fechava a edição. Criar uma pasta abria o campo e ele sumia sozinho — sem erro
nenhum no console, e só com o servidor lento o bastante.

⭐ **A contagem ao lado do nome é DIRETA, não recursiva.** Uma pasta que mostra
"18" somando netos, com filhas de "3", "5" e "10", faz procurar dezoito arquivos
numa lista onde só existem três. O número responde "quantos vou ver se eu abrir
isto".

⭐ **A pasta é um objeto desenhado, com três camadas** — costas, papéis, frente.
O que aparece entre a frente e as costas é conteúdo. Em repouso sobra uma lasca
de papel; no ponteiro os papéis assomam; sob um arrasto, assomam mais. Numa grade
de vinte pastas, vinte leques abertos viram ruído branco — por isso o leque é
resposta ao gesto, e quem informa em repouso são os selos e o número.

⛔ **A aba do topo é um `clip-path`, não um retângulo colado por cima.** Dois
elementos empilhados deixam uma emenda visível, que some depois de meia hora de
ajuste em pixel e volta no primeiro zoom.

⛔ **O CSS declara o próprio `box-sizing`.** O padrão promete ser copiável; herdar
o reset do projeto quebra a promessa em silêncio — num projeto sem reset, a
frente da pasta soma o padding à altura, sobe 14px e cobre os papéis. O desenho
continua aparecendo, só que errado.

⚠️ **O layout responde ao CONTÊINER, não à janela** (`@container`). Esta página
vive dentro de um cartão; com `@media`, encaixá-la numa coluna estreita de uma
tela larga manteria as duas colunas espremidas.

⭐ **Submenu é NÍVEL, não painel voador.** "Mover para" troca o conteúdo do mesmo
painel e oferece um voltar. Submenu que abre para o lado exige perseguir o
ponteiro na diagonal, morre quando o mouse passa um pixel fora, e no toque não
existe.

⭐ **Confirmação de exclusão acontece DENTRO do item**: "Excluir" vira "Excluir a
pasta e o conteúdo?" e só o segundo clique executa. Um modal para cada exclusão é
uma tela inteira montada para uma pergunta de uma linha — e produz exatamente o
hábito de clicar em "Ok" sem ler.

⭐ **Renomear é no lugar, e o texto já nasce selecionado.** Quem renomeia quase
sempre troca o nome inteiro; começar com o cursor no fim obrigaria a apagar
dezesseis caracteres antes de escrever o primeiro. Sair do campo CONFIRMA — quem
clicou fora terminou, não desistiu; para desistir existe Esc.

⚠️ **As cores dos selos de origem não são tokens.** Elas identificam serviços de
terceiros, e não pertencem ao seu design — mudar `tokens.json` não pode repintar o
azul do Drive. Ficam em `icones.tsx`, num lugar só, com formas genéricas: cópia de
marca alheia dentro da sua interface é problema de licença esperando acontecer.

#### Teclado

| Onde | Teclas |
|---|---|
| Árvore | ↑ ↓ percorrem o que está visível · → abre o nó (e desce) · ← fecha (e sobe) · Home/End vão às pontas |
| Menu de ações | ↑ ↓ percorrem · Enter escolhe · Esc volta um nível, e fecha no primeiro |
| Renomear | Enter confirma · Esc descarta · sair do campo confirma |
| Arrastar | Esc cancela o arrasto em curso |

#### Tokens

| Token | Padrão | O que controla |
|---|---|---|
| `pasta` / `pasta-fundo` | — | A frente e as costas do desenho — as costas sempre mais escuras |
| `pasta-borda` | preto 10% / branco 12% | O fio do contorno. ⚠️ No escuro é ele que dá a aresta: a pasta rende 1,93:1 contra o cartão, e é decorativa — quem informa é o texto abaixo |
| `papel` / `papel-borda` | — | As folhas e a separação entre elas |
| `pasta-largura` / `-altura` | 148 / 112 | O desenho, e a coluna da grade (`auto-fill`) |
| `raio-pasta` | 10 | Arredondamento da pasta |
| `arquivos-lateral-largura` | 260 | A coluna do acervo |
| `altura-linha` | 46 | A linha da lista — e a alça de arrasto |
| `respiro-pagina` | 20 | O recuo do conteúdo |
| `abrir-pasta` | 220ms | Os papéis assomando |
| `trilho` | — | O sulco do interruptor de decisão. ⚠️ As Abas NÃO o usam: a barra delas é uma linha, não uma faixa |

Contraste medido:

| | claro | escuro |
|---|---|---|
| nome do arquivo | 18,54:1 | 14,96:1 |
| cabeçalho da lista | 6,17:1 | 7,11:1 |
| item da árvore | 9,24:1 | 10,69:1 |
| contador ao lado do nome | 5,65:1 | 5,68:1 |
| o papel contra a frente da pasta | 4,83:1 | 6,89:1 |

## Fundos

Camadas decorativas **dentro do cartão de conteúdo** — atrás do que se lê, e
não atrás do aplicativo. A moldura ao redor e a coluna lateral continuam lisas.
Marcar liga; clicar de novo desliga; a escolha fica guardada entre visitas.

```tsx
import { CamadaDeFundo, Casca, usarFundo } from "@/lib";

// a casca recebe a camada pela prop `fundo` e a põe dentro do cartão
<Casca fundo={<CamadaDeFundo />} lateral={<Navegacao />}>{conteudo}</Casca>

// onde se escolhe
const { fundo, alternar } = usarFundo();
<button aria-pressed={fundo === "orbes"} onClick={() => alternar("orbes")}>Usar</button>
```

### `FundoDeOrbes`

Cinco esferas de gradiente sobre luz difusa, recriadas do zero em SVG.

⭐ **É SVG por causa da MOLDURA.** Um fundo de tela vive em telas de todas as
proporções, e a composição só sobrevive a isso se puder ser enquadrada como uma
foto: `viewBox` + `preserveAspectRatio="slice"` é exatamente o `background-size:
cover` — as orbes mantêm posição e tamanho relativos, e o excesso é cortado. Em
CSS com porcentagens, a esfera vira elipse na primeira tela larga.

⛔ **O quadro tem a proporção da CAIXA, não a da arte original — e isso é
aritmética, não gosto.** A composição nasceu retrato (734×1024) e o cartão é
paisagem: com o quadro original e `slice`, a escala vira 1,5 e sobram **40% da
arte**. Nenhuma âncora salva isso, só escolhe o que se perde — ancorado no topo,
o cartão fica com uma lavagem violeta e uma bolinha, e a esfera principal nunca
aparece; centralizado, sobra um close nela.

A saída foi **reenquadrar, não redesenhar**: quadro `0 0 1100 640` (proporção do
cartão, corte de ~10px) e as cinco orbes reposicionadas por `<g transform>`.
Funciona sem retrabalhar o desenho porque `gradientUnits="userSpaceOnUse"`,
`clipPath`, `mask` e `stdDeviation` vivem no espaço do usuário local: recorte,
dissolução e desfoque herdam o transform do grupo e escalam juntos.

⛔ **O halo e a orbe que ele ilumina usam a MESMA matriz.** Reposicionar um sem o
outro descola a luz do objeto que a produz — e um halo órfão no meio do cartão é
a coisa mais visível que este fundo pode fazer de errado.

⭐ **A borda nítida e o miolo macio saem da MESMA peça.** No SVG o filtro roda
antes do recorte: o `feGaussianBlur` funde as quatro cores livremente, vazando
para fora do círculo, e o `clipPath` corta reto. Miolo sem nenhuma emenda entre
cores, contorno duro — é o que faz ler como esfera, e não como disco pintado.

⛔ **O blur come opacidade perto da própria borda do que ele borra.** Cada
disco-base tem folga generosa (r=340 dentro de um recorte de r=228, com σ=58):
sem ela a borda direita sai desbotada. **Mexer no `stdDeviation` obriga a mexer
no raio da base junto** — é a regra invisível do arquivo.

⛔ **Os ids do SVG são únicos por instância (`useId`).** `url(#g-orbe1)` é global
ao documento: com a miniatura da galeria e o fundo do site na mesma página, o
segundo SVG passaria a usar os gradientes do primeiro — sem erro, sem aviso, só
uma cor estranha que ninguém liga ao id.

⚠️ **As cores NÃO são tokens.** Elas são a arte deste fundo, como a paleta de uma
ilustração: trocar o acento do produto não pode repintar o céu. O que responde ao
tema é a base atrás delas — e no escuro as orbes recuam para 55%, porque pastel
pensado para papel branco vira letreiro sobre fundo quase preto.

### O que acontece quando um fundo liga

⭐ **A camada é `sticky` com uma tela de altura, e não `absolute; inset: 0`.** O
cartão rola com a página e pode ter três telas de altura; esticada nele inteiro,
a composição seria escalada pela altura e sobrariam duas faixas laterais da
esfera grande. Colada ao topo da janela, o enquadramento é sempre o mesmo
enquanto o conteúdo passa por cima. A margem negativa de uma tela é o que a
impede de empurrar o conteúdo para baixo.

⭐ **Todo texto solto sobre a ilustração ganha uma superfície de vidro** (86% +
`backdrop-filter`) — o cabeçalho da página e as bancadas.

⛔ **Não há opacidade que resolva isso, e a conta é o argumento.** Com o texto
direto sobre a arte, o pior par mede **1,11:1**. Varrendo de 1 em 1 ponto:

| correção | menor valor que aprova em AA |
|---|---|
| véu da cor da superfície | **71%** |
| baixar a opacidade da ilustração | **16%** |

Nos dois casos a ilustração deixou de ser ilustração. O problema não é
cromático, é estrutural: texto de corpo sobre gradiente saturado não se resolve
com transparência. Com a superfície, o pior par sobe para **5,60:1** (claro) e
**6,31:1** (escuro).

⚠️ **O véu de 35% continua, mas com outro papel**: tirar o excesso de saturação
onde nada cobre a arte. Ele não é o que garante o contraste.

⚠️ **Há reserva para quem não tem `backdrop-filter`**: opacidade cheia. Sem a
arte aparecendo através do texto, mas com o texto legível — a troca certa quando
só cabe uma das duas.

⛔ **O miolo do cartão precisa de `position: relative` e `z-index: 1`.** Sem
isso, ele e a camada empilham pela ordem do documento, e o `z-index: 0` do fundo
basta para o conteúdo sumir atrás da ilustração.

### Um fundo novo

Uma entrada em `catalogo.tsx`. A página de escolha, a camada do site e a
persistência saem todas dessa lista — não há segunda lista para manter em dia.

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
    abas/
      Abas.tsx             ← a barra, a cópia invertida e a medição
      abas.css             ← o recorte e as duas curvas da pestana
    gerenciador-de-arquivos/  ← 📄 um PADRÃO DE PÁGINA inteiro
      tipos.ts                  ← o vocabulário, e a fronteira com o back-end
      repositorio.ts            ← ✏️  a PORTA: memória, HTTP, ou a sua
      modelo.ts                 ← as contas puras (árvore, mover, buscar)
      usar-gerenciador.ts       ← estado e ações otimistas
      usar-arrastar.ts          ← arrastar e soltar por eventos de ponteiro
      GerenciadorDeArquivos.tsx ← a composição da página
      ArvoreDePastas.tsx
      GradeDePastas.tsx         ← o desenho de três camadas da pasta
      TabelaDeArquivos.tsx
      MenuDeAcoes.tsx           ← reusa os hooks de popover do menu suspenso
      CampoDeNome.tsx           ← renomear no lugar
      icones.tsx
      gerenciador.css
    fundos/
      FundoDeOrbes.tsx     ← a composição em SVG, ids únicos por instância
      catalogo.tsx         ← ✏️  a lista de fundos + a camada do site
      usar-fundo.ts        ← a escolha, numa loja externa (duas telas a compartilham)
      fundos.css           ← a camada fixa e o vidro que o fundo exige
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
      abas.tsx
      gerenciador-de-arquivos.tsx
      fundos.tsx
```

Os três hooks de `menu-suspenso/` **não são do menu**: são a base de qualquer
popover. O próximo componente flutuante — Combobox, Menu de ações, Seletor de
data — reusa os três sem alteração.
