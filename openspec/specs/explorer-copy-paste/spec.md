## ADDED Requirements

### Requirement: Copiar arquivo ou diretório para a área de transferência
O sistema SHALL permitir que o usuário copie um arquivo ou diretório do explorador para uma área de
transferência em memória, através do item "Copy" no menu de contexto.

#### Scenario: Copiar um arquivo
- **WHEN** o usuário aciona "Copy" no menu de contexto de um arquivo
- **THEN** o sistema guarda em memória a sessão, o caminho, o nome e o tipo do arquivo, e exibe uma
  notificação confirmando a cópia

#### Scenario: Copiar um diretório
- **WHEN** o usuário aciona "Copy" no menu de contexto de um diretório
- **THEN** o sistema guarda em memória a sessão, o caminho, o nome e o tipo do diretório, e exibe uma
  notificação confirmando a cópia

### Requirement: Colar item copiado em um diretório
O sistema SHALL permitir que o usuário cole, em qualquer diretório do explorador, o item mais recentemente
copiado, através do item "Paste" no menu de contexto de diretórios.

#### Scenario: Colar com sucesso
- **WHEN** o usuário aciona "Paste" no menu de contexto de um diretório com um item copiado em memória, e
  não existe conflito de nome no destino
- **THEN** o sistema copia o arquivo ou diretório de origem para dentro do diretório de destino
  (servidor-a-servidor, via SFTP) e atualiza a listagem do diretório de destino

#### Scenario: Colar múltiplas vezes com o mesmo item copiado
- **WHEN** o usuário aciona "Paste" em um diretório e, em seguida, aciona "Paste" novamente em outro
  diretório sem copiar nada no meio
- **THEN** o sistema reutiliza o mesmo item da área de transferência para a segunda colagem

### Requirement: Colar recursivamente pastas copiadas
O sistema SHALL, ao colar um diretório copiado, duplicar toda a sua subárvore (arquivos e subdiretórios
aninhados) no destino.

#### Scenario: Colar uma pasta com conteúdo aninhado
- **WHEN** o usuário cola um diretório copiado que contém arquivos e subpastas
- **THEN** o sistema recria, no destino, a mesma estrutura de arquivos e subpastas presente na origem

### Requirement: Confirmar antes de sobrescrever um item existente
O sistema SHALL pedir confirmação ao usuário, via diálogo, antes de sobrescrever um item existente no
destino da colagem, em vez de sobrescrever silenciosamente ou renomear automaticamente.

#### Scenario: Nome já existe no destino
- **WHEN** o usuário cola um item cujo nome já existe no diretório de destino
- **THEN** o sistema exibe um diálogo de confirmação perguntando se o item existente deve ser sobrescrito, e
  nenhuma alteração é feita no servidor até que o usuário responda

#### Scenario: Usuário confirma a sobrescrita
- **WHEN** o usuário confirma a sobrescrita no diálogo
- **THEN** o sistema substitui o item existente no destino pelo item colado (para diretórios, o diretório
  existente é removido por completo e substituído pela cópia, sem mesclar conteúdo)

#### Scenario: Usuário cancela a sobrescrita
- **WHEN** o usuário cancela o diálogo de confirmação
- **THEN** o sistema não realiza nenhuma alteração no destino e a área de transferência permanece com o
  mesmo item copiado

### Requirement: Impedir colar uma pasta dentro dela mesma
O sistema SHALL rejeitar a colagem de um diretório copiado dentro dele mesmo ou dentro de qualquer uma de
suas subpastas, sem exibir o diálogo de sobrescrita nesse caso.

#### Scenario: Colar no próprio diretório copiado
- **WHEN** o usuário copia um diretório e aciona "Paste" nesse mesmo diretório
- **THEN** o sistema exibe uma notificação de erro explicando que não é possível colar uma pasta dentro dela
  mesma, e nenhuma alteração é feita no servidor

#### Scenario: Colar em uma subpasta do diretório copiado
- **WHEN** o usuário copia um diretório e aciona "Paste" em uma subpasta descendente desse diretório
- **THEN** o sistema exibe uma notificação de erro e nenhuma alteração é feita no servidor

### Requirement: Colar na raiz do explorador sem nenhum item selecionado
O sistema SHALL permitir colar o item copiado na raiz da árvore de arquivos através de um menu de contexto
acionado em uma área vazia do explorador, sem que nenhum arquivo ou pasta esteja selecionado.

#### Scenario: Clique com botão direito em área vazia do explorador
- **WHEN** o usuário clica com o botão direito em uma área vazia do explorador (fora de qualquer item de
  arquivo ou pasta) com um item copiado em memória
- **THEN** o sistema exibe um menu de contexto contendo "Paste", direcionado ao diretório raiz da sessão

#### Scenario: Colar na raiz com sucesso
- **WHEN** o usuário aciona "Paste" no menu de contexto da área vazia
- **THEN** o sistema copia o item da área de transferência para o diretório raiz e atualiza a listagem raiz
  do explorador

### Requirement: Item "Paste" visível apenas quando há algo copiado
O sistema SHALL exibir o item "Paste" no menu de contexto de um diretório, ou no menu de contexto da área
vazia do explorador, somente quando existir um item válido na área de transferência da sessão ativa.

#### Scenario: Nenhum item copiado ainda
- **WHEN** o usuário abre o menu de contexto de um diretório, ou da área vazia do explorador, antes de
  copiar qualquer arquivo ou pasta
- **THEN** o item "Paste" não aparece no menu

#### Scenario: Área de transferência é limpa ao desconectar
- **WHEN** a sessão SSH é desconectada com um item copiado em memória
- **THEN** a área de transferência é esvaziada e "Paste" deixa de aparecer em qualquer menu de contexto
