## ADDED Requirements

### Requirement: Criar terminal remoto
O sistema SHALL criar um terminal PTY no servidor remoto associado à sessão SSH ativa, exibindo-o via xterm.js no renderer. Quando um `initialDir` for fornecido, o terminal SHALL abrir nesse diretório.

#### Scenario: Abrir painel de terminal
- **WHEN** o usuário clica no botão "Terminal" na barra de alternância
- **THEN** o painel de terminal abre e um novo terminal é criado via `terminal:create`, passando o `initialDirectory` da sessão ativa (se existir)

#### Scenario: Terminal vinculado à sessão ativa
- **WHEN** um terminal é criado
- **THEN** ele usa o `sessionId` da sessão SSH ativa como contexto

#### Scenario: Terminal aberto via Open Terminal Here
- **WHEN** o explorer solicita abertura de terminal em um diretório específico via `openTerminalAt(path)`
- **THEN** o terminal atual é fechado, um novo terminal é criado com o diretório especificado, e o painel de terminal é exibido

### Requirement: Enviar input ao terminal
O sistema SHALL transmitir o input do usuário ao PTY remoto em tempo real.

#### Scenario: Digitar no terminal
- **WHEN** o usuário digita no painel xterm.js
- **THEN** os dados são enviados via `terminal:input` (fire-and-forget) ao main process, que os encaminha ao PTY

### Requirement: Receber output do terminal
O sistema SHALL exibir o output do PTY remoto no xterm.js em tempo real.

#### Scenario: Output do PTY exibido no terminal
- **WHEN** o PTY remoto produz output
- **THEN** o main process emite `terminal:output` para o renderer, que exibe no xterm.js da sessão correta

### Requirement: Redimensionar terminal dinamicamente
O sistema SHALL notificar o PTY remoto quando o tamanho do painel de terminal mudar.

#### Scenario: Resize do painel
- **WHEN** o usuário redimensiona o painel de terminal
- **THEN** o renderer envia `terminal:resize` com as novas dimensões (cols, rows) e o PTY se adapta

### Requirement: Fechar terminal
O sistema SHALL encerrar o PTY remoto quando o terminal for fechado.

#### Scenario: Fechar terminal explicitamente
- **WHEN** o terminal é fechado (painel ou sessão encerrada)
- **THEN** `terminal:close` é chamado e o PTY é destruído no servidor
