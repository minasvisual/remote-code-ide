## ADDED Requirements

### Requirement: Ativar modo Agent por mensagem
O painel de chat SHALL exibir um alternador ("Agent mode") desativado por padrão que, quando ligado antes do envio, faz a mensagem ser processada como um turno de agente (loop de ferramentas) em vez de uma resposta única em texto.

#### Scenario: Envio com Agent mode desligado
- **WHEN** o usuário envia uma mensagem com o alternador "Agent mode" desligado
- **THEN** o comportamento é idêntico ao chat padrão hoje: nenhuma ferramenta é oferecida ao provedor e a resposta é um único texto em streaming

#### Scenario: Envio com Agent mode ligado
- **WHEN** o usuário liga "Agent mode" e envia uma mensagem
- **THEN** o sistema inicia um turno de agente que pode incluir múltiplas chamadas de ferramenta antes da resposta final

### Requirement: Ferramentas disponíveis ao agente
O sistema SHALL disponibilizar ao modelo, durante um turno de agente, exatamente quatro ferramentas: `list_directory`, `read_file`, `write_file` e `run_command`, operando sobre a sessão SSH/SFTP atualmente ativa.

#### Scenario: Nenhuma sessão SSH ativa
- **WHEN** o usuário tenta ligar "Agent mode" sem nenhuma sessão SSH ativa
- **THEN** o alternador fica desabilitado com uma explicação de que é necessário estar conectado a um servidor

#### Scenario: Listagem e leitura não exigem aprovação
- **WHEN** o modelo chama `list_directory` ou `read_file` durante um turno de agente
- **THEN** a ferramenta executa imediatamente, sem pausar para aprovação do usuário, pois não pode alterar nenhum estado remoto

### Requirement: Aprovação obrigatória para ferramentas que alteram estado
O sistema SHALL pausar o turno de agente e exigir uma decisão explícita do usuário (Allow/Deny) antes de executar qualquer chamada a `write_file` ou `run_command`, a menos que a opção "Auto-approve this turn" tenha sido ativada para aquele turno específico.

#### Scenario: Chamada de ferramenta mutante aguardando aprovação
- **WHEN** o modelo chama `write_file` ou `run_command` e "Auto-approve this turn" não está ativo
- **THEN** o sistema exibe a chamada pendente no chat com ações "Allow" e "Deny", e não a executa até uma decisão ser tomada

#### Scenario: Usuário aprova a chamada
- **WHEN** o usuário clica em "Allow" numa chamada pendente
- **THEN** a ferramenta é executada, seu resultado é anexado ao histórico enviado ao modelo, e o loop continua

#### Scenario: Usuário nega a chamada
- **WHEN** o usuário clica em "Deny" numa chamada pendente
- **THEN** a ferramenta não é executada; um resultado indicando negação é anexado ao histórico enviado ao modelo, e o loop continua

### Requirement: Auto-aprovação opcional por turno
O sistema SHALL permitir que o usuário ative "Auto-approve this turn" antes de enviar uma mensagem em modo Agent, o que faz todas as chamadas de ferramenta daquele turno (incluindo as mutantes) executarem sem pausa; essa opção SHALL NOT persistir para mensagens seguintes.

#### Scenario: Turno com auto-aprovação ativa
- **WHEN** o usuário liga "Auto-approve this turn" e envia uma mensagem em modo Agent
- **THEN** todas as chamadas de `write_file`/`run_command` daquele turno executam sem pedir Allow/Deny, e cada uma é marcada visivelmente como "auto-approved" no trace

#### Scenario: Opção não persiste entre turnos
- **WHEN** um turno com "Auto-approve this turn" ativo termina e o usuário envia uma nova mensagem em modo Agent
- **THEN** a nova mensagem exige aprovação manual para chamadas mutantes, a menos que o usuário ative a opção novamente

### Requirement: Limite de iterações do loop
O sistema SHALL encerrar um turno de agente após um número máximo de etapas (passos de chamada de ferramenta) mesmo que o modelo não tenha produzido uma resposta final, exibindo uma indicação clara de que o limite foi atingido.

