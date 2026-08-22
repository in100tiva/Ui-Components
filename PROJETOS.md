# Registro de Projetos

> Registro canônico exigido pela regra global do kit-mcp.
> Campos marcados com (obrigatório) não podem ficar vazios.

## Projeto principal: Ui-Components

- **Pasta local do projeto** (obrigatório): `D:\projetos\Campelo\Componentes-UI`
- **Repositório do projeto** (obrigatório): https://github.com/in100tiva/Ui-Components
- **Documentação local** (obrigatório): `D:\projetos\Campelo\Componentes-UI\README.md`
- **Repositório da documentação** (opcional): mesmo repositório do projeto
- **Infra / VPS** (opcional): — (biblioteca; sem deploy)
- **Notas** (opcional): Biblioteca de componentes React + TypeScript com design
  próprio. Zero dependência de runtime além do React — sem Tailwind, sem Radix,
  sem lucide. `src/estilos/tokens.css` é a fonte da verdade do design e é o que
  viaja entre projetos. Vitrine local: `pnpm dev` → http://localhost:5199

## Projetos conectados

### Processual

- **Pasta local do projeto** (obrigatório): `D:\projetos\Campelo\Processual`
- **Repositório do projeto** (obrigatório): ver `PROJETOS.md` daquele projeto
- **Documentação local** (obrigatório): `D:\projetos\Campelo\Processual\docs`
- **Repositório da documentação** (opcional): —
- **Infra / VPS** (opcional): —
- **Notas** (opcional): Origem dos componentes. O `MenuSuspenso` daqui foi
  extraído de `src/components/comuns/menu-suspenso.tsx`, com a coreografia de
  `coreografia-de-menu.ts` e os tokens de `app/globals.css`. Regra de design
  nova entra nesta biblioteca **e** vale conferir a versão do Processual, que
  nenhuma mudança daqui alcança.
