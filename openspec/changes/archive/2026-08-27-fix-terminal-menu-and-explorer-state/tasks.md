## 1. Criar hook compartilhado de posicionamento de menu

- [x] 1.1 Criar `src/renderer/ui/components/commons/useClampedMenuPosition.ts` exportando `useClampedMenuPosition(x: number, y: number)`, retornando `{ ref, style }`, e verificar que `npm run typecheck` passa
- [x] 1.2 Implementar a medição via `useLayoutEffect` + `ref.current.getBoundingClientRect()`, calculando `left`/`top` clampados contra `window.innerWidth`/`window.innerHeight` com margem de 4px e piso mínimo de 4px
- [x] 1.3 Adicionar teste unitário em `src/renderer/ui/components/commons/__tests__/useClampedMenuPosition.test.tsx` cobrindo: posição normal (sem clamp), clique próximo à borda direita, clique próximo à borda inferior; verificar que `npm run test:unit` passa

## 2. Corrigir o menu de contexto do terminal

- [x] 2.1 Atualizar `TerminalContextMenu.tsx` para usar `useClampedMenuPosition` no lugar do `style={{ left: x, top: y }}` fixo, aplicando o `ref` e `style` retornados ao `<div>` do menu
- [ ] 2.2 Verificar manualmente (via `npm run dev`, conectado a um servidor com `npm run test:e2e`'s env vars ou uma sessão real): abrir o terminal, redimensioná-lo para ocupar todo o espaço vertical disponível, rolar o conteúdo até o fim, clicar com o botão direito perto da borda inferior e confirmar que "Copy" e "Paste" ficam inteiramente visíveis e clicáveis
- [x] 2.3 Atualizar/estender teste existente de `TerminalContextMenu` (ou criar um) para verificar que a posição é clampada quando `y` está próximo de `window.innerHeight`; verificar que `npm run test:unit` passa

## 3. Refatorar `ConnectionContextMenu` para reusar o hook

- [x] 3.1 Substituir a lógica inline de clamp (`MENU_WIDTH`/`MENU_HEIGHT`/`clampedX`/`clampedY`) em `ConnectionContextMenu.tsx` por `useClampedMenuPosition`, removendo as constantes agora não usadas
- [x] 3.2 Rodar o teste unitário existente de `ConnectionContextMenu` e confirmar que continua passando sem alteração de comportamento (`npm run test:unit`)

## 4. Preservar estado dos painéis da sidebar ao trocar de visualização

- [x] 4.1 Em `src/renderer/App.tsx`, substituir a cadeia de ternários que renderiza exclusivamente um painel da sidebar por um cálculo de `activePanel` (`'about' | 'extensions' | 'ai-chat' | 'connections' | 'explorer'`) preservando exatamente a mesma lógica de precedência já existente
- [x] 4.2 Renderizar os cinco painéis (`AboutPanel`, `ExtensionsPanel`, `AiChatPanel`, `ConnectionManager`, `FileExplorer`) simultaneamente, cada um envolto em `<div className={activePanel === '<id>' ? 'contents' : 'hidden'}>`, e verificar via `npm run typecheck` que a árvore compila
- [ ] 4.3 Rodar `npm run dev`, conectar a um servidor, expandir algumas pastas no Explorer, trocar para outro painel da sidebar (ex.: AI Chat) e voltar ao Explorer, confirmando visualmente que as pastas continuam expandidas e nenhuma nova chamada de `sftp:listDir` é disparada (checar via DevTools/log)
- [x] 4.4 Confirmar que o fallback para `ConnectionManager` quando `!activeSession` continua funcionando (desconectar a sessão ativa e verificar que a sidebar volta a exibir a lista de conexões)
- [x] 4.5 Atualizar/estender testes existentes de `App`/`IDELayout` (se houver) para cobrir que `FileExplorer` permanece montado (não perde estado local) após uma troca de `sidebarView`; verificar que `npm run test:unit` passa

## 5. Validação final

- [x] 5.1 Rodar `npm run typecheck`, `npm run test:unit` e `npm run test:e2e` (quando as variáveis `E2E_SSH_*` estiverem configuradas) e confirmar que todos passam — `typecheck` (141 erros pré-existentes, nenhum novo), `test:unit` (288/288) e `build` confirmados; `test:e2e` não executado neste ambiente por falta de servidor SSH real
- [x] 5.2 Rodar `openspec validate --change fix-terminal-menu-and-explorer-state --strict` e confirmar que a change é válida
