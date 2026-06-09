## ADDED Requirements

### Requirement: Fechar aba ativa com atalho global
O sistema SHALL fechar a aba ativa ao pressionar Ctrl+W em qualquer parte da janela, exceto quando o foco está em um campo de texto nativo.

#### Scenario: Ctrl+W fecha a aba ativa
- **WHEN** o usuário pressiona Ctrl+W com pelo menos uma aba aberta
- **THEN** a aba ativa é fechada e o foco passa para a aba adjacente, ou a `WelcomeScreen` é exibida se não houver outras abas

#### Scenario: Ctrl+W é ignorado em inputs de texto
- **WHEN** o foco está em um `<input>` ou `<textarea>` e o usuário pressiona Ctrl+W
- **THEN** o evento não é interceptado e o comportamento padrão do elemento é mantido

#### Scenario: Ctrl+W não faz nada sem abas abertas
- **WHEN** nenhuma aba está aberta e o usuário pressiona Ctrl+W
- **THEN** nenhuma ação é executada

### Requirement: Navegar entre abas com atalho global
O sistema SHALL permitir ao usuário ciclar entre abas abertas usando Ctrl+Tab (próxima) e Ctrl+Shift+Tab (anterior) em qualquer parte da janela.

#### Scenario: Ctrl+Tab avança para a próxima aba
- **WHEN** há múltiplas abas abertas e o usuário pressiona Ctrl+Tab
- **THEN** a aba seguinte (índice + 1, com wrap-around) torna-se a aba ativa

#### Scenario: Ctrl+Shift+Tab volta para a aba anterior
- **WHEN** há múltiplas abas abertas e o usuário pressiona Ctrl+Shift+Tab
- **THEN** a aba anterior (índice - 1, com wrap-around) torna-se a aba ativa

#### Scenario: Ciclo de aba única não tem efeito visível
- **WHEN** apenas uma aba está aberta e o usuário pressiona Ctrl+Tab ou Ctrl+Shift+Tab
- **THEN** a mesma aba permanece ativa e nenhum erro ocorre
