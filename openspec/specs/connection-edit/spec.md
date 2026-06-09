### Requirement: Editar conexão existente
O sistema SHALL permitir ao usuário editar os dados de uma conexão já salva, abrindo um formulário pré-preenchido com os dados não sensíveis da conexão.

#### Scenario: Abrir formulário de edição com dados preenchidos
- **WHEN** o usuário seleciona "Edit" no menu de contexto de uma conexão
- **THEN** o modal de formulário é aberto com label, host, porta, usuário e tipo de autenticação já preenchidos com os valores atuais da conexão

#### Scenario: Campos de credencial ficam em branco no modo de edição
- **WHEN** o formulário de edição é aberto
- **THEN** os campos de senha e chave privada estão vazios com placeholder "Leave blank to keep current"

#### Scenario: Salvar edição sem alterar credenciais
- **WHEN** o usuário edita label, host, porta ou usuário e salva sem preencher campos de credencial
- **THEN** a conexão é atualizada com os novos dados e as credenciais anteriores são preservadas

#### Scenario: Salvar edição com nova credencial
- **WHEN** o usuário preenche um novo valor no campo de senha ou chave privada e salva
- **THEN** a conexão é atualizada com a nova credencial criptografada substituindo a anterior

#### Scenario: Campos obrigatórios não preenchidos no modo de edição
- **WHEN** o usuário remove o conteúdo de label, host ou usuário e tenta salvar
- **THEN** o sistema exibe notificação de erro e não salva

#### Scenario: Conexão atualizada aparece na lista imediatamente
- **WHEN** a edição é salva com sucesso
- **THEN** a lista de conexões reflete os novos dados da conexão sem necessidade de recarregar o app
