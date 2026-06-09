## ADDED Requirements

### Requirement: Buscar extensões no OpenVSX
O sistema SHALL permitir buscar extensões no registry OpenVSX e exibir os resultados com nome, publisher e descrição.

#### Scenario: Busca retorna resultados
- **WHEN** o usuário digita um termo de busca no painel de extensões
- **THEN** o sistema consulta `https://open-vsx.org/api/-/search` e exibe os resultados

#### Scenario: Busca sem resultados
- **WHEN** o termo buscado não corresponde a nenhuma extensão
- **THEN** o painel exibe mensagem indicando ausência de resultados

#### Scenario: Acessar painel de extensões
- **WHEN** o usuário clica no ícone de extensões na ActivityBar
- **THEN** o `ExtensionsPanel` é exibido na sidebar
