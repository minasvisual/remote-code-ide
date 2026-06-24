## MODIFIED Requirements

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
