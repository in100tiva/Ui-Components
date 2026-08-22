# Componentes-UI

Biblioteca de componentes React + TypeScript com design próprio, extraída do
projeto **Processual** e reescrita para ser copiável para qualquer projeto.

## Princípio de portabilidade

**Zero dependência de runtime além do React.** Sem Tailwind, sem Radix, sem
lucide, sem biblioteca de posicionamento. Um componente é uma pasta: os `.tsx`,
o `.css` e nada mais. Cai em Next, Vite ou CRA sem configurar nada.

O que viaja junto é **um arquivo**: `src/estilos/tokens.css`. Ele define o tema
claro e o escuro em variáveis CSS, e é a única coisa que os componentes leem.

## Rodar a vitrine

```bash
pnpm install
pnpm dev      # http://localhost:5199
```

## Usar em outro projeto

1. Copie `src/estilos/tokens.css` e importe uma vez, na raiz da aplicação.
2. Copie a pasta `src/lib/menu-suspenso/` inteira.
3. Garanta que a raiz do documento tenha `data-tema="claro"` ou `"escuro"` —
   o hook `usarTema` faz isso, ou o seu tema atual faz.

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

Troque `--cui-acento` em `tokens.css`. Hover, seleção, chevron e anel de foco
são derivados dele por `color-mix`, então uma linha repinta o sistema inteiro.
Raio de canto, curvas de animação e profundidade seguem a mesma regra.

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

**Acessibilidade**: `listbox`/`option` com foco itinerante; no modo com busca
vira `combobox` com `aria-activedescendant`, que é o padrão correto quando o
foco do sistema precisa ficar no campo de texto.

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
6. **`prefers-reduced-motion` respeitado** — encurtando a animação, nunca
   removendo-a, para o `both` não deixar nós presos em `opacity: 0`.

## Estrutura

```
src/
  estilos/
    tokens.css          ← o design system inteiro; o que viaja entre projetos
    base.css
  lib/
    index.ts            ← ponto único de entrada
    menu-suspenso/
      MenuSuspenso.tsx
      menu-suspenso.css
      usar-ancoragem.ts   ← onde o painel cabe (medição + flip)
      usar-presenca.ts    ← montagem que sobrevive à animação de saída
      usar-clique-fora.ts ← fecha fora, contando o portal como dentro
      filtrar-opcoes.ts   ← busca sem acento
      tipos.ts
    tema/
      usar-tema.ts        ← claro / escuro / sistema
  demo/
    Vitrine.tsx
```

Os três hooks de `menu-suspenso/` não são do menu: são a base de qualquer
popover, e o próximo componente flutuante (Combobox, Menu de ações, Seletor de
data) reusa os três sem alteração.
