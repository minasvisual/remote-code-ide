## Why

Ao conectar via SSH, o explorador de arquivos sempre inicia na raiz do servidor (`/`), forçando o usuário a navegar manualmente até o diretório de trabalho a cada reconexão. Adicionar um campo "Initial Directory" na conexão elimina essa fricção e torna o fluxo de trabalho mais rápido para usuários que trabalham em diretórios específicos com frequência.

## What Changes

- Novo campo opcional `initialDirectory` (string) na entidade `Connection`
- Campo de texto "Initial Directory" adicionado ao formulário de criação/edição de conexão
- Ao conectar, o explorador de arquivos inicia a listagem a partir de `initialDirectory` (quando preenchido) em vez de `/`
- Persistência do campo no `electron-store` junto com os demais dados da conexão

## Capabilities

### New Capabilities

- `connection-initial-directory`: Campo opcional na conexão que define o diretório inicial do explorador de arquivos ao estabelecer a sessão SSH

### Modified Capabilities

- `connection-management`: Adição do campo `initialDirectory` à estrutura de dados da conexão e ao fluxo de save/load

## Impact

- `src/main/domain/entities/Connection.ts` — adicionar campo `initialDirectory?: string`
- `src/renderer/domain/entities/` — espelhar o campo no lado renderer (se existir entidade separada)
- `src/renderer/ui/components/connections/ConnectionForm.tsx` — novo input no formulário
- `src/renderer/application/contexts/AppContext.tsx` — passar `initialDirectory` ao iniciar sessão
- `src/renderer/ui/components/explorer/FileExplorer.tsx` — usar `initialDirectory` como raiz inicial da listagem
- Sem mudanças em IPC channels (o campo trafega junto com os dados de conexão existentes)
- Sem dependências externas novas
