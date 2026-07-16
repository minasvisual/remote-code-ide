## ADDED Requirements

### Requirement: Item "Properties" no menu de contexto do explorador
O sistema SHALL exibir um item "Properties" como o último item do menu de contexto do explorador de arquivos, precedido por um divisor, disponível para arquivos, pastas e links simbólicos.

#### Scenario: Properties disponível para arquivo
- **WHEN** o usuário abre o menu de contexto de um arquivo no explorador
- **THEN** o item "Properties" aparece como o último item da lista, após um divisor

#### Scenario: Properties disponível para pasta
- **WHEN** o usuário abre o menu de contexto de uma pasta no explorador
- **THEN** o item "Properties" aparece como o último item da lista, após um divisor

#### Scenario: Properties disponível para link simbólico
- **WHEN** o usuário abre o menu de contexto de um link simbólico no explorador
- **THEN** o item "Properties" aparece como o último item da lista, após um divisor

### Requirement: Obter metadados remotos sem baixar conteúdo
O sistema SHALL obter metadados atualizados (não vindos do cache da árvore) de um arquivo, pasta ou link simbólico remoto via SFTP, sem ler ou baixar o conteúdo do arquivo.

#### Scenario: Consulta usa stat, não readFile
- **WHEN** o usuário clica em "Properties" para um item
- **THEN** o sistema chama `sftp:getFileInfo`, que internamente usa `sftp.stat` (e `sftp.readlink` para links simbólicos) — nenhuma chamada a `readFile`/`downloadFile` é feita

#### Scenario: Dados sempre frescos
- **WHEN** o item exibido na árvore tem metadados desatualizados (ex: tamanho mudou no servidor após o último `listDir`)
- **THEN** o modal de Properties exibe os valores atuais obtidos na hora, não os valores em cache da árvore

### Requirement: Modal de propriedades exibe metadados do item
O sistema SHALL exibir, em um modal, os seguintes metadados do item selecionado: nome, caminho completo, tipo, tamanho, permissões (octal e simbólica), dono (UID), grupo (GID), data de modificação e data de último acesso.

#### Scenario: Propriedades de um arquivo
- **WHEN** o usuário aciona "Properties" em um arquivo
- **THEN** o modal exibe nome, caminho, tipo "File", extensão, tamanho em bytes e em formato legível (KB/MB/GB conforme o tamanho), permissões octal e simbólica, UID, GID, data de modificação e data de último acesso

#### Scenario: Propriedades de uma pasta
- **WHEN** o usuário aciona "Properties" em uma pasta
- **THEN** o modal exibe nome, caminho, tipo "Folder", quantidade de itens diretos, permissões octal e simbólica, UID, GID, data de modificação e data de último acesso (sem campo de extensão)

#### Scenario: Propriedades de um link simbólico
- **WHEN** o usuário aciona "Properties" em um link simbólico
- **THEN** o modal exibe nome, caminho, tipo "Symbolic Link" e o alvo do link (quando disponível), além dos demais metadados do próprio link

#### Scenario: Sem campo de data de criação
- **WHEN** o modal de Properties é exibido para qualquer tipo de item
- **THEN** nenhum campo de "data de criação" é exibido, pois o protocolo SFTP usado (v3, via `ssh2`) não expõe essa informação nos atributos do arquivo

### Requirement: Contagem de itens diretos em pastas
O sistema SHALL exibir, para pastas, a quantidade de itens (arquivos, subpastas e links) diretamente contidos nela, sem contar recursivamente o conteúdo de subpastas.

#### Scenario: Pasta com itens diretos
- **WHEN** o usuário aciona "Properties" em uma pasta com 5 itens diretos (arquivos e/ou subpastas)
- **THEN** o modal exibe "5 items" (ou equivalente) como contagem, sem incluir itens de subpastas aninhadas

#### Scenario: Pasta vazia
- **WHEN** o usuário aciona "Properties" em uma pasta sem itens
- **THEN** o modal exibe contagem "0 items"

### Requirement: Tratamento de erro ao obter metadados
O sistema SHALL exibir uma mensagem de erro dentro do próprio modal caso a consulta de metadados falhe, sem fechar o modal automaticamente.

#### Scenario: Sessão SSH cai durante a consulta
- **WHEN** a sessão SSH é encerrada entre o clique em "Properties" e a resposta de `sftp:getFileInfo`
- **THEN** o modal permanece aberto e exibe uma mensagem de erro no lugar dos metadados

#### Scenario: Link simbólico quebrado
- **WHEN** o usuário aciona "Properties" em um link simbólico cujo alvo não existe mais (`readlink` funciona mas o alvo é inválido)
- **THEN** o modal exibe os metadados do próprio link normalmente e mostra "—" no campo de alvo, sem exibir erro
