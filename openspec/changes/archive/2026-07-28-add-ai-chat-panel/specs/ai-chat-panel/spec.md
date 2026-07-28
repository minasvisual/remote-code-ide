## ADDED Requirements

### Requirement: ActivityBar expõe o painel de chat de IA
O `ActivityBar` SHALL incluir um item que torna o painel de chat de IA alcançável pela UI,
seguindo o mesmo padrão usado por Explorer/Connections/Extensions.

#### Scenario: Ícone de AI Chat visível e funcional
- **WHEN** o aplicativo está em execução, com ou sem sessão SSH ativa
- **THEN** a `ActivityBar` exibe um item de AI Chat e clicar nele exibe o painel de chat na
  sidebar

### Requirement: Enviar mensagem sem provedor configurado
O sistema SHALL impedir o envio de mensagens quando nenhum provedor de IA estiver configurado e
orientar o usuário a configurá-lo.

#### Scenario: Nenhum provedor cadastrado
- **WHEN** o usuário abre o painel de chat sem nenhum provedor cadastrado
- **THEN** o painel exibe uma orientação para configurar um provedor em vez do campo de envio de
  mensagem

### Requirement: Enviar mensagem com contexto da aba ativa
O sistema SHALL incluir o caminho e o conteúdo do arquivo da aba ativa do editor como contexto de
cada mensagem enviada ao provedor configurado como padrão.

#### Scenario: Envio com aba ativa aberta
- **WHEN** o usuário tem uma aba de arquivo ativa e envia uma mensagem no chat
- **THEN** a requisição ao provedor inclui o caminho remoto e o conteúdo atual dessa aba como
  contexto, além do histórico da conversa

#### Scenario: Envio sem nenhuma aba aberta
- **WHEN** o usuário envia uma mensagem sem nenhuma aba de arquivo aberta
- **THEN** a mensagem é enviada apenas com o histórico da conversa, sem contexto de arquivo

#### Scenario: Conteúdo do arquivo excede o limite de tamanho
- **WHEN** o conteúdo da aba ativa excede 5 MB
- **THEN** o sistema trunca o conteúdo enviado como contexto e exibe um aviso visível no chat

### Requirement: Resposta do assistente em streaming
O sistema SHALL exibir a resposta do provedor de IA de forma incremental, à medida que os dados
chegam, em vez de aguardar a resposta completa.

#### Scenario: Recebimento incremental
- **WHEN** o provedor envia a resposta em partes (streaming)
- **THEN** o texto exibido no painel de chat é atualizado a cada parte recebida, sem esperar o
  fim da resposta

#### Scenario: Erro durante o streaming
- **WHEN** a conexão com o provedor falha no meio de uma resposta em streaming
- **THEN** o sistema exibe uma mensagem de erro descritiva e preserva o texto parcial já recebido

### Requirement: Cancelar geração em andamento
O sistema SHALL permitir cancelar uma resposta do assistente que ainda está sendo gerada.

#### Scenario: Cancelamento durante streaming
- **WHEN** o usuário aciona "Cancel" enquanto uma resposta está sendo recebida
- **THEN** o sistema interrompe a requisição ao provedor e marca a mensagem como cancelada,
  preservando o texto parcial já exibido

### Requirement: Propor edição de arquivo via diff
Quando a resposta do assistente contiver um bloco de código rotulado com um caminho de arquivo
correspondente a uma aba aberta, o sistema SHALL exibir uma visualização de diff entre o conteúdo
atual da aba e o conteúdo proposto, em vez de aplicar a mudança diretamente.

#### Scenario: Resposta contém proposta de edição válida
- **WHEN** a resposta completa do assistente contém um bloco de código rotulado com o caminho de
  uma aba atualmente aberta
- **THEN** o sistema exibe um diff (conteúdo atual à esquerda, proposto à direita) com ações de
  aceitar e rejeitar

#### Scenario: Resposta sem bloco de código reconhecível
- **WHEN** a resposta do assistente não contém nenhum bloco de código rotulado com um caminho de
  arquivo, ou o caminho não corresponde a nenhuma aba aberta
- **THEN** o sistema exibe a resposta apenas como texto, sem ações de diff

### Requirement: Aceitar ou rejeitar edição proposta
O sistema SHALL aplicar a edição proposta ao conteúdo em memória da aba somente quando o usuário
aceitar explicitamente o diff, e SHALL nunca salvar a alteração remotamente por conta própria.

#### Scenario: Usuário aceita o diff
- **WHEN** o usuário clica em "Accept" na visualização de diff
- **THEN** o conteúdo da aba correspondente é atualizado para o texto proposto, a aba passa a
  ficar marcada como não salva (dirty), e nenhuma escrita ocorre via SFTP automaticamente

#### Scenario: Usuário rejeita o diff
- **WHEN** o usuário clica em "Reject" na visualização de diff
- **THEN** o conteúdo da aba permanece inalterado e a proposta é descartada

### Requirement: Histórico de conversa por sessão
O sistema SHALL manter o histórico de mensagens do chat em memória enquanto o aplicativo estiver
em execução, sem persistir esse histórico em disco entre reinícios.

#### Scenario: Histórico mantido durante a sessão
- **WHEN** o usuário troca de painel na sidebar e volta para o chat de IA na mesma sessão do app
- **THEN** as mensagens trocadas anteriormente continuam visíveis

#### Scenario: Histórico não sobrevive a um reinício
- **WHEN** o aplicativo é fechado e reaberto
- **THEN** o painel de chat inicia vazio, sem mensagens de sessões anteriores
