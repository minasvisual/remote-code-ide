## ADDED Requirements

### Requirement: Abrir arquivo em aba do editor
O sistema SHALL abrir arquivos remotos em abas individuais no editor Monaco, com detecção automática de linguagem pela extensão do arquivo.

#### Scenario: Abrir arquivo TypeScript
- **WHEN** o usuário abre um arquivo `.ts` ou `.tsx`
- **THEN** uma aba é criada com linguagem `typescript` e syntax highlighting aplicado pelo Monaco

#### Scenario: Deduplicar aba de arquivo já aberto
- **WHEN** o usuário tenta abrir um arquivo que já tem uma aba
- **THEN** o sistema foca a aba existente sem criar duplicata

#### Scenario: Múltiplas abas abertas
- **WHEN** o usuário abre vários arquivos
- **THEN** todas as abas são exibidas na `EditorTabBar` e o usuário pode alternar entre elas

### Requirement: Preservar undo history por arquivo
O sistema SHALL manter o histórico de undo/redo separado por arquivo, mesmo quando o usuário alterna entre abas.

#### Scenario: Undo history mantido ao trocar de aba
- **WHEN** o usuário edita um arquivo, abre outro e volta ao primeiro
- **THEN** Ctrl+Z desfaz alterações do primeiro arquivo (não do segundo)

#### Scenario: URI único por arquivo por sessão
- **WHEN** o Monaco cria o model para um arquivo
- **THEN** o URI do model segue o padrão `remote://<sessionId><remotePath>`, garantindo unicidade entre sessões

### Requirement: Rastrear estado dirty de arquivos
O sistema SHALL indicar visualmente quando um arquivo tem alterações não salvas.

#### Scenario: Aba marcada como dirty após edição
- **WHEN** o usuário modifica o conteúdo de um arquivo
- **THEN** a aba exibe indicador visual de "não salvo" (ex: ponto `•` no título)

#### Scenario: Aba limpa após save bem-sucedido
- **WHEN** o arquivo é salvo com sucesso
- **THEN** o indicador de dirty é removido da aba

### Requirement: Salvar arquivo com atalho de teclado
O sistema SHALL salvar o arquivo ativo ao pressionar Ctrl+S (Windows/Linux) ou Cmd+S (macOS).

#### Scenario: Ctrl+S salva o arquivo ativo
- **WHEN** o usuário pressiona Ctrl+S com uma aba ativa e dirty
- **THEN** o conteúdo atual é enviado ao servidor via `sftp:writeFile`

#### Scenario: Ctrl+S não faz nada se arquivo não está dirty
- **WHEN** o usuário pressiona Ctrl+S sem alterações pendentes
- **THEN** nenhuma operação de rede é disparada

### Requirement: Fechar aba do editor
O sistema SHALL permitir fechar abas individualmente.

#### Scenario: Fechar aba
- **WHEN** o usuário clica no botão de fechar de uma aba
- **THEN** a aba é removida; se era a aba ativa, o sistema ativa a aba anterior ou exibe `WelcomeScreen`
