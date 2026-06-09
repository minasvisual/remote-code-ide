## MODIFIED Requirements

### Requirement: Deletar conexão
O sistema SHALL permitir remover uma conexão da lista permanentemente. A ação de exclusão SHALL ser acessível exclusivamente pelo menu de contexto (botão direito) e SHALL exigir confirmação digitada pelo usuário para prevenir exclusões acidentais.

#### Scenario: Deletar conexão via menu de contexto com confirmação
- **WHEN** o usuário seleciona "Delete" no menu de contexto e digita `excluir` no campo de confirmação e clica em "Delete"
- **THEN** a conexão é removida da lista e do `electron-store`

#### Scenario: Botão de confirmar exclusão desabilitado até texto correto
- **WHEN** o modal de confirmação está aberto e o campo de texto não contém `excluir` (case-insensitive)
- **THEN** o botão de confirmar exclusão está desabilitado

#### Scenario: Cancelar exclusão não remove a conexão
- **WHEN** o modal de confirmação está aberto e o usuário clica em "Cancel" ou pressiona Escape
- **THEN** nenhuma ação de exclusão é executada e a conexão permanece na lista

## REMOVED Requirements

### Requirement: Botão de deletar inline na lista de conexões
**Reason**: Substituído pelo menu de contexto com confirmação — o botão inline era fácil de acionar acidentalmente e não oferecia proteção contra exclusões não intencionais.
**Migration**: Use o clique com botão direito sobre a conexão para acessar a opção de exclusão.
