## Context

MyCODEany é uma aplicação Electron + React construída com `electron-vite`. Não existe nenhuma infraestrutura de testes automatizados. A arquitetura separa estritamente o processo main (Node.js/Electron) do renderer (React via Chromium), com comunicação exclusiva via `contextBridge`/IPC.

O estado atual impede:
- Validar regressões em componentes React ao evoluir a UI
- Verificar fluxos críticos do usuário (conexão, exploração de arquivos, editor, desconexão) de forma automatizada

## Goals / Non-Goals

**Goals:**
- Configurar Vitest para testes unitários dos componentes do renderer com JSDOM
- Configurar Playwright para testes E2E da aplicação Electron compilada
- Cobrir os quatro fluxos E2E definidos: criar conexão, listar arquivos, abrir arquivo, desconectar
- Testes unitários para os componentes principais: ConnectionForm, ConnectionManager, FileExplorer, MonacoWrapper (mock), TerminalPanel (mock), commons

**Non-Goals:**
- Testes do processo main (ipc handlers, ssh2, sftp) — não fazem parte deste escopo
- CI/CD pipeline — configuração de CI é separada
- Cobertura de 100% — foco nos fluxos críticos, não na cobertura exaustiva
- Testes de performance ou acessibilidade

## Decisions

### D1 — Vitest para testes unitários do renderer

**Escolha**: Vitest com ambiente `jsdom`

**Alternativas consideradas**:
- Jest: requer configuração manual mais extensa para funcionar com Vite/ESM; sem vantagem neste projeto que já usa Vite
- Vitest: integra nativamente com `electron-vite` (que é Vite internamente), suporte nativo a ESM, API compatível com Jest

**Configuração**: `vitest.config.ts` separado na raiz, apontando para `src/renderer/**` com `environment: 'jsdom'`. O `window.api` (contextBridge) deve ser mockado via `vi.mock` ou `vi.stubGlobal`.

### D2 — Playwright para testes E2E Electron

**Escolha**: `@playwright/test` com `electron` launch via `_electron.launch()`

**Alternativas consideradas**:
- Spectron: descontinuado desde Electron 15+
- WebdriverIO + wdio-electron-service: mais pesado, overhead de configuração maior
- Playwright: suporte oficial a Electron desde v1.9, mesma API para desktop e web, integração simples com o binário compilado

**Configuração**: `playwright.config.ts` na raiz. Os testes E2E fazem `npm run build` (ou usam o `out/` já compilado) e lançam o executável. Testes em `tests/e2e/`.

### D3 — Mocking do window.api nos testes unitários

**Escolha**: `vi.stubGlobal('api', mockApi)` no `setup` de cada suite que precisar

O contextBridge expõe `window.api` no renderer. Como o JSDOM não tem Electron, todo o `window.api` deve ser substituído por mocks. Um factory helper `createMockApi()` em `src/renderer/__tests__/helpers/mockApi.ts` centraliza os mocks padrão.

### D4 — Localização dos arquivos de teste

- Unitários: `src/renderer/ui/components/<feature>/__tests__/<Component>.test.tsx`
- E2E: `tests/e2e/<flow>.spec.ts`
- Helpers e fixtures: `tests/e2e/helpers/` e `src/renderer/__tests__/helpers/`

## Risks / Trade-offs

- **Testes E2E requerem build compilado** → risco de lentidão no ciclo de feedback. Mitigação: script `test:e2e` roda `build` automaticamente; `test:unit` é rápido e independente.
- **Monaco Editor não renderiza em JSDOM** → `MonacoWrapper` precisa de mock completo nos testes unitários. Mitigação: mock via `vi.mock('@monaco-editor/react')` que retorna um `<textarea>` simples.
- **xterm.js também não funciona em JSDOM** → `TerminalPanel` precisa de mock similar. Mitigação: mesmo padrão de mock.
- **Flakiness nos testes E2E de SSH** → os testes E2E de conexão SSH real dependem de um servidor disponível. Mitigação: usar um servidor SSH local (ex.: OpenSSH no WSL ou container Docker) ou mockar a camada IPC para E2E.
