## Context

O explorador de arquivos (`FileExplorer`) sempre inicia a listagem a partir de `/` ao estabelecer uma sessão SSH. O campo `initialDirectory` será um dado opcional da conexão que, quando preenchido, substitui `/` como ponto de partida da listagem.

A entidade `Connection` existe em dois lugares simétricos: `src/main/domain/entities/Connection.ts` e `src/renderer/domain/entities/Connection.ts`. Ambas precisam ser atualizadas de forma idêntica. O campo trafega pelo IPC junto com os demais dados da conexão (sem mudança de canal).

## Goals / Non-Goals

**Goals:**
- Adicionar campo opcional `initialDirectory` à entidade `Connection` (main + renderer)
- Expor o campo no formulário de criação e edição de conexão
- Propagar o valor para `ActiveSession` ao conectar
- `FileExplorer` usa `initialDirectory` (quando presente) em vez de `/` como raiz inicial

**Non-Goals:**
- Validar se o diretório existe no servidor antes de salvar (verificação acontece no ato da conexão, se necessário)
- Navegar programaticamente para um diretório já aberto (escopo de uma sessão ativa já existente)
- Adicionar breadcrumbs ou navegação de caminho no explorador (feature separada)

## Decisions

### 1. Onde armazenar `initialDirectory` em tempo de execução

**Decisão**: adicionar `initialDirectory?: string` ao tipo `ActiveSession` em `EditorTab.ts`.

**Alternativa considerada**: buscar a conexão completa via `connections.find()` dentro do `FileExplorer`.

**Rationale**: `ActiveSession` já é o objeto de sessão ativa lido pelo `FileExplorer`. Colocar o campo lá mantém o componente simples (sem dependência extra de `connections`) e é consistente com `connectionLabel` que já existe em `ActiveSession` pelo mesmo motivo.

### 2. Sem validação de existência do diretório no save

**Decisão**: campo é salvo como string simples, sem verificação via SFTP.

**Rationale**: validar exigiria uma conexão SSH ativa antes do save, o que complica o fluxo. Se o diretório não existir, o erro acontecerá naturalmente ao carregar o explorador (já tratado pelo `notify('error', ...)`). O usuário pode corrigir via edição da conexão.

### 3. Fallback para `/` quando `initialDirectory` está vazio

**Decisão**: `FileExplorer` usa `activeSession.initialDirectory || '/'`.

**Rationale**: compatibilidade retroativa com conexões existentes que não têm o campo preenchido, sem necessidade de migração de dados.

## Risks / Trade-offs

- **Diretório inválido** → o `FileExplorer` já trata erros de `listDir` com `notify('error', ...)`. Sem mitigação adicional necessária.
- **Campo string livre** → o usuário pode digitar caminhos relativos ou com typo. Trade-off aceito: mantém o formulário simples; erros são visíveis imediatamente ao conectar.
