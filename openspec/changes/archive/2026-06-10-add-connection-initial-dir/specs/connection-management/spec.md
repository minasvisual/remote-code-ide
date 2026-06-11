## MODIFIED Requirements

### Requirement: Criar nova conexão SSH
O sistema SHALL permitir ao usuário cadastrar uma nova conexão SSH fornecendo label, host, porta, usuário, método de autenticação (senha ou chave privada PEM) e, opcionalmente, um diretório inicial (`initialDirectory`).

#### Scenario: Salvar conexão com autenticação por senha
- **WHEN** o usuário preenche label, host, porta, usuário e senha e clica em "Save"
- **THEN** a conexão é persistida no `electron-store` com a senha criptografada via `safeStorage` e exibida na lista de conexões

#### Scenario: Salvar conexão com chave privada
- **WHEN** o usuário seleciona "Private Key", cola o conteúdo PEM e clica em "Save"
- **THEN** a conexão é persistida com a chave privada criptografada via `safeStorage`

#### Scenario: Salvar conexão com initialDirectory
- **WHEN** o usuário preenche o campo "Initial Directory" com um caminho absoluto (ex.: `/home/user/projects`) e clica em "Save"
- **THEN** a conexão é persistida com o campo `initialDirectory` e o explorador de arquivos usará esse caminho ao conectar

#### Scenario: Salvar conexão sem initialDirectory
- **WHEN** o usuário deixa o campo "Initial Directory" em branco e clica em "Save"
- **THEN** a conexão é persistida sem `initialDirectory` e o explorador usará `/` como raiz

#### Scenario: Campos obrigatórios não preenchidos
- **WHEN** o usuário clica em "Save" sem preencher label, host ou usuário
- **THEN** o sistema exibe notificação de erro "Label, host and username are required" e não salva
