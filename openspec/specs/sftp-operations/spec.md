## ADDED Requirements

### Requirement: Listar diretório remoto
O sistema SHALL listar o conteúdo de um diretório remoto via SFTP, retornando metadados de arquivos e subdiretórios.

#### Scenario: Listar diretório raiz
- **WHEN** o explorador de arquivos é aberto com uma sessão ativa
- **THEN** o sistema chama `sftp:listDir` com `/` e exibe os itens retornados

#### Scenario: Lazy-load de subdiretório
- **WHEN** o usuário expande um diretório no explorador pela primeira vez
- **THEN** o sistema carrega os filhos via `sftp:listDir` e os exibe; expansões subsequentes usam o cache local

### Requirement: Ler arquivo remoto
O sistema SHALL baixar o conteúdo de um arquivo remoto para um arquivo temporário local e retornar o conteúdo e o caminho local.

#### Scenario: Abrir arquivo no editor
- **WHEN** o usuário clica em um arquivo no explorador
- **THEN** o sistema baixa o arquivo para `os.tmpdir()/mycodeany/<sessionId>/<filename>`, retorna o conteúdo e abre uma aba no editor

#### Scenario: Arquivo já aberto em aba existente
- **WHEN** o usuário clica em um arquivo que já tem uma aba aberta
- **THEN** o sistema foca a aba existente sem re-baixar o arquivo

#### Scenario: Arquivo maior que 5 MB
- **WHEN** o arquivo remoto tem mais de 5 MB
- **THEN** o sistema exibe aviso ao usuário antes de prosseguir com o download

### Requirement: Escrever arquivo remoto
O sistema SHALL salvar o conteúdo editado de volta ao arquivo remoto via SFTP.

#### Scenario: Salvar com Ctrl+S
- **WHEN** o usuário pressiona Ctrl+S (ou Cmd+S no macOS) com uma aba ativa e dirty
- **THEN** o sistema envia o conteúdo atual via `sftp:writeFile` e marca a aba como não-dirty

#### Scenario: Falha ao salvar
- **WHEN** a escrita SFTP falha (ex: permissão negada)
- **THEN** o sistema exibe notificação de erro e a aba permanece dirty

### Requirement: Renomear arquivo ou diretório remoto
O sistema SHALL renomear arquivos e diretórios no servidor remoto.

#### Scenario: Renomear com sucesso
- **WHEN** o usuário aciona renomear e fornece um novo nome
- **THEN** o sistema chama `sftp:rename` e atualiza o explorador

### Requirement: Criar diretório remoto
O sistema SHALL criar um novo diretório no servidor remoto.

#### Scenario: Criar pasta
- **WHEN** o usuário aciona "New Folder" e fornece um nome
- **THEN** o sistema chama `sftp:mkdir` e o novo diretório aparece no explorador

### Requirement: Deletar arquivo ou diretório remoto
O sistema SHALL remover arquivos e diretórios do servidor remoto.

#### Scenario: Deletar arquivo
- **WHEN** o usuário aciona deletar em um arquivo
- **THEN** o sistema chama `sftp:delete` e remove o item do explorador

### Requirement: Copiar arquivo ou diretório remoto
O sistema SHALL copiar arquivos e diretórios no servidor remoto de um caminho de origem para um caminho de
destino, inteiramente via SFTP (sem transitar pelo disco local), suportando cópia recursiva de diretórios e
um fluxo explícito de confirmação de sobrescrita.

#### Scenario: Copiar arquivo remoto
- **WHEN** o sistema chama `sftp:copy` com o caminho de um arquivo de origem e um caminho de destino livre
- **THEN** o sistema cria uma cópia do arquivo no destino, lendo e escrevendo via streams SFTP

#### Scenario: Copiar diretório remoto recursivamente
- **WHEN** o sistema chama `sftp:copy` com o caminho de um diretório de origem e um caminho de destino livre
- **THEN** o sistema cria o diretório de destino e copia recursivamente todo o seu conteúdo (arquivos e
  subdiretórios aninhados), preservando a estrutura completa da subárvore

#### Scenario: Destino já possui um item com o mesmo nome e sobrescrita não foi solicitada
- **WHEN** o sistema chama `sftp:copy` sem a flag de sobrescrita e já existe um arquivo ou diretório no
  caminho de destino
- **THEN** o sistema rejeita a operação com um erro `DEST_EXISTS`, sem criar ou alterar nenhum arquivo

#### Scenario: Destino já possui um item com o mesmo nome e sobrescrita foi solicitada
- **WHEN** o sistema chama `sftp:copy` com a flag de sobrescrita e já existe um arquivo ou diretório no
  caminho de destino
- **THEN** o sistema remove o item existente no destino (arquivo ou, recursivamente, diretório) e então
  realiza a cópia no lugar dele

#### Scenario: Destino é o próprio diretório de origem ou um descendente dele
- **WHEN** o caminho de destino calculado é igual ao caminho de origem, ou está contido dentro dele
- **THEN** o sistema rejeita a operação com um erro, sem criar ou alterar nenhum arquivo, mesmo que a flag
  de sobrescrita tenha sido solicitada
