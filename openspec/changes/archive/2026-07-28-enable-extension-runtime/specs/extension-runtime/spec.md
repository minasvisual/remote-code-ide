## ADDED Requirements

### Requirement: Instalar extensão a partir do OpenVSX
O sistema SHALL baixar o pacote `.vsix` de uma extensão, extraí-lo para o diretório de
extensões do usuário e registrar seu estado de instalação de forma persistente.

#### Scenario: Instalação bem-sucedida
- **WHEN** o usuário aciona a instalação de uma extensão encontrada na busca
- **THEN** o sistema baixa o `.vsix`, extrai seu conteúdo para
  `userData/extensions/<publisher>.<name>-<version>` e passa a listar a extensão como
  instalada, mesmo após reiniciar o aplicativo

#### Scenario: Falha no download ou na extração
- **WHEN** o download do `.vsix` falha OU o arquivo baixado não é um zip válido
- **THEN** o sistema não registra a extensão como instalada e retorna um erro descritivo

#### Scenario: Manifesto com namespace ou nome inválido
- **WHEN** o `namespace` ou `name` da extensão contém caracteres fora de `[a-zA-Z0-9_-]`
- **THEN** o sistema rejeita a instalação sem tocar no sistema de arquivos

### Requirement: Listar extensões instaladas
O sistema SHALL expor a lista de extensões instaladas, incluindo id, versão, estado
habilitado/desabilitado e se possuem contribuição ativável no modo básico.

#### Scenario: Listagem após instalação
- **WHEN** uma ou mais extensões estão instaladas
- **THEN** `extensions:list` retorna cada uma com `id`, `version`, `enabled` e
  `hasBasicModeContribution`

#### Scenario: Listagem vazia
- **WHEN** nenhuma extensão foi instalada
- **THEN** `extensions:list` retorna uma lista vazia

### Requirement: Habilitar ou desabilitar extensão instalada
O sistema SHALL permitir alternar o estado habilitado de uma extensão instalada e, quando
a extensão contribui um tema (`contributes.themes`), refletir essa mudança no editor
Monaco.

#### Scenario: Habilitar extensão de tema
- **WHEN** o usuário habilita uma extensão instalada cujo manifesto declara
  `contributes.themes`
- **THEN** o sistema lê o JSON do tema, registra-o via `monaco.editor.defineTheme` e o
  editor passa a usar esse tema

#### Scenario: Desabilitar extensão de tema ativa
- **WHEN** o usuário desabilita uma extensão de tema que está atualmente aplicada ao
  editor
- **THEN** o editor volta imediatamente para o tema padrão (`vs-dark`)

#### Scenario: Habilitar extensão sem contribuição suportada
- **WHEN** o usuário habilita uma extensão cujo manifesto não declara `contributes.themes`
- **THEN** o sistema marca a extensão como habilitada no estado persistido, mas nenhuma
  mudança é aplicada ao editor, e a extensão é sinalizada como "não ativável no modo
  básico"

#### Scenario: Caminho de arquivo de tema fora do diretório da extensão
- **WHEN** o `path` de um tema no manifesto resolve para um caminho fora do diretório de
  instalação da própria extensão
- **THEN** o sistema recusa ler o arquivo e não aplica nenhum tema

### Requirement: Desinstalar extensão
O sistema SHALL permitir remover uma extensão instalada, apagando seus arquivos e sua
entrada no estado persistido.

#### Scenario: Desinstalação de extensão habilitada
- **WHEN** o usuário desinstala uma extensão de tema que está habilitada e ativa
- **THEN** o sistema remove seus arquivos e sua entrada da lista, e o editor volta ao
  tema padrão

#### Scenario: Desinstalação de extensão inexistente
- **WHEN** é solicitada a desinstalação de um id de extensão que não está instalado
- **THEN** o sistema retorna um erro descritivo sem lançar exceção não tratada
