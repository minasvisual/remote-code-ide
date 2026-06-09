## MODIFIED Requirements

### Requirement: Salvar arquivo com atalho de teclado
O sistema SHALL salvar o arquivo ativo ao pressionar Ctrl+S (Windows/Linux) ou Cmd+S (macOS). O comando registrado SHALL sempre referenciar o estado atual do editor, independentemente de quantas trocas de aba ocorreram desde a montagem do componente.

#### Scenario: Ctrl+S salva o arquivo ativo
- **WHEN** o usuário pressiona Ctrl+S com uma aba ativa e dirty
- **THEN** o conteúdo atual é enviado ao servidor via `sftp:writeFile`

#### Scenario: Ctrl+S não faz nada se arquivo não está dirty
- **WHEN** o usuário pressiona Ctrl+S sem alterações pendentes
- **THEN** nenhuma operação de rede é disparada

#### Scenario: Ctrl+S salva corretamente após troca de aba
- **WHEN** o usuário abre um arquivo, troca para outro arquivo e pressiona Ctrl+S
- **THEN** o arquivo atualmente ativo (o segundo) é salvo, não o arquivo que estava ativo na montagem inicial do editor
