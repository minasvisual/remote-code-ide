## 1. Preload — expor versões de runtime

- [x] 1.1 Adicionar campo `versions` ao objeto `api` em `src/preload/index.ts` expondo `process.versions.node`, `process.versions.electron`, `process.versions.chrome` via `contextBridge`
- [x] 1.2 Adicionar campo `versions` à interface `IRemoteApi` em `src/renderer/domain/ports/IRemoteApi.ts` com tipo `{ node: string; electron: string; chrome: string }`
- [x] 1.3 Atualizar `WindowRemoteApi.ts` em `src/renderer/adapters/api/WindowRemoteApi.ts` para expor `versions`

## 2. ActivityBar — ícone About ancorado no rodapé

- [x] 2.1 Refatorar `src/renderer/ui/components/layout/ActivityBar.tsx` para separar itens em `topItems` e `bottomItems` (arrays distintos)
- [x] 2.2 Adicionar item `{ id: 'about', icon: InfoIcon, title: 'About' }` ao array `bottomItems`
- [x] 2.3 Criar componente SVG inline `InfoIcon` (círculo com "i") ou usar um ícone SVG adequado dentro do botão da ActivityBar
- [x] 2.4 Ajustar layout do `ActivityBar` para usar `mt-auto` no grupo inferior, mantendo os itens do topo no início da coluna

## 3. Componentes do painel About

- [x] 3.1 Criar diretório `src/renderer/ui/components/about/`
- [x] 3.2 Criar `src/renderer/ui/components/about/AboutTab.tsx` — exibe versão do app (via Vite `define` `__APP_VERSION__`), versões de runtime (`getRemoteApi().versions`), autor, licença, URL do repositório e lista estática de changelog
- [x] 3.3 Criar `src/renderer/ui/components/about/DocsTab.tsx` — exibe tabela de atalhos de teclado, seção de instruções de uso e seção FAQ; todos os dados são constantes estáticas no próprio arquivo
- [x] 3.4 Criar `src/renderer/ui/components/about/AboutPanel.tsx` — painel com estado de aba local (`useState`), renderiza cabeçalho com duas abas clicáveis ("About" / "Docs") e conteúdo condicional

## 4. Integração no layout

- [x] 4.1 Importar `AboutPanel` em `src/renderer/App.tsx`
- [x] 4.2 Adicionar case `about` ao switch/condicional da sidebar em `IDELayout` para renderizar `<AboutPanel />`

## 5. Configuração de build

- [x] 5.1 Adicionar `define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version) }` (ou equivalente) ao `vite.config.ts` / `electron.vite.config.ts` do renderer para que `AboutTab` possa ler a versão sem acessar `package.json` em runtime
- [x] 5.2 Adicionar declaração `declare const __APP_VERSION__: string` ao `src/renderer/vite-env.d.ts` (ou equivalente) para evitar erro de TypeScript
