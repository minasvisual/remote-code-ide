### Requirement: About panel sidebar view
O sistema SHALL exibir um painel "About" na sidebar quando o usuário selecionar o ícone de informação na ActivityBar.

#### Scenario: Abrir painel About
- **WHEN** o usuário clica no ícone Info na ActivityBar
- **THEN** a sidebar exibe o `AboutPanel` com a aba "About" ativa por padrão

#### Scenario: Painel visível independente de sessão
- **WHEN** o usuário clica no ícone Info sem uma sessão SSH ativa
- **THEN** o `AboutPanel` é exibido normalmente (não requer sessão ativa)

### Requirement: Aba About com metadados do app
O sistema SHALL exibir na aba "About" as informações de versão e metadados do aplicativo.

#### Scenario: Exibir versão do app
- **WHEN** o usuário está na aba About
- **THEN** a versão do app (de `package.json`) é exibida

#### Scenario: Exibir versões de runtime
- **WHEN** o usuário está na aba About
- **THEN** as versões de Node.js, Electron e Chromium são exibidas (obtidas do processo Electron via preload)

#### Scenario: Exibir informações do desenvolvedor
- **WHEN** o usuário está na aba About
- **THEN** o nome do autor, licença e link do repositório são exibidos

#### Scenario: Exibir changelog
- **WHEN** o usuário está na aba About
- **THEN** uma lista de entradas de changelog é exibida em ordem cronológica inversa

### Requirement: Aba Docs com referência de atalhos e FAQ
O sistema SHALL exibir na aba "Docs" uma tabela de atalhos de teclado, instruções de uso e FAQ.

#### Scenario: Tabela de atalhos de teclado
- **WHEN** o usuário está na aba Docs
- **THEN** uma tabela listando todos os atalhos disponíveis (combinação de teclas + descrição) é exibida

#### Scenario: Seção de instruções
- **WHEN** o usuário está na aba Docs
- **THEN** uma seção com instruções básicas de uso do app é exibida (como conectar, abrir arquivos, usar o terminal)

#### Scenario: Seção FAQ
- **WHEN** o usuário está na aba Docs
- **THEN** uma seção de perguntas e respostas frequentes é exibida

### Requirement: Navegação entre abas do painel About
O sistema SHALL permitir ao usuário alternar entre as abas "About" e "Docs" dentro do painel.

#### Scenario: Trocar para aba Docs
- **WHEN** o usuário clica na aba "Docs"
- **THEN** o conteúdo da aba Docs é exibido e a aba fica marcada como ativa

#### Scenario: Trocar para aba About
- **WHEN** o usuário clica na aba "About"
- **THEN** o conteúdo da aba About é exibido e a aba fica marcada como ativa
