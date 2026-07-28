## ADDED Requirements

### Requirement: Cadastrar conexão de provedor de IA
O sistema SHALL permitir ao usuário cadastrar um provedor de IA fornecendo um rótulo, o tipo de
provedor (`anthropic` ou `openai-compatible`), URL base (opcional para `anthropic`, obrigatória
para `openai-compatible`), nome do modelo e chave de API.

#### Scenario: Salvar provedor Anthropic com URL base padrão
- **WHEN** o usuário seleciona o tipo "Anthropic", preenche modelo e chave de API sem informar
  URL base, e clica em "Save"
- **THEN** o provedor é persistido usando `https://api.anthropic.com` como URL base padrão

#### Scenario: Salvar provedor OpenAI-compatible
- **WHEN** o usuário seleciona o tipo "OpenAI-compatible", preenche URL base, modelo e chave de
  API, e clica em "Save"
- **THEN** o provedor é persistido com os dados fornecidos

#### Scenario: Campos obrigatórios não preenchidos
- **WHEN** o usuário clica em "Save" sem preencher rótulo, modelo, chave de API, ou (para
  `openai-compatible`) URL base
- **THEN** o sistema exibe notificação de erro e não salva o provedor

### Requirement: Armazenar chave de API de forma segura
O sistema SHALL criptografar a chave de API de cada provedor via `SafeStorageCrypto` antes de
persistir, e SHALL nunca enviar a chave em texto plano para o renderer após o salvamento.

#### Scenario: Chave criptografada no armazenamento
- **WHEN** um provedor é salvo com uma chave de API
- **THEN** o valor gravado no `electron-store` (`name: 'ai-providers'`) é o resultado de
  `SafeStorageCrypto.encrypt`, não a chave em texto plano

#### Scenario: Listagem não expõe a chave
- **WHEN** o renderer solicita a lista de provedores configurados
- **THEN** a resposta inclui rótulo, tipo, URL base, modelo e um indicador de que a chave está
  configurada, mas não o valor da chave nem sua forma criptografada

### Requirement: Listar, editar e excluir provedores
O sistema SHALL exibir todos os provedores cadastrados e permitir editar seus campos (exceto
reexibir a chave de API) ou excluí-los.

#### Scenario: Listagem de provedores cadastrados
- **WHEN** existem um ou mais provedores cadastrados
- **THEN** a tela de configurações exibe cada um com rótulo, tipo e modelo

#### Scenario: Edição de um provedor existente
- **WHEN** o usuário altera o rótulo, modelo ou URL base de um provedor e salva
- **THEN** os novos valores substituem os anteriores; se uma nova chave de API for informada,
  ela substitui a anterior (criptografada); se deixada em branco, a chave anterior é mantida

#### Scenario: Exclusão de um provedor
- **WHEN** o usuário exclui um provedor que não é o padrão atual
- **THEN** o provedor é removido da lista e do armazenamento

#### Scenario: Exclusão do provedor padrão
- **WHEN** o usuário exclui o provedor atualmente marcado como padrão
- **THEN** o sistema remove o provedor e nenhum provedor fica marcado como padrão, até que o
  usuário marque outro

### Requirement: Definir provedor padrão
O sistema SHALL permitir marcar exatamente um provedor cadastrado como padrão, usado pelo painel
de chat quando nenhum outro é explicitamente selecionado.

#### Scenario: Marcar um provedor como padrão
- **WHEN** o usuário marca um provedor como padrão
- **THEN** esse provedor passa a ser usado pelo painel de chat e qualquer marcação anterior de
  padrão é removida

### Requirement: Testar conexão do provedor
O sistema SHALL permitir testar um provedor configurado enviando uma requisição mínima e
reportando sucesso ou uma mensagem de erro descritiva.

#### Scenario: Teste bem-sucedido
- **WHEN** o usuário aciona "Test connection" em um provedor com URL base, modelo e chave válidos
- **THEN** o sistema exibe confirmação de que a conexão foi bem-sucedida

#### Scenario: Falha no teste
- **WHEN** a chave de API é inválida, o modelo não existe, ou a URL base é inalcançável
- **THEN** o sistema exibe uma mensagem de erro descritiva sem persistir nenhuma alteração
