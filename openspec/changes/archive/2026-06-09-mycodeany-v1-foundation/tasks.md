## 1. Fundação e Arquitetura

- [x] 1.1 Definir entidades de domínio: `Connection`, `FileNode`, `EditorTab`, `ActiveSession`
- [x] 1.2 Definir interfaces de porta: `ISshClient`, `ISftpService`, `IConnectionRepo`, `ICryptoService`
- [x] 1.3 Definir `IRemoteApi` no renderer como contrato do `contextBridge`
- [x] 1.4 Configurar `electron-vite` com `externalizeDepsPlugin` para módulos nativos
- [x] 1.5 Configurar Tailwind com tokens `ide-*` personalizados em `tailwind.config.cjs`
- [x] 1.6 Configurar CSP em produção via `session.defaultSession.webRequest.onHeadersReceived`

## 2. Gerenciamento de Conexões

- [x] 2.1 Implementar `SafeStorageCrypto` (encrypt/decrypt via `electron.safeStorage`)
- [x] 2.2 Implementar `ElectronStoreConnectionRepo` (CRUD persistido em `electron-store`)
- [x] 2.3 Registrar handlers IPC: `connections:list`, `save`, `update`, `delete`, `test`
- [x] 2.4 Criar `ConnectionForm` no renderer com campos label, host, porta, usuário, authType, senha/chave
- [x] 2.5 Criar `ConnectionManager` listando conexões com botões Connect e Delete
- [x] 2.6 Integrar `testConnection` ao `ConnectionForm` com feedback visual (✓/✗)

## 3. Conexão SSH

- [x] 3.1 Implementar `Ssh2Client`: métodos `connect`, `disconnect`, `test`, `isConnected`, `getClient`
- [x] 3.2 Implementar normalização de line endings CRLF→LF em `buildConnectConfig` para chaves privadas
- [x] 3.3 Registrar handlers IPC: `ssh:connect`, `ssh:disconnect`
- [x] 3.4 Emitir `ssh:disconnected` via `webContents.send` quando a sessão cair inesperadamente
- [x] 3.5 Registrar listener `ssh:disconnected` no renderer (`AppContext`) para limpar `activeSession`
- [x] 3.6 Implementar `connect()` e `disconnect()` em `AppContext` com estado `isConnecting`

## 4. Operações SFTP

- [x] 4.1 Implementar `Ssh2SftpService`: `listDir`, `readFile`, `writeFile`, `rename`, `mkdir`, `delete`
- [x] 4.2 Implementar `TempFileManager`: `createTempPath`, `deleteFile`, `deleteSessionFiles`, `cleanAll`
- [x] 4.3 Registrar handlers IPC: `sftp:listDir`, `readFile`, `writeFile`, `rename`, `mkdir`, `delete`
- [x] 4.4 Chamar `tempFiles.deleteSessionFiles` ao desconectar e `tempFiles.cleanAll` no `before-quit`
- [x] 4.5 Criar `FileExplorer` com lazy-loading de diretórios e cache de filhos já carregados
- [x] 4.6 Criar `TreeNode` com ícones por extensão e suporte a expand/collapse

## 5. Editor Monaco

- [x] 5.1 Implementar `EditorContext`: `openFile`, `closeTab`, `setActiveTab`, `saveActiveFile`, `updateContent`
- [x] 5.2 Criar `MonacoWrapper` usando `@monaco-editor/react` com modelos por URI `remote://`
- [x] 5.3 Registrar atalho Ctrl+S / Cmd+S dentro do `handleMount` do Monaco
- [x] 5.4 Criar `EditorTabBar` com indicador de dirty state e botão de fechar
- [x] 5.5 Criar `WelcomeScreen` exibida quando não há aba ativa
- [x] 5.6 Mapear extensões para linguagens Monaco em `LANGUAGE_MAP` no `EditorContext`

## 6. Terminal Integrado

- [x] 6.1 Implementar handler `terminal:create` usando `node-pty` sobre sessão SSH ativa
- [x] 6.2 Implementar handlers `terminal:input` e `terminal:resize` (fire-and-forget via `ipcMain.on`)
- [x] 6.3 Implementar handler `terminal:close` encerrando o PTY
- [x] 6.4 Emitir `terminal:output` via `webContents.send` para cada chunk de saída do PTY
- [x] 6.5 Criar `TerminalPanel` usando `@xterm/xterm` com addon `FitAddon` para resize dinâmico
- [x] 6.6 Registrar listener `terminal:output` no renderer para rotear output ao terminal correto

## 7. Painel de Extensões

- [x] 7.1 Criar `ExtensionsPanel` com campo de busca que consulta `open-vsx.org/api/-/search`
- [x] 7.2 Exibir resultados com nome, publisher e descrição de cada extensão

## 8. Layout e UI

- [x] 8.1 Criar `ActivityBar` com ícones para connections, explorer e extensions
- [x] 8.2 Criar `StatusBar` exibindo status da sessão ativa e botão de disconnect
- [x] 8.3 Implementar `IDELayout` em `App.tsx` com sidebar intercambiável e toggle de terminal
- [x] 8.4 Criar componentes commons reutilizáveis: `Button`, `Input`, `Modal`, `Spinner`, `Notification`
- [x] 8.5 Implementar `NotificationList` com auto-dismiss em 4 segundos e dismiss manual
- [x] 8.6 Criar `WindowRemoteApi` no renderer como adapter sobre `window.api`

## 9. Correções e Qualidade

- [x] 9.1 Corrigir parsing de chaves privadas SSH com CRLF em `Ssh2Client.buildConnectConfig`
- [x] 9.2 Garantir que typecheck (`tsc --noEmit`) passa sem erros em ambos os processos
- [x] 9.3 Validar que `externalizeDepsPlugin` exclui corretamente `ssh2` e `electron-store` do bundle
