## Why

Ao conectar em um servidor, o terminal sempre abre no diretório home (`~/`) do usuário SSH, ignorando o `initialDirectory` configurado na conexão. O usuário precisa manualmente digitar `cd /var/www` toda vez. Além disso, ao navegar pelo file explorer, não há como abrir um terminal diretamente na pasta selecionada — o fluxo exige alternar para o terminal e navegar manualmente.

## What Changes

- O terminal passará a abrir automaticamente no `initialDirectory` da conexão (se configurado), fazendo `cd` no backend antes de emitir output ao renderer
- O canal IPC `terminal:create` aceita um parâmetro opcional `initialDir` para definir o diretório inicial
- O context menu de diretórios no file explorer ganha a opção "Open Terminal Here", que (re)abre o terminal no path selecionado
- O `AppContext` ganha um mecanismo para o explorer solicitar abertura de terminal em um diretório específico

## Capabilities

### New Capabilities
- `terminal-initial-dir`: Abre o terminal no diretório inicial da conexão ou em um diretório arbitrário solicitado via "Open Terminal Here"

### Modified Capabilities
- `integrated-terminal`: O requirement de criar terminal agora inclui suporte a diretório inicial opcional

## Impact

- **IPC**: Canal `terminal:create` ganha 4o parâmetro (`initialDir?: string`)
- **Preload**: Bridge atualizado para passar o novo parâmetro
- **IRemoteApi**: Assinatura de `terminal.create()` atualizada
- **TerminalPanel**: Passa `initialDirectory` da sessão ativa ao criar terminal
- **TreeNode**: Novo item no context menu de diretórios
- **FileExplorer**: Propaga callback de abertura de terminal
- **AppContext**: Novo estado/método `openTerminalAt` para comunicação explorer → terminal
