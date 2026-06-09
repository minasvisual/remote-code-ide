## Why

MyCODEany precisa de uma base sólida de funcionalidades remotas — conexão SSH, explorador de arquivos SFTP, editor de código Monaco e terminal integrado — para se posicionar como alternativa desktop ao Codeanywhere/RemoteSSH, permitindo que desenvolvedores editem e executem código em servidores remotos sem sair do app.

## What Changes

- Gerenciamento completo de conexões SSH (criar, listar, editar, deletar, testar)
- Autenticação por senha e por chave privada (PEM), com credenciais protegidas via OS keychain (`safeStorage`)
- Correção de compatibilidade: normalização de line endings CRLF→LF em chaves privadas SSH no Windows
- Explorador de arquivos SFTP com lazy-loading de diretórios e operações completas (listar, abrir, renomear, criar pasta, deletar)
- Editor Monaco com abas, detecção automática de linguagem por extensão, undo history por arquivo e atalho Ctrl+S para salvar
- Terminal integrado xterm.js com suporte a redimensionamento dinâmico, múltiplos terminais e I/O bidirecional
- Painel de extensões OpenVSX (busca e listagem)
- Layout IDE completo: ActivityBar, StatusBar, sidebar com troca de painéis, notificações auto-dismiss
- Arquitetura Ports & Adapters com separação estrita entre domínio, adaptadores e infraestrutura IPC

## Capabilities

### New Capabilities

- `connection-management`: Criação, listagem, edição e deleção de conexões SSH persistidas com criptografia via safeStorage
- `ssh-connect`: Estabelecimento e encerramento de sessões SSH, com tratamento de desconexão inesperada e normalização de chaves privadas
- `sftp-operations`: Operações de arquivo remoto (listDir, readFile, writeFile, rename, mkdir, delete) sobre sessão SSH ativa
- `monaco-editor`: Editor de código com tabs, dirty state, detecção de linguagem, modelos por URI e save via Ctrl+S
- `integrated-terminal`: Terminal xterm.js sobre PTY remoto com criação, resize, input/output e fechamento de sessão
- `extensions-panel`: Busca de extensões no registry OpenVSX e exibição de resultados
- `ide-layout`: ActivityBar, StatusBar, sidebar com navegação entre painéis (connections, explorer, extensions), notificações

### Modified Capabilities

<!-- Nenhuma — é a fundação inicial do projeto -->

## Impact

- **Electron main process**: `ssh2` (conexão SSH/SFTP), `electron-store` (persistência), `safeStorage` (criptografia), `node-pty` (terminal PTY)
- **Renderer**: React 18, Monaco Editor (`@monaco-editor/react`), xterm.js (`@xterm/xterm`)
- **IPC channels**: `connections:*`, `ssh:*`, `sftp:*`, `terminal:*`
- **Segurança**: credenciais nunca trafegam para o renderer após o save; CSP configurado para produção
- **Build**: `electron-vite` com `externalizeDepsPlugin` para módulos nativos; saída em `out/`
