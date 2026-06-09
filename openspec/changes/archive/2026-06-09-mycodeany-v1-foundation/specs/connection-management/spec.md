## ADDED Requirements

### Requirement: Criar nova conexão SSH
O sistema SHALL permitir ao usuário cadastrar uma nova conexão SSH fornecendo label, host, porta, usuário e método de autenticação (senha ou chave privada PEM).

#### Scenario: Salvar conexão com autenticação por senha
- **WHEN** o usuário preenche label, host, porta, usuário e senha e clica em "Save"
- **THEN** a conexão é persistida no `electron-store` com a senha criptografada via `safeStorage` e exibida na lista de conexões

#### Scenario: Salvar conexão com chave privada
- **WHEN** o usuário seleciona "Private Key", cola o conteúdo PEM e clica em "Save"
- **THEN** a conexão é persistida com a chave privada criptografada via `safeStorage`

#### Scenario: Campos obrigatórios não preenchidos
- **WHEN** o usuário clica em "Save" sem preencher label, host ou usuário
- **THEN** o sistema exibe notificação de erro "Label, host and username are required" e não salva

### Requirement: Listar conexões salvas
O sistema SHALL exibir a lista de todas as conexões cadastradas na sidebar ao iniciar o app.

#### Scenario: Lista populada ao abrir o app
- **WHEN** o app é aberto
- **THEN** o painel de conexões exibe todas as conexões persistidas com label, usuário, host e porta visíveis

#### Scenario: Lista vazia
- **WHEN** não há conexões cadastradas
- **THEN** o painel exibe mensagem "No connections yet." e botão "Add Connection"

### Requirement: Deletar conexão
O sistema SHALL permitir remover uma conexão da lista permanentemente.

#### Scenario: Deletar conexão existente
- **WHEN** o usuário clica no botão de deletar de uma conexão
- **THEN** a conexão é removida da lista e do `electron-store`

### Requirement: Testar conexão antes de salvar
O sistema SHALL permitir testar as credenciais de uma nova conexão sem precisar salvá-la primeiro.

#### Scenario: Teste bem-sucedido
- **WHEN** o usuário clica em "Test Connection" com credenciais válidas
- **THEN** o sistema exibe "✓ Connection successful" ao lado do botão

#### Scenario: Teste falho
- **WHEN** o usuário clica em "Test Connection" com credenciais inválidas ou host inacessível
- **THEN** o sistema exibe "✗ <mensagem de erro>" ao lado do botão

#### Scenario: Timeout no teste
- **WHEN** o host não responde em 10 segundos
- **THEN** o sistema exibe "✗ Connection timed out"

### Requirement: Credenciais nunca expostas ao renderer
O sistema SHALL garantir que senhas e chaves privadas criptografadas nunca sejam enviadas ao processo renderer após o save.

#### Scenario: Listar conexões não retorna credenciais plaintext
- **WHEN** o renderer solicita `connections:list`
- **THEN** os objetos retornados contêm apenas campos `encryptedPassword` e `encryptedPrivateKey` (opacos) — nunca plaintext