#### Scenario: Limite de passos atingido
- **WHEN** um turno de agente atinge o número máximo de etapas configurado sem o modelo retornar uma resposta final em texto
- **THEN** o sistema interrompe o loop e exibe uma mensagem indicando que o agente parou por atingir o limite de passos

### Requirement: Cancelar um turno de agente em andamento
O sistema SHALL permitir cancelar um turno de agente que esteja em qualquer etapa do loop (aguardando o modelo, aguardando aprovação, ou executando uma ferramenta), reaproveitando o mecanismo de cancelamento já existente para o chat padrão.

#### Scenario: Cancelamento durante execução de ferramenta ou espera do modelo
- **WHEN** o usuário aciona "Cancel" enquanto uma etapa do agente está em andamento
- **THEN** o loop é interrompido, nenhuma nova chamada de ferramenta é iniciada, e o histórico parcial já exibido é preservado

#### Scenario: Cancelamento com aprovação pendente
- **WHEN** o usuário aciona "Cancel" enquanto uma chamada de ferramenta aguarda Allow/Deny
- **THEN** a chamada pendente é descartada sem ser executada e o turno é encerrado como cancelado

### Requirement: Trace de chamadas de ferramenta no chat
O sistema SHALL exibir cada chamada de ferramenta de um turno de agente como um item expansível no histórico do chat, mostrando nome da ferramenta, argumentos e resultado (truncado se necessário).

#### Scenario: Expandir uma chamada de ferramenta concluída
- **WHEN** o usuário clica num item de chamada de ferramenta já concluída no histórico
- **THEN** o sistema exibe os argumentos completos (ou truncados, se excederem o limite) e o resultado retornado

### Requirement: Propor escrita de arquivo fora de uma aba aberta
Quando `write_file` for chamado para um caminho sem aba correspondente aberta no editor, o sistema SHALL buscar o conteúdo remoto atual sob demanda para compor o lado esquerdo do diff, em vez de exigir que o arquivo já esteja aberto.

#### Scenario: Escrita proposta para arquivo não aberto
- **WHEN** o modelo chama `write_file` para um caminho que não corresponde a nenhuma aba atualmente aberta
- **THEN** o sistema busca o conteúdo remoto atual desse arquivo via SFTP e exibe o diff normalmente (conteúdo atual à esquerda, proposto à direita) com ações de aceitar e rejeitar

#### Scenario: Aceitar escrita em arquivo não aberto
- **WHEN** o usuário aceita o diff de um arquivo que não tinha aba aberta
- **THEN** o novo conteúdo é gravado diretamente via SFTP, já que não há aba em memória para marcar como não salva

#### Scenario: Aceitar escrita em arquivo com aba aberta
- **WHEN** o usuário aceita o diff de um arquivo que corresponde a uma aba atualmente aberta
- **THEN** o conteúdo da aba é atualizado em memória e marcado como não salvo, seguindo o mesmo comportamento do fluxo de chat padrão, sem gravação automática via SFTP

### Requirement: Execução limitada de comandos remotos
O sistema SHALL executar chamadas a `run_command` com um tempo limite (timeout) padrão e um limite de tamanho de saída, encerrando a chamada como erro de ferramenta caso qualquer um dos limites seja excedido, sem travar o restante do loop.

#### Scenario: Comando excede o tempo limite
- **WHEN** um comando chamado via `run_command` não termina dentro do tempo limite configurado
- **THEN** a chamada é encerrada, um erro de timeout é retornado como resultado da ferramenta ao modelo, e o loop continua

#### Scenario: Saída do comando excede o limite de tamanho
- **WHEN** a saída (stdout/stderr) de um comando excede o limite configurado
- **THEN** a saída é truncada com um aviso visível antes de ser anexada ao histórico enviado ao modelo

### Requirement: Desabilitar modo Agent para provedores sem suporte a ferramentas
O sistema SHALL impedir a ativação do modo Agent quando o provedor de IA padrão configurado não suportar chamadas de ferramenta, exibindo uma explicação ao usuário.

#### Scenario: Provedor sem suporte a tool-calling
- **WHEN** o provedor padrão configurado não suporta chamadas de ferramenta
- **THEN** o alternador "Agent mode" aparece desabilitado com uma explicação do motivo
