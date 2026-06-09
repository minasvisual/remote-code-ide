## ADDED Requirements

### Requirement: Infraestrutura de testes E2E configurada
O projeto SHALL possuir Playwright configurado para lançar e controlar a aplicação Electron compilada, permitindo testes de interface que simulam interações reais do usuário.

#### Scenario: Executar suíte de testes E2E
- **WHEN** o desenvolvedor executa `npm run test:e2e`
- **THEN** o Playwright compila a aplicação (se necessário), lança o executável Electron e executa todos os arquivos `*.spec.ts` em `tests/e2e/`
- **THEN** o resultado exibe o status de cada teste com screenshots em caso de falha

#### Scenario: Aplicação inicia sem erros
- **WHEN** o Playwright lança a aplicação Electron via `_electron.launch()`
- **THEN** a janela principal abre e a UI do MyCODEany é visível
- **THEN** nenhuma caixa de diálogo de erro é exibida na inicialização

### Requirement: Fluxo E2E — Criar conexão SSH
O sistema SHALL permitir que o teste E2E crie uma nova conexão SSH através da UI e verifique que ela aparece na lista.

#### Scenario: Criar conexão com dados válidos
- **WHEN** o usuário abre o painel de conexões e clica em "New Connection"
- **THEN** o formulário de conexão é exibido
- **WHEN** o usuário preenche nome, host, porta, usuário e senha e clica em "Save"
- **THEN** a conexão aparece na lista de conexões com o nome informado

#### Scenario: Persistência da conexão
- **WHEN** uma conexão é salva via UI
- **THEN** ao reabrir o painel de conexões a conexão continua listada

### Requirement: Fluxo E2E — Listar arquivos remotos
O sistema SHALL permitir que o teste E2E conecte a um servidor SSH e liste os arquivos do diretório raiz remoto.

#### Scenario: Listar arquivos após conexão bem-sucedida
- **WHEN** o usuário seleciona uma conexão existente e clica em "Connect"
- **THEN** a aplicação estabelece a sessão SSH/SFTP
- **THEN** o FileExplorer exibe a árvore de arquivos do servidor remoto com pelo menos um item visível

#### Scenario: Expansão de subdiretório remoto
- **WHEN** o usuário clica em um diretório listado no FileExplorer
- **THEN** os arquivos e subdiretórios contidos são listados abaixo do diretório pai

### Requirement: Fluxo E2E — Abrir arquivo no editor
O sistema SHALL permitir que o teste E2E abra um arquivo remoto no editor Monaco e verifique que o conteúdo é exibido.

#### Scenario: Abrir arquivo remoto no Monaco
- **WHEN** o usuário clica em um arquivo de texto no FileExplorer (estando conectado)
- **THEN** uma nova aba é aberta no EditorTabBar com o nome do arquivo
- **THEN** o conteúdo do arquivo é exibido na área do editor

#### Scenario: Múltiplos arquivos abertos em abas
- **WHEN** o usuário clica em um segundo arquivo diferente
- **THEN** uma segunda aba é criada no EditorTabBar
- **THEN** o primeiro arquivo continua acessível via sua aba

### Requirement: Fluxo E2E — Desconectar da conexão
O sistema SHALL permitir que o teste E2E desconecte de uma sessão SSH ativa e verifique que a UI reflete o estado desconectado.

#### Scenario: Desconectar sessão ativa
- **WHEN** o usuário clica no botão de desconectar (ou fecha a sessão)
- **THEN** a sessão SSH é encerrada
- **THEN** o FileExplorer limpa a árvore de arquivos ou exibe mensagem de desconectado
- **THEN** a StatusBar não exibe mais o host da conexão ativa

#### Scenario: Reconectar após desconexão
- **WHEN** após desconectar o usuário clica em "Connect" novamente na mesma conexão
- **THEN** uma nova sessão SSH é estabelecida com sucesso
- **THEN** o FileExplorer exibe os arquivos remotos novamente
