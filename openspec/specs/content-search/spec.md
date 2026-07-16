## ADDED Requirements

### Requirement: Item "Find in Folder..." no menu de contexto de diretórios
O sistema SHALL exibir o item "Find in Folder..." no menu de contexto de qualquer diretório da árvore do
explorador.

#### Scenario: Abrir menu de contexto de um diretório
- **WHEN** o usuário clica com o botão direito em um diretório da árvore do explorador
- **THEN** o menu de contexto exibido contém o item "Find in Folder..."

#### Scenario: Item ausente para arquivos
- **WHEN** o usuário clica com o botão direito em um arquivo (não-diretório) da árvore
- **THEN** o menu de contexto exibido não contém o item "Find in Folder..."

### Requirement: Item "Find in Folder..." no menu de contexto da raiz
O sistema SHALL exibir o item "Find in Folder..." no menu de contexto acionado em uma área vazia do explorador
(fora de qualquer item de arquivo ou pasta), direcionado ao diretório raiz da sessão ativa.

#### Scenario: Clique com botão direito em área vazia do explorador
- **WHEN** o usuário clica com o botão direito em uma área vazia do explorador, com uma sessão ativa
- **THEN** o menu de contexto exibido contém o item "Find in Folder...", independentemente de haver ou não um
  item copiado na área de transferência

### Requirement: Abrir modal de busca de conteúdo
O sistema SHALL abrir um modal com um campo de texto para busca ao acionar "Find in Folder...", associado ao
diretório a partir do qual o item foi acionado (o próprio diretório, no caso de `TreeNode`, ou a raiz da
sessão, no caso do menu da área vazia).

#### Scenario: Acionar "Find in Folder..." em um diretório
- **WHEN** o usuário aciona "Find in Folder..." no menu de contexto de um diretório
- **THEN** o sistema abre um modal de busca com um campo de texto vazio, pronto para receber o termo buscado

#### Scenario: Campo de busca vazio não inicia busca
- **WHEN** o usuário confirma a busca (tecla Enter ou botão "Search") com o campo de texto vazio ou contendo
  apenas espaços
- **THEN** o sistema não inicia nenhuma busca e o botão/ação de busca permanece inativo

### Requirement: Busca recursiva de conteúdo com resultados incrementais
O sistema SHALL, ao confirmar uma busca no modal, varrer recursivamente todos os arquivos de texto do
diretório-alvo via SFTP procurando ocorrências literais (substring, case-insensitive) do termo buscado, e
exibir os arquivos com ocorrências no modal conforme são encontrados, sem esperar a varredura completa
terminar.

#### Scenario: Iniciar busca
- **WHEN** o usuário confirma um termo de busca não vazio
- **THEN** o sistema inicia a varredura recursiva do diretório-alvo e exibe um indicador de busca em andamento
  no modal

#### Scenario: Resultado aparece incrementalmente
- **WHEN** a varredura encontra um arquivo cujo conteúdo contém pelo menos uma ocorrência do termo buscado
- **THEN** o sistema adiciona esse arquivo à lista de resultados exibida no modal imediatamente, sem esperar o
  restante da árvore ser varrida

#### Scenario: Cada resultado mostra contagem e trecho de contexto
- **WHEN** um arquivo é adicionado à lista de resultados
- **THEN** o sistema exibe, para esse arquivo, o caminho completo, o número total de ocorrências encontradas e
  o texto da(s) linha(s) onde o termo aparece, como trecho de contexto

#### Scenario: Busca concluída sem nenhum resultado
- **WHEN** a varredura termina de percorrer todo o diretório-alvo sem encontrar nenhuma ocorrência do termo
- **THEN** o sistema exibe uma mensagem indicando que nenhum arquivo com ocorrências foi encontrado

#### Scenario: Busca concluída com resultados
- **WHEN** a varredura termina de percorrer todo o diretório-alvo
- **THEN** o sistema remove o indicador de busca em andamento, mantendo a lista de resultados já exibida

### Requirement: Cancelar busca em andamento
O sistema SHALL permitir cancelar uma busca em andamento, interrompendo a varredura sem exibir mais resultados
novos.

#### Scenario: Cancelar via botão
- **WHEN** o usuário aciona "Cancel" com uma busca em andamento
- **THEN** o sistema interrompe a varredura, remove o indicador de busca em andamento, e mantém os resultados
  já encontrados até o momento do cancelamento visíveis no modal

#### Scenario: Cancelar ao fechar o modal
- **WHEN** o usuário fecha o modal (via botão de fechar, tecla Escape, ou clique fora) com uma busca em
  andamento
- **THEN** o sistema cancela a busca em andamento antes de fechar o modal

#### Scenario: Nova busca cancela a anterior
- **WHEN** o usuário confirma um novo termo de busca enquanto uma busca anterior ainda está em andamento no
  mesmo modal
- **THEN** o sistema cancela a busca anterior, limpa a lista de resultados exibida, e inicia a nova busca

### Requirement: Abrir arquivo ao clicar em um resultado
O sistema SHALL abrir, no editor de código, o arquivo correspondente a um resultado da busca quando o usuário
clica nesse resultado, fechando o modal em seguida.

#### Scenario: Clicar em um resultado
- **WHEN** o usuário clica em um arquivo listado nos resultados da busca
- **THEN** o sistema abre esse arquivo no editor (mesmo comportamento de abrir um arquivo pela árvore do
  explorador) e fecha o modal de busca

#### Scenario: Arquivo do resultado já aberto em uma aba
- **WHEN** o usuário clica em um resultado cujo arquivo já está aberto em uma aba do editor
- **THEN** o sistema foca a aba existente em vez de abrir uma nova, e fecha o modal de busca
