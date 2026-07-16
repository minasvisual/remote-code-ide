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

### Requirement: Buscar conteúdo recursivamente em um diretório remoto
O sistema SHALL varrer recursivamente todos os arquivos sob um diretório remoto via SFTP (`sftp:searchInFolder`),
procurando ocorrências literais (substring, case-insensitive) de um termo de busca no conteúdo de cada
arquivo, e reportar um `searchId` imediatamente para acompanhar o progresso via eventos.

#### Scenario: Iniciar uma busca
- **WHEN** `sftp:searchInFolder` é chamado com uma sessão ativa, um diretório remoto e um termo de busca não
  vazio
- **THEN** o sistema gera um `searchId`, inicia a varredura recursiva em background a partir desse diretório, e
  retorna `{ searchId }` sem esperar a varredura terminar

#### Scenario: Arquivo com ocorrência é reportado via evento
- **WHEN** a varredura encontra um arquivo cujo conteúdo contém ao menos uma ocorrência do termo buscado
- **THEN** o sistema emite um evento `sftp:searchProgress` do tipo `match` para o `searchId` correspondente,
  contendo o caminho do arquivo, o nome, o total de ocorrências e até 10 ocorrências com número da linha e
  texto da linha (truncado a ~200 caracteres)

#### Scenario: Busca concluída
- **WHEN** a varredura recursiva termina de percorrer toda a árvore do diretório-alvo
- **THEN** o sistema emite um evento `sftp:searchProgress` do tipo `done` para o `searchId` correspondente

### Requirement: Pular arquivos binários e arquivos grandes durante a busca
O sistema SHALL pular, sem reportar erro, qualquer arquivo cujo tamanho exceda um limite configurado
(2 MB) ou cujo conteúdo seja identificado como binário (presença de byte nulo nos primeiros 8 KB lidos), ao
realizar uma busca de conteúdo.

#### Scenario: Arquivo acima do limite de tamanho
- **WHEN** a varredura encontra um arquivo maior que o limite configurado para busca
- **THEN** o sistema não lê o conteúdo desse arquivo e prossegue para o próximo item da árvore, sem emitir
  evento de match para ele e sem interromper a busca

#### Scenario: Arquivo binário
- **WHEN** a varredura lê um arquivo cujos primeiros 8 KB contêm um byte nulo
- **THEN** o sistema descarta o conteúdo lido sem comparar com o termo de busca e prossegue para o próximo
  item da árvore

### Requirement: Continuar a busca após erro em um item individual
O sistema SHALL continuar a varredura do restante da árvore quando falhar ao listar um subdiretório ou ler um
arquivo individual (ex.: permissão negada), em vez de abortar a busca inteira.

#### Scenario: Falha ao listar um subdiretório
- **WHEN** a varredura recursiva falha ao listar o conteúdo de um subdiretório (ex.: erro de permissão)
- **THEN** o sistema pula esse subdiretório e continua a varredura dos demais itens da árvore, sem emitir um
  evento terminal de erro para a busca inteira

#### Scenario: Falha ao ler um arquivo individual
- **WHEN** a varredura recursiva falha ao ler o conteúdo de um arquivo específico
- **THEN** o sistema pula esse arquivo e continua a varredura dos demais itens da árvore

### Requirement: Cancelar busca de conteúdo em andamento
O sistema SHALL permitir cancelar uma busca de conteúdo em andamento (`sftp:cancelSearch`), interrompendo a
varredura e impedindo que novos eventos `sftp:searchProgress` do tipo `match` sejam emitidos para aquele
`searchId`.

#### Scenario: Cancelar busca ativa
- **WHEN** `sftp:cancelSearch` é chamado com um `searchId` que corresponde a uma busca em andamento
- **THEN** o sistema interrompe a varredura o mais cedo possível e emite um evento `sftp:searchProgress` do
  tipo `cancelled` para esse `searchId`

#### Scenario: Cancelar busca desconhecida
- **WHEN** `sftp:cancelSearch` é chamado com um `searchId` que não corresponde a nenhuma busca ativa (já
  concluída, já cancelada, ou inexistente)
- **THEN** o sistema não faz nada e não lança erro
