## ADDED Requirements

### Requirement: Download de arquivo remoto para disco local com progresso
O sistema SHALL baixar um arquivo remoto para um caminho local escolhido pelo usuário via streaming
(`sftp:downloadFile`), reportando progresso em bytes transferidos versus o tamanho total do arquivo enquanto
o download está em andamento.

#### Scenario: Iniciar download de arquivo
- **WHEN** o usuário aciona "Download" em um arquivo no explorador e escolhe um destino local
- **THEN** o sistema obtém o tamanho do arquivo remoto via stat, inicia o streaming para o destino e retorna
  um identificador de transferência (`transferId`) para acompanhar o progresso

#### Scenario: Progresso reportado durante o download
- **WHEN** um download de arquivo está em andamento
- **THEN** o sistema emite eventos `sftp:downloadProgress` com bytes transferidos e total, no máximo a cada
  ~200ms, e emite um evento final não-limitado por throttle imediatamente antes da conclusão

#### Scenario: Tamanho remoto indisponível
- **WHEN** o `stat` do arquivo remoto falha antes do início do download
- **THEN** o sistema prossegue com o download mesmo assim, reportando progresso sem um total conhecido
  (progresso indeterminado)

#### Scenario: Download concluído com sucesso
- **WHEN** o streaming do arquivo remoto para o disco local termina sem erros
- **THEN** o sistema resolve a operação com sucesso e o arquivo local contém o conteúdo completo

### Requirement: Download de pasta remota como zip para disco local com progresso
O sistema SHALL baixar uma pasta remota compactada como um arquivo `.zip` para um caminho local escolhido pelo
usuário (`sftp:downloadFolder`), reportando progresso com base na soma dos tamanhos dos arquivos de origem já
conhecidos pela listagem recursiva do diretório.

#### Scenario: Iniciar download de pasta
- **WHEN** o usuário aciona "Download" em um diretório no explorador e escolhe um destino local
- **THEN** o sistema lista recursivamente os arquivos do diretório, soma seus tamanhos como total do
  progresso, inicia a compactação em streaming para o destino e retorna um `transferId`

#### Scenario: Progresso reportado durante o download de pasta
- **WHEN** um download de pasta está em andamento
- **THEN** o sistema emite eventos `sftp:downloadProgress` com bytes lidos da origem versus o total somado,
  seguindo o mesmo throttle e evento final usado no download de arquivo único

### Requirement: Cancelar download em andamento
O sistema SHALL permitir cancelar um download de arquivo ou pasta em andamento (`sftp:cancelDownload`),
interrompendo o streaming e removendo o arquivo parcial já escrito em disco.

#### Scenario: Cancelar download de arquivo em andamento
- **WHEN** o usuário aciona cancelar em um download de arquivo com um `transferId` ativo
- **THEN** o sistema interrompe o stream de leitura remota e o stream de escrita local, exclui o arquivo
  parcial em disco e resolve a operação com um erro de código `CANCELLED`

#### Scenario: Cancelar download de pasta em andamento
- **WHEN** o usuário aciona cancelar em um download de pasta com um `transferId` ativo
- **THEN** o sistema interrompe a compactação e o streaming remoto, exclui o arquivo `.zip` parcial em disco
  e resolve a operação com um erro de código `CANCELLED`

#### Scenario: Cancelamento não é tratado como falha
- **WHEN** um download é resolvido com erro de código `CANCELLED`
- **THEN** o sistema (na UI) trata o resultado como cancelamento e não como uma falha de transferência,
  exibindo uma notificação neutra em vez de uma notificação de erro

#### Scenario: Transferência desconhecida
- **WHEN** `sftp:cancelDownload` é chamado com um `transferId` que não corresponde a nenhuma transferência
  ativa (já concluída, já cancelada, ou inexistente)
- **THEN** o sistema não faz nada e não lança erro
