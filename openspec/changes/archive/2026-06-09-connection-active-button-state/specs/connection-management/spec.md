## MODIFIED Requirements

### Requirement: Conectar a uma conexão
O sistema SHALL permitir ao usuário iniciar uma sessão SSH a partir da lista de conexões. O botão de ação SHALL refletir o estado da sessão ativa: exibindo "Disconnect" para a conexão ativa e desabilitado para as demais enquanto houver uma sessão ativa.

#### Scenario: Botão "Connect" disponível quando nenhuma sessão está ativa
- **WHEN** não há nenhuma sessão SSH ativa
- **THEN** o botão "Connect" de todas as conexões está habilitado

#### Scenario: Botão muda para "Disconnect" na conexão ativa
- **WHEN** o usuário conecta a uma conexão e a sessão SSH é estabelecida com sucesso
- **THEN** o botão daquela conexão exibe "Disconnect"

#### Scenario: Botões das demais conexões ficam desabilitados
- **WHEN** há uma sessão SSH ativa
- **THEN** os botões "Connect" de todas as outras conexões estão desabilitados

#### Scenario: Clicar em "Disconnect" encerra a sessão
- **WHEN** o usuário clica em "Disconnect" na conexão ativa
- **THEN** a sessão SSH é encerrada e todos os botões "Connect" voltam ao estado habilitado
