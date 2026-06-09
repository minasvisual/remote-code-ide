## Why

O projeto MyCODEany não possui nenhuma cobertura de testes automatizados, tornando difícil garantir a qualidade e a estabilidade das funcionalidades principais à medida que o código evolui. Adicionar testes unitários para componentes React e testes de interface (E2E) cobre os fluxos críticos do usuário e estabelece uma base para desenvolvimento guiado por testes.

## What Changes

- Configuração do ambiente de testes unitários com Vitest + React Testing Library para componentes do renderer
- Testes unitários para os principais componentes React (ConnectionManager, FileExplorer, MonacoWrapper, TerminalPanel)
- Configuração do ambiente de testes E2E com Playwright para testes de interface da aplicação Electron
- Testes E2E cobrindo os quatro fluxos principais do usuário:
  - Criar uma nova conexão SSH
  - Listar arquivos via SFTP
  - Abrir um arquivo no editor
  - Desconectar de uma conexão ativa

## Capabilities

### New Capabilities

- `unit-testing`: Infraestrutura de testes unitários com Vitest + React Testing Library e testes para os principais componentes React
- `e2e-testing`: Infraestrutura de testes E2E com Playwright e cobertura dos fluxos críticos da aplicação Electron (criar conexão, listar arquivos, abrir arquivo, desconectar)

### Modified Capabilities

<!-- Nenhuma capability existente tem requisitos alterados -->

## Impact

- Novos devDependencies: `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`, `electron-playwright-helpers`
- Novos scripts em `package.json`: `test`, `test:unit`, `test:e2e`, `test:ui`
- Configuração de `vitest.config.ts` e `playwright.config.ts` na raiz do projeto
- Arquivos de teste em `src/**/__tests__/` (unitários) e `tests/e2e/` (E2E)
- Nenhuma alteração em código de produção
