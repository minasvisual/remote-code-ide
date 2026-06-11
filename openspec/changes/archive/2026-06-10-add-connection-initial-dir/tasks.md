## 1. Domain entities

- [x] 1.1 Adicionar campo `initialDirectory?: string` a `src/main/domain/entities/Connection.ts` (interface `Connection` e tipo `NewConnection`)
- [x] 1.2 Adicionar campo `initialDirectory?: string` a `src/renderer/domain/entities/Connection.ts` (interface `Connection` e tipo `NewConnection`)
- [x] 1.3 Adicionar campo `initialDirectory?: string` ao tipo `ActiveSession` em `src/renderer/domain/entities/EditorTab.ts`

## 2. Form de conexão

- [x] 2.1 Adicionar campo "Initial Directory" no estado inicial do formulário em `ConnectionForm.tsx` (inicializa com `connection?.initialDirectory ?? ''`)
- [x] 2.2 Renderizar input "Initial Directory" no formulário (opcional, placeholder `/home/user/projects`)
- [x] 2.3 Incluir `initialDirectory` no payload do `updateConnection` no `handleSave` (modo edição)

## 3. Sessão ativa

- [x] 3.1 Propagar `initialDirectory` da conexão para `ActiveSession` ao conectar em `AppContext.tsx` (campo `connection.initialDirectory`)

## 4. Explorador de arquivos

- [x] 4.1 Substituir `'/'` hardcoded por `activeSession.initialDirectory || '/'` na chamada `api.sftp.listDir` em `FileExplorer.tsx`

## 5. Testes

- [x] 5.1 Atualizar `ConnectionManager.test.tsx` (ou helpers de mock) para incluir `initialDirectory` nas conexões de teste onde relevante
- [x] 5.2 Adicionar teste: conexão com `initialDirectory` preenchido inicia explorador no diretório correto
- [x] 5.3 Adicionar teste: conexão sem `initialDirectory` usa `/` como fallback
