## ADDED Requirements

### Requirement: Terminal abre no diretório inicial da conexão
O sistema SHALL abrir o terminal remoto no `initialDirectory` configurado na conexão, quando este campo estiver preenchido.

#### Scenario: Conexão com initialDirectory configurado
- **WHEN** o terminal é criado para uma sessão cuja conexão possui `initialDirectory: "/var/www"`
- **THEN** o terminal abre com o working directory em `/var/www` e o output exibido é um prompt limpo (sem `cd` visível)

#### Scenario: Conexão sem initialDirectory
- **WHEN** o terminal é criado para uma sessão cuja conexão não possui `initialDirectory`
- **THEN** o terminal abre no diretório home do usuário SSH (`~/`), comportamento padrão

#### Scenario: initialDirectory não existe no servidor
- **WHEN** o terminal é criado com `initialDirectory` apontando para um diretório inexistente
- **THEN** o shell exibe a mensagem de erro padrão do `cd` e permanece no home do usuário

### Requirement: Open Terminal Here via context menu do explorer
O sistema SHALL permitir abrir o terminal em um diretório específico a partir do context menu do file explorer.

#### Scenario: Clique em "Open Terminal Here" em um diretório
- **WHEN** o usuário clica com botão direito em um diretório no file explorer e seleciona "Open Terminal Here"
- **THEN** o terminal atual é fechado, um novo terminal é criado com working directory no diretório selecionado, e o painel de terminal é exibido

#### Scenario: "Open Terminal Here" só aparece para diretórios
- **WHEN** o usuário clica com botão direito em um arquivo no file explorer
- **THEN** a opção "Open Terminal Here" NÃO SHALL aparecer no context menu

### Requirement: Canal IPC terminal:create aceita diretório inicial
O sistema SHALL aceitar um parâmetro opcional `initialDir` no canal `terminal:create` para definir o diretório de trabalho inicial do PTY.

#### Scenario: terminal:create com initialDir
- **WHEN** o renderer invoca `terminal:create(sessionId, cols, rows, "/opt/app")`
- **THEN** o PTY é criado e executa `cd /opt/app && clear` antes de emitir output ao renderer

#### Scenario: terminal:create sem initialDir
- **WHEN** o renderer invoca `terminal:create(sessionId, cols, rows)` sem o 4o parâmetro
- **THEN** o PTY é criado no diretório home padrão, sem executar nenhum `cd`
