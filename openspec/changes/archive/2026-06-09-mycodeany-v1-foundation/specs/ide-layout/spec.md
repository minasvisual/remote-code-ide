## ADDED Requirements

### Requirement: Layout principal do IDE
O sistema SHALL renderizar um layout de IDE com ActivityBar vertical, sidebar com painéis intercambiáveis, área principal de editor e StatusBar horizontal inferior.

#### Scenario: Layout inicial sem sessão ativa
- **WHEN** o app abre sem sessão SSH ativa
- **THEN** a sidebar exibe o painel de conexões (`ConnectionManager`) e a área principal exibe `WelcomeScreen`

#### Scenario: Layout com sessão ativa
- **WHEN** uma sessão SSH é estabelecida
- **THEN** a sidebar pode exibir o explorador de arquivos ao navegar para ele via ActivityBar

### Requirement: ActivityBar com navegação de painéis
O sistema SHALL exibir uma barra de atividades vertical com ícones para alternar entre os painéis da sidebar.

#### Scenario: Trocar para explorador de arquivos
- **WHEN** o usuário clica no ícone de explorador na ActivityBar
- **THEN** a sidebar exibe o `FileExplorer` (somente se houver sessão ativa)

#### Scenario: Trocar para conexões
- **WHEN** o usuário clica no ícone de conexões na ActivityBar
- **THEN** a sidebar exibe o `ConnectionManager`

#### Scenario: Trocar para extensões
- **WHEN** o usuário clica no ícone de extensões na ActivityBar
- **THEN** a sidebar exibe o `ExtensionsPanel`

### Requirement: StatusBar com informações da sessão
O sistema SHALL exibir uma barra de status inferior com informações da sessão SSH ativa e atalhos de ação.

#### Scenario: StatusBar com sessão ativa
- **WHEN** há uma sessão SSH ativa
- **THEN** a StatusBar exibe o label da conexão e oferece opção de desconectar

#### Scenario: StatusBar sem sessão
- **WHEN** não há sessão ativa
- **THEN** a StatusBar exibe estado "Not connected"

### Requirement: Painel de terminal toggleable
O sistema SHALL permitir abrir e fechar o painel de terminal sem perder a área do editor.

#### Scenario: Abrir terminal
- **WHEN** o usuário clica em "Terminal ▸"
- **THEN** o painel de terminal ocupa 35% da altura da área principal e o editor ocupa 65%

#### Scenario: Fechar terminal
- **WHEN** o usuário clica em "Terminal ▾"
- **THEN** o painel de terminal é ocultado e o editor ocupa 100% da área principal

### Requirement: Notificações com auto-dismiss
O sistema SHALL exibir notificações de sucesso, erro e informação que desaparecem automaticamente após 4 segundos.

#### Scenario: Notificação de sucesso exibida
- **WHEN** uma operação bem-sucedida ocorre (ex: conexão estabelecida, arquivo salvo)
- **THEN** uma notificação verde aparece na tela e some após 4 segundos

#### Scenario: Notificação de erro exibida
- **WHEN** uma operação falha
- **THEN** uma notificação vermelha aparece com a mensagem de erro

#### Scenario: Dismiss manual
- **WHEN** o usuário clica na notificação
- **THEN** ela é imediatamente removida
