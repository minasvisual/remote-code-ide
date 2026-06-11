## MODIFIED Requirements

### Requirement: ActivityBar com navegação de painéis
O sistema SHALL exibir uma barra de atividades vertical com ícones para alternar entre os painéis da sidebar. Os ícones de fluxo de trabalho (Explorer, Connections, Extensions) SHALL ser ancorados no topo; o ícone de informação (About) SHALL ser ancorado no rodapé da barra.

#### Scenario: Trocar para explorador de arquivos
- **WHEN** o usuário clica no ícone de explorador na ActivityBar
- **THEN** a sidebar exibe o `FileExplorer` (somente se houver sessão ativa)

#### Scenario: Trocar para conexões
- **WHEN** o usuário clica no ícone de conexões na ActivityBar
- **THEN** a sidebar exibe o `ConnectionManager`

#### Scenario: Trocar para extensões
- **WHEN** o usuário clica no ícone de extensões na ActivityBar
- **THEN** a sidebar exibe o `ExtensionsPanel`

#### Scenario: Trocar para About
- **WHEN** o usuário clica no ícone Info (círculo com "i") na parte inferior da ActivityBar
- **THEN** a sidebar exibe o `AboutPanel`
