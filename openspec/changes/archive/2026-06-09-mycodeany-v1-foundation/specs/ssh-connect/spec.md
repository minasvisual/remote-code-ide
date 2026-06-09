## ADDED Requirements

### Requirement: Estabelecer sessão SSH
O sistema SHALL estabelecer uma sessão SSH a partir de uma conexão salva, retornando um `sessionId` para uso em operações SFTP e terminal.

#### Scenario: Conexão bem-sucedida por senha
- **WHEN** o usuário clica em "Connect" em uma conexão com authType `password`
- **THEN** o sistema decifra a senha via `safeStorage`, conecta via ssh2 e exibe notificação "Connected to <label>"

#### Scenario: Conexão bem-sucedida por chave privada
- **WHEN** o usuário clica em "Connect" em uma conexão com authType `privateKey`
- **THEN** o sistema decifra a chave privada, normaliza os line endings (CRLF → LF) e conecta via ssh2

#### Scenario: Falha na conexão
- **WHEN** as credenciais são inválidas ou o host está inacessível
- **THEN** o sistema exibe notificação de erro com a mensagem retornada pelo ssh2

#### Scenario: Botão Connect desabilitado durante conexão
- **WHEN** uma conexão está em andamento (`isConnecting = true`)
- **THEN** todos os botões "Connect" ficam desabilitados até a operação concluir

### Requirement: Normalizar line endings em chaves privadas
O sistema SHALL normalizar os line endings da chave privada PEM para `\n` antes de passá-la ao ssh2, para compatibilidade com chaves geradas em Windows (`\r\n`).

#### Scenario: Chave com CRLF conecta com sucesso
- **WHEN** a chave privada armazenada contém `\r\n` como separador de linhas
- **THEN** o sistema substitui todos os `\r\n` por `\n` antes de passar ao ssh2 e a conexão é estabelecida

#### Scenario: Chave com LF não é alterada
- **WHEN** a chave privada já usa `\n`
- **THEN** o sistema a passa inalterada ao ssh2

### Requirement: Encerrar sessão SSH
O sistema SHALL desconectar uma sessão SSH ativa e limpar arquivos temporários associados.

#### Scenario: Disconnect explícito
- **WHEN** o usuário aciona "Disconnect"
- **THEN** a sessão SSH é encerrada, os arquivos temporários da sessão são deletados e o `activeSession` é limpo

### Requirement: Tratar desconexão inesperada
O sistema SHALL detectar quando uma sessão SSH é encerrada pelo servidor e notificar o renderer.

#### Scenario: Queda da sessão remota
- **WHEN** o servidor fecha a conexão SSH (eventos `end`, `close` ou `error`)
- **THEN** o main process emite `ssh:disconnected` para o renderer, que limpa o `activeSession` e exibe "SSH session disconnected"
