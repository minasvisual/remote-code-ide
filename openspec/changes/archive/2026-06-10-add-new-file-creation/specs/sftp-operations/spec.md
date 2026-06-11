## ADDED Requirements

### Requirement: Criar arquivo remoto vazio
O sistema SHALL criar um arquivo vazio em um caminho remoto especificado via SFTP. Antes de escrever, a operação SHALL verificar se o arquivo já existe via `sftp.stat`; se existir, SHALL rejeitar com código de erro `FILE_EXISTS` sem escrever nada.

#### Scenario: Criar arquivo com sucesso
- **WHEN** o usuário confirma um nome de arquivo no NewFileDialog e o arquivo não existe no servidor
- **THEN** o sistema chama `sftp:createFile` com o sessionId e o caminho completo, um arquivo vazio é criado no servidor remoto, e o diretório de destino é recarregado via `sftp:listDir`

#### Scenario: Arquivo já existe
- **WHEN** o usuário tenta criar um arquivo com um nome que já existe no caminho de destino
- **THEN** o sistema retorna erro com código `FILE_EXISTS`, nenhum arquivo é sobrescrito, e o dialog exibe uma mensagem de erro inline

#### Scenario: Falha ao criar arquivo
- **WHEN** a criação do arquivo falha por motivo distinto de existência (ex: permissão negada, caminho inválido)
- **THEN** o sistema retorna um erro descritivo, nenhum arquivo é criado, e uma notificação de erro é exibida
