## ADDED Requirements

### Requirement: Upload não bloqueia a aplicação
O sistema SHALL exibir o progresso de upload sem impedir a interação do usuário com o restante da
aplicação (explorador de arquivos, editor, terminal, troca de painel na activity bar) enquanto o
upload estiver em andamento. Nenhum overlay de tela cheia ou elemento modal SHALL capturar cliques
fora da própria área do widget de progresso.

#### Scenario: Interagir com o explorador durante upload
- **WHEN** um upload está em andamento e o widget de progresso está visível
- **THEN** o usuário consegue expandir/colapsar pastas, abrir arquivos no editor e usar o terminal
  normalmente, sem qualquer elemento bloqueando cliques fora do widget

#### Scenario: Trocar de painel na activity bar durante upload
- **WHEN** um upload está em andamento e o usuário troca o painel ativo do sidebar (ex. de
  "Explorer" para "Extensions" ou "About")
- **THEN** o upload continua progredindo e o widget de progresso permanece visível no canto
  inferior direito, refletindo o estado atualizado das entradas

### Requirement: Widget flutuante ancorado no canto inferior direito
O sistema SHALL exibir o progresso de upload como um widget flutuante ancorado no canto inferior
direito da janela, aparecendo automaticamente quando um upload é iniciado.

#### Scenario: Upload iniciado exibe o widget
- **WHEN** o usuário confirma o upload de um ou mais arquivos/pastas
- **THEN** o sistema exibe o widget de progresso no canto inferior direito, sem exigir nenhuma ação
  adicional do usuário para torná-lo visível

#### Scenario: Nenhum upload ativo ou recente
- **WHEN** não há nenhum upload em andamento nem upload concluído ainda não dispensado
- **THEN** o widget de progresso não é renderizado

### Requirement: Alternância entre estado recolhido e expandido
O sistema SHALL permitir alternar o widget de progresso entre um estado recolhido (compacto) e um
estado expandido (lista completa) através de um controle de toggle explícito no próprio widget.

#### Scenario: Estado inicial recolhido
- **WHEN** o widget de progresso aparece pela primeira vez para um novo upload
- **THEN** ele é exibido no estado recolhido, mostrando um resumo (contagem de arquivos e progresso
  geral) em vez da lista completa

#### Scenario: Expandir o widget
- **WHEN** o usuário aciona o toggle de expansão no widget recolhido
- **THEN** o widget passa a exibir a lista completa de arquivos do upload, cada um com seu status
  individual (pendente, enviando, concluído ou erro)

#### Scenario: Recolher o widget
- **WHEN** o usuário aciona o toggle de expansão no widget expandido
- **THEN** o widget volta ao estado recolhido, mantendo o upload em andamento sem interrupção

#### Scenario: Recolher durante upload em andamento
- **WHEN** há entradas com status `pending` ou `uploading` e o usuário aciona o toggle para recolher
- **THEN** o sistema permite recolher normalmente; o upload continua em andamento e nenhuma
  transferência é cancelada

### Requirement: Fechar o widget somente após conclusão
O sistema SHALL permitir dispensar (fechar definitivamente) o widget de progresso apenas quando
todas as entradas do upload estiverem em estado `done` ou `error`. Enquanto qualquer entrada estiver
`pending` ou `uploading`, o controle de fechar SHALL permanecer desabilitado.

#### Scenario: Tentar fechar com upload em andamento
- **WHEN** ao menos uma entrada do upload está `pending` ou `uploading`
- **THEN** o controle de fechar do widget permanece desabilitado e a ação de fechar não tem efeito

#### Scenario: Fechar após conclusão total
- **WHEN** todas as entradas do upload estão em `done` e/ou `error`
- **THEN** o usuário consegue fechar o widget, que deixa de ser exibido

### Requirement: Atualização do explorador de arquivos ao concluir
O sistema SHALL disparar a atualização do diretório-alvo no explorador de arquivos assim que todas
as entradas de um lote de upload atingirem `done` ou `error`, independentemente de o widget estar
aberto, recolhido ou já ter sido fechado pelo usuário.

#### Scenario: Upload concluído com o widget recolhido
- **WHEN** todas as entradas de um upload terminam (`done`/`error`) enquanto o widget está recolhido
- **THEN** o sistema atualiza o diretório-alvo no explorador de arquivos com os novos arquivos, sem
  exigir que o usuário expanda ou feche o widget primeiro

### Requirement: Múltiplos lotes de upload concorrentes
O sistema SHALL suportar múltiplos uploads iniciados em sequência antes que um upload anterior tenha
terminado, exibindo todos no mesmo widget e associando corretamente cada arquivo ao seu
diretório-alvo de destino para fins de atualização do explorador.

#### Scenario: Iniciar um segundo upload antes do primeiro terminar
- **WHEN** o usuário inicia um novo upload para um diretório diferente enquanto um upload anterior
  ainda tem entradas `pending`/`uploading`
- **THEN** o widget passa a exibir as entradas de ambos os lotes, e a conclusão de cada lote atualiza
  apenas o diretório-alvo correspondente a esse lote
