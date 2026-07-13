## ADDED Requirements

### Requirement: Baixar arquivo remoto individual
O sistema SHALL permitir baixar um arquivo remoto para um caminho local escolhido pelo usuário, através do item "Download" no menu de contexto do explorador de arquivos.

#### Scenario: Baixar arquivo com sucesso
- **WHEN** o usuário aciona "Download" no menu de contexto de um arquivo e escolhe um destino no diálogo "Salvar como"
- **THEN** o sistema baixa o conteúdo do arquivo via SFTP, grava no caminho escolhido e exibe uma notificação de sucesso

#### Scenario: Cancelar o diálogo de salvar
- **WHEN** o usuário aciona "Download" em um arquivo e cancela o diálogo "Salvar como" (sem escolher destino)
- **THEN** nenhum dado é transferido do servidor e nenhuma notificação é exibida

#### Scenario: Falha durante o download do arquivo
- **WHEN** a leitura SFTP ou a escrita local falha após o usuário escolher um destino
- **THEN** o sistema remove qualquer arquivo local parcialmente escrito e exibe uma notificação de erro

### Requirement: Baixar pasta remota como arquivo zip
O sistema SHALL permitir baixar uma pasta remota e todo o seu conteúdo (recursivamente) como um único arquivo `.zip`, para um caminho local escolhido pelo usuário, através do item "Download" no menu de contexto do explorador de arquivos.

#### Scenario: Baixar pasta com sucesso
- **WHEN** o usuário aciona "Download" no menu de contexto de uma pasta e escolhe um destino no diálogo "Salvar como" (nome sugerido `<nome-da-pasta>.zip`)
- **THEN** o sistema percorre recursivamente todo o conteúdo da pasta via SFTP, compacta em um arquivo `.zip` preservando a estrutura de subdiretórios, grava no caminho escolhido e exibe uma notificação de sucesso

#### Scenario: Cancelar o diálogo de salvar da pasta
- **WHEN** o usuário aciona "Download" em uma pasta e cancela o diálogo "Salvar como"
- **THEN** nenhum dado é transferido do servidor e nenhuma notificação é exibida

#### Scenario: Pasta contém link simbólico
- **WHEN** a árvore da pasta sendo baixada contém uma entrada do tipo link simbólico
- **THEN** o sistema ignora essa entrada (não a segue nem a inclui no zip) e continua o download normalmente para as demais entradas

#### Scenario: Falha durante a compactação ou download da pasta
- **WHEN** a leitura SFTP de algum arquivo da árvore ou a escrita do zip local falha após o usuário escolher um destino
- **THEN** o sistema remove o arquivo `.zip` local parcialmente escrito e exibe uma notificação de erro
