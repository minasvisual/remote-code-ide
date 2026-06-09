## 1. Configuração de Testes Unitários (Vitest)

- [x] 1.1 Instalar devDependencies: `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- [x] 1.2 Criar `vitest.config.ts` na raiz apontando para `src/renderer/` com `environment: 'jsdom'` e `setupFiles`
- [x] 1.3 Criar arquivo de setup `src/renderer/__tests__/setup.ts` com import de `@testing-library/jest-dom`
- [x] 1.4 Adicionar scripts em `package.json`: `"test:unit": "vitest run"` e `"test:ui": "vitest --ui"`
- [x] 1.5 Criar helper `src/renderer/__tests__/helpers/mockApi.ts` com factory `createMockApi()` que retorna mock tipado de `IRemoteApi`
- [x] 1.6 Adicionar mock global de `@monaco-editor/react` em `src/renderer/__tests__/helpers/mocks.ts`
- [x] 1.7 Adicionar mock global de `xterm` em `src/renderer/__tests__/helpers/mocks.ts`

## 2. Testes Unitários — Componentes Commons

- [x] 2.1 Criar `src/renderer/ui/components/commons/__tests__/Button.test.tsx` — renderização e clique
- [x] 2.2 Criar `src/renderer/ui/components/commons/__tests__/Input.test.tsx` — valor controlado e onChange
- [x] 2.3 Criar `src/renderer/ui/components/commons/__tests__/Modal.test.tsx` — renderização com `isOpen: true/false`

## 3. Testes Unitários — ConnectionForm e ConnectionManager

- [x] 3.1 Criar `src/renderer/ui/components/connections/__tests__/ConnectionForm.test.tsx` — renderização vazia, submissão válida, validação de campo obrigatório
- [x] 3.2 Criar `src/renderer/ui/components/connections/__tests__/ConnectionManager.test.tsx` — listagem, abrir formulário de nova conexão, exclusão

## 4. Testes Unitários — FileExplorer

- [x] 4.1 Criar `src/renderer/ui/components/explorer/__tests__/FileExplorer.test.tsx` — renderização da árvore, expansão de diretório, clique em arquivo
- [x] 4.2 Criar `src/renderer/ui/components/explorer/__tests__/TreeNode.test.tsx` — renderização de nó arquivo vs diretório

## 5. Testes Unitários — Editor e Terminal (com mocks)

- [x] 5.1 Criar `src/renderer/ui/components/editor/__tests__/EditorTabBar.test.tsx` — renderização de abas, fechar aba
- [x] 5.2 Criar `src/renderer/ui/components/editor/__tests__/WelcomeScreen.test.tsx` — renderização da tela de boas-vindas
- [x] 5.3 Criar `src/renderer/ui/components/terminal/__tests__/TerminalPanel.test.tsx` — renderização com xterm mockado

## 6. Configuração de Testes E2E (Playwright)

- [x] 6.1 Instalar devDependencies: `@playwright/test`, `electron` (se não instalado como devDep)
- [x] 6.2 Criar `playwright.config.ts` na raiz configurando launch do Electron a partir de `out/main/index.js`
- [x] 6.3 Adicionar script em `package.json`: `"test:e2e": "npm run build && playwright test"`
- [x] 6.4 Criar `tests/e2e/helpers/electronApp.ts` com helper para iniciar e fechar a app Electron nos testes
- [x] 6.5 Executar `npx playwright install` para instalar browsers (necessário para screenshot em falhas)

## 7. Testes E2E — Criar Conexão

- [x] 7.1 Criar `tests/e2e/create-connection.spec.ts` — criar conexão com dados válidos e verificar listagem
- [x] 7.2 Verificar persistência: fechar e reabrir painel e confirmar que a conexão ainda aparece

## 8. Testes E2E — Listar Arquivos

- [x] 8.1 Criar `tests/e2e/list-files.spec.ts` — conectar ao servidor SSH de teste e verificar que FileExplorer exibe arquivos
- [x] 8.2 Testar expansão de subdiretório remoto no FileExplorer

## 9. Testes E2E — Abrir Arquivo

- [x] 9.1 Criar `tests/e2e/open-file.spec.ts` — clicar em arquivo remoto e verificar nova aba no EditorTabBar
- [x] 9.2 Verificar que o conteúdo do arquivo é exibido na área do editor
- [x] 9.3 Abrir segundo arquivo e verificar que ambas as abas existem

## 10. Testes E2E — Desconectar

- [x] 10.1 Criar `tests/e2e/disconnect.spec.ts` — desconectar sessão ativa e verificar que FileExplorer limpa e StatusBar não mostra host
- [x] 10.2 Verificar reconexão: após desconectar, conectar novamente e confirmar que FileExplorer exibe arquivos

## 11. Documentação e Script Geral

- [x] 11.1 Adicionar script `"test": "npm run test:unit && npm run test:e2e"` em `package.json`
- [x] 11.2 Atualizar `CLAUDE.md` com seção de testes: como rodar, onde ficam os arquivos, convenções de mock
