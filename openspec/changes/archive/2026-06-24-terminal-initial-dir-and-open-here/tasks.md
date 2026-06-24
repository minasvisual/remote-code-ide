## 1. IPC Backend — terminal:create com initialDir

- [x] 1.1 Alterar handler `terminal:create` em `src/main/infrastructure/ipc/terminal.ipc.ts` para aceitar 4o parâmetro `initialDir?: string`
- [x] 1.2 Após `client.shell()` resolver, se `initialDir` estiver definido, escrever `cd <initialDir> && clear\n` no stream antes de registrar os listeners de `data`/`stderr`

## 2. Preload Bridge — passar initialDir

- [x] 2.1 Atualizar `src/preload/index.ts` para que `terminal.create` aceite e repasse o parâmetro `initialDir` via `ipcRenderer.invoke`

## 3. IRemoteApi — atualizar contrato

- [x] 3.1 Atualizar assinatura de `terminal.create()` em `src/renderer/domain/ports/IRemoteApi.ts` para incluir `initialDir?: string`

## 4. TerminalPanel — usar initialDirectory da sessão

- [x] 4.1 Alterar `src/renderer/ui/components/terminal/TerminalPanel.tsx` para passar `activeSession.initialDirectory` ao chamar `api.terminal.create()`
- [x] 4.2 Adicionar suporte a `terminalTargetDir` do `AppContext` — quando mudar, fechar terminal atual e reabrir com o novo diretório
- [x] 4.3 Ao receber `terminalTargetDir`, garantir que o painel de terminal está visível

## 5. AppContext — mecanismo openTerminalAt

- [x] 5.1 Adicionar estado `terminalTargetDir: { path: string; tick: number } | null` ao `AppContext`
- [x] 5.2 Adicionar método `openTerminalAt(path: string)` que seta `terminalTargetDir` com um tick incremental

## 6. Context Menu — Open Terminal Here

- [x] 6.1 Adicionar prop `onOpenTerminal?: (path: string) => void` ao `TreeNode` em `src/renderer/ui/components/explorer/TreeNode.tsx`
- [x] 6.2 Adicionar item "Open Terminal Here" ao `contextMenuItems` de diretórios no `TreeNode`
- [x] 6.3 Passar callback `onOpenTerminal` do `FileExplorer` para `TreeNode`, conectando ao `openTerminalAt` do `AppContext`

## 7. Testes

- [x] 7.1 Atualizar testes unitários de `TerminalPanel` para cobrir cenários com `initialDirectory` e `terminalTargetDir`
- [x] 7.2 Verificar que o typecheck passa (`npm run typecheck`)
