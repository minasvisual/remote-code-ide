## ADDED Requirements

### Requirement: Instalar extensão pelo painel
O `ExtensionsPanel` SHALL instalar de fato a extensão selecionada nos resultados de busca,
via `extensions:install`, em vez de apenas baixar o `.vsix` e descartá-lo.

#### Scenario: Instalação a partir de um resultado de busca
- **WHEN** o usuário clica no botão de instalar em um resultado de busca
- **THEN** o painel chama `getRemoteApi().extensions.install(...)`, exibe um indicador de
  progresso enquanto a instalação ocorre, e notifica sucesso ou erro ao final

#### Scenario: Extensão já instalada
- **WHEN** o usuário busca uma extensão cujo id já está na lista de instaladas
- **THEN** o botão de instalar é substituído por uma indicação de "já instalada"

### Requirement: Ver e gerenciar extensões instaladas
O `ExtensionsPanel` SHALL exibir uma seção separada com as extensões instaladas,
mostrando nome, versão, estado habilitado/desabilitado e um indicador para extensões sem
suporte a ativação no modo básico.

#### Scenario: Seção de instaladas com extensões ativáveis e não ativáveis
- **WHEN** há extensões instaladas, algumas com `contributes.themes` e outras sem
- **THEN** todas aparecem na seção "Installed", e as sem suporte exibem o rótulo "not
  activatable in basic mode"

#### Scenario: Alternar habilitado/desabilitado
- **WHEN** o usuário aciona o alternador de uma extensão instalada
- **THEN** o painel chama `extensions:setEnabled` e reflete o novo estado assim que a
  chamada é concluída

#### Scenario: Desinstalar pelo painel
- **WHEN** o usuário aciona a ação de desinstalar em uma extensão da seção "Installed"
- **THEN** o painel chama `extensions:uninstall` e remove a extensão da lista exibida ao
  concluir

### Requirement: ActivityBar expõe o painel de extensões
O `ActivityBar` SHALL incluir um item que define `sidebarView` como `'extensions'`,
tornando o `ExtensionsPanel` alcançável pela UI.

#### Scenario: Ícone de extensões visível e funcional
- **WHEN** o aplicativo está em execução, com ou sem sessão ativa
- **THEN** a `ActivityBar` exibe um item de Extensions e clicar nele exibe o
  `ExtensionsPanel` na sidebar
