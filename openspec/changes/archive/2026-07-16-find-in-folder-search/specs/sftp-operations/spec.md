## ADDED Requirements

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
