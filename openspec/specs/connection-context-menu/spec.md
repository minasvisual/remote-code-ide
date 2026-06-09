### Requirement: Abrir menu de contexto ao clicar com botão direito em uma conexão
O sistema SHALL exibir um menu de contexto posicionado ao cursor quando o usuário clicar com o botão direito em um item da lista de conexões.

#### Scenario: Menu aparece no clique direito
- **WHEN** o usuário clica com o botão direito em qualquer item de conexão
- **THEN** um menu de contexto é exibido próximo ao cursor com as opções "Edit" e "Delete"

#### Scenario: Menu fecha ao clicar fora
- **WHEN** o menu de contexto está visível e o usuário clica em qualquer área fora dele
- **THEN** o menu é fechado sem executar nenhuma ação

#### Scenario: Menu fecha ao pressionar Escape
- **WHEN** o menu de contexto está visível e o usuário pressiona a tecla Escape
- **THEN** o menu é fechado sem executar nenhuma ação

#### Scenario: Apenas um menu aberto por vez
- **WHEN** o usuário clica com botão direito em uma segunda conexão enquanto o menu de outra está aberto
- **THEN** o menu anterior é fechado e um novo menu é aberto para a segunda conexão

#### Scenario: Menu não ultrapassa a borda da janela
- **WHEN** o clique direito ocorre próximo à borda direita ou inferior da janela
- **THEN** o menu é posicionado de forma que fique inteiramente visível dentro da janela
