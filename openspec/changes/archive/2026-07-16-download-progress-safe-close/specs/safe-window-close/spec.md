## ADDED Requirements

### Requirement: Confirmar fechamento da janela com downloads ativos
O sistema SHALL interceptar a tentativa de fechamento da janela principal quando houver um ou mais downloads
SFTP em andamento, exibindo um diálogo de confirmação em vez de fechar imediatamente.

#### Scenario: Fechar janela sem downloads ativos
- **WHEN** o usuário tenta fechar a janela principal e não há nenhum download em andamento
- **THEN** o sistema fecha a janela normalmente, sem exibir nenhum diálogo adicional

#### Scenario: Fechar janela com download ativo
- **WHEN** o usuário tenta fechar a janela principal (via botão de fechar, Alt+F4, ou `app.quit`) enquanto
  pelo menos um download SFTP está em andamento
- **THEN** o sistema impede o fechamento imediato (`preventDefault`) e exibe um diálogo com as opções
  "Cancelar downloads e fechar" e "Continuar baixando"

### Requirement: Cancelar downloads e limpar arquivos parciais ao fechar
O sistema SHALL, quando o usuário confirmar o fechamento no diálogo de downloads ativos, cancelar todas as
transferências em andamento e aguardar a exclusão dos arquivos parciais antes de efetivamente fechar a janela.

#### Scenario: Usuário confirma cancelar e fechar
- **WHEN** o usuário seleciona "Cancelar downloads e fechar" no diálogo
- **THEN** o sistema cancela todos os downloads ativos, aguarda a exclusão dos arquivos parciais em disco, e
  então fecha a janela

#### Scenario: Usuário opta por continuar baixando
- **WHEN** o usuário seleciona "Continuar baixando" no diálogo
- **THEN** o sistema mantém a janela aberta e os downloads em andamento continuam sem interrupção

#### Scenario: Novo download iniciado após decisão de continuar
- **WHEN** o usuário opta por continuar baixando e, em seguida, tenta fechar a janela novamente antes de os
  downloads terminarem
- **THEN** o sistema exibe o diálogo de confirmação novamente, pois ainda há transferências ativas
