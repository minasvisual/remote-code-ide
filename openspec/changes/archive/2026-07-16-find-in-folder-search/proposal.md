## Why

Hoje, para descobrir em quais arquivos remotos um determinado texto aparece, o usuário precisa abrir arquivo
por arquivo manualmente no editor e usar a busca do Monaco (que só enxerga o conteúdo já aberto). Não existe
nenhuma forma de buscar conteúdo através de uma árvore de diretórios remota inteira via SFTP. Isso torna tarefas
comuns — encontrar onde uma função é usada, localizar uma string de configuração, auditar um `grep`-like em um
projeto remoto — lentas e manuais.

## What Changes

- Adicionar o item "Find in Folder..." ao menu de contexto de diretórios no explorador (`TreeNode.tsx`) e ao
  menu de contexto da área vazia/raiz do explorador (`FileExplorer.tsx`).
- Ao acionar o item, abrir um modal com um campo de busca; ao confirmar, o sistema varre recursivamente todos
  os arquivos de texto daquele diretório via SFTP, procurando ocorrências literais (substring, sem regex) do
  termo buscado no conteúdo dos arquivos.
- Exibir no modal a lista de arquivos com ocorrências, atualizada incrementalmente conforme a busca avança,
  mostrando o número de ocorrências e um trecho de contexto (linha) de cada match.
- Permitir cancelar uma busca em andamento (fechar o modal ou um botão "Cancel"); iniciar uma nova busca
  cancela automaticamente a anterior, se ainda estiver rodando.
- Ao clicar em um arquivo listado no resultado, abrir esse arquivo no editor (mesmo fluxo de
  `EditorContext.openFile` já usado ao clicar em um arquivo na árvore) e fechar o modal.
- Arquivos binários (detectados por heurística) e arquivos acima de um limite de tamanho são pulados
  silenciosamente durante a varredura, para manter a busca responsiva.

## Capabilities

### New Capabilities
- `content-search`: item de menu "Find in Folder...", modal de busca, listagem incremental de arquivos com
  ocorrências e abertura do arquivo selecionado no editor.

### Modified Capabilities
- `sftp-operations`: adiciona a operação de busca de conteúdo recursiva (`sftp:searchInFolder`), com relato de
  resultados incremental via evento (`sftp:searchProgress`) e suporte a cancelamento (`sftp:cancelSearch`),
  seguindo o mesmo padrão de transferência com `id` + eventos já usado por upload/download.

## Impact

- **Main**: `src/main/domain/ports/ISftpService.ts` (novo método `searchInFolder` e tipos `SearchFileMatch`/
  `SearchLineMatch`), `src/main/adapters/sftp/Ssh2SftpService.ts` (varredura recursiva reaproveitando o padrão
  de `collectFilesRecursive`/`listDir`), novo `src/main/adapters/temp/SearchTransferRegistry.ts` (registro de
  buscas ativas para permitir cancelamento, no mesmo espírito de `DownloadTransferRegistry`),
  `src/main/infrastructure/ipc/sftp.ipc.ts` (handlers `sftp:searchInFolder`/`sftp:cancelSearch` e evento
  `sftp:searchProgress`), `src/main/index.ts` (instancia o novo registry e injeta em `registerSftpIpc`).
- **Preload**: `src/preload/index.ts` (`searchInFolder`, `onSearchProgress`, `cancelSearch`).
- **Renderer**: `src/renderer/domain/ports/IRemoteApi.ts` (novos tipos e métodos em `sftp`), novo componente
  `src/renderer/ui/components/explorer/FindInFolderModal.tsx`, `TreeNode.tsx` (novo item de menu em
  diretórios), `FileExplorer.tsx` (novo item de menu na área vazia/raiz, hoje só mostra "Paste"),
  `src/renderer/__tests__/helpers/mockApi.ts` (mocks dos novos métodos).
- Nenhuma dependência nova é necessária; reaproveita o padrão de eventos existente (`sftp:uploadProgress`,
  `sftp:downloadProgress`) e `AbortController`/`AbortSignal` já usado em `downloadFile`.
