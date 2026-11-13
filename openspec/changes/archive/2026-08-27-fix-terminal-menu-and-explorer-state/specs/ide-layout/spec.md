## ADDED Requirements

### Requirement: Estado dos painéis da sidebar preservado ao trocar de visualização
Uma vez que uma sessão SSH esteja ativa, o sistema SHALL preservar o estado interno de cada painel da sidebar (Explorer, Connections, Extensions, AI Chat, About) quando o usuário alternar entre eles pela ActivityBar, sem recarregar dados já obtidos.

#### Scenario: Voltar ao Explorer preserva pastas expandidas
- **WHEN** o usuário expande pastas no `FileExplorer`, navega para outro painel da sidebar (ex: AI Chat) e depois volta para o Explorer
- **THEN** as pastas previamente expandidas continuam expandidas e seus conteúdos já carregados SHALL NOT ser recarregados via `sftp:listDir`

#### Scenario: Trocar de painel não descarta a listagem raiz já carregada
- **WHEN** o `FileExplorer` já carregou a listagem do diretório raiz da sessão ativa e o usuário troca para outro painel da sidebar
- **THEN** ao retornar ao Explorer, a listagem raiz exibida SHALL ser a mesma já carregada, sem uma nova chamada de carregamento
