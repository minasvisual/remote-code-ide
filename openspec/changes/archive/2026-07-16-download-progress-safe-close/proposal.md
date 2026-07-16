## Why

Ao baixar arquivos grandes via SFTP (download para disco local ou abertura no editor), o usuário não recebe
nenhum feedback de progresso — a UI fica parada até o download terminar, sem indicação de quanto falta ou
throughput. Além disso, se a janela do app é fechada enquanto um download está em andamento, o processo é
interrompido abruptamente e o arquivo parcial em disco permanece com lock (Windows) ou órfão no diretório
temporário, sem limpeza. Isso é ruim tanto para a experiência (usuário não sabe se o app travou) quanto para
higiene de disco (arquivos parciais/lockados se acumulam).

## What Changes

- Adicionar progresso de download em nível de bytes para `sftp:downloadFile` e `sftp:downloadFolder`
  (download-to-disk), via novo canal IPC `sftp:downloadProgress` seguindo o padrão já usado por
  `sftp:uploadProgress`.
- Exibir o progresso na UI (barra/percentual) enquanto o download está em andamento, ao invés do toast estático
  atual que só aparece em sucesso/erro.
- Adicionar suporte a cancelamento de um download em andamento (`sftp:cancelDownload`), interrompendo o
  stream SFTP e removendo o arquivo parcial já escrito em disco.
- Ao tentar fechar a janela principal com um ou mais downloads em andamento, interceptar o evento de fechamento
  e exibir um diálogo de confirmação oferecendo: cancelar o(s) download(s) e excluir os arquivos parciais antes
  de fechar, ou continuar o download e não fechar a janela.
- **BREAKING**: a assinatura dos métodos `downloadFile`/`downloadFolder` em `ISftpService` e em `IRemoteApi`
  passa a aceitar um identificador de transferência e um callback/canal de progresso.

## Capabilities

### New Capabilities
- `safe-window-close`: intercepta o fechamento da janela principal do Electron quando há transferências ativas
  (downloads), exibindo um diálogo de confirmação e limpando arquivos parciais antes de permitir o fechamento.

### Modified Capabilities
- `sftp-operations`: os requisitos de download para disco local (`sftp:downloadFile`, `sftp:downloadFolder`,
  atualmente não documentados no spec) passam a exigir relato de progresso em bytes e suporte a cancelamento
  com limpeza do arquivo parcial.

## Impact

- **Main**: `src/main/domain/ports/ISftpService.ts`, `src/main/adapters/sftp/Ssh2SftpService.ts`,
  `src/main/infrastructure/ipc/sftp.ipc.ts`, `src/main/adapters/temp/TempFileManager.ts`, `src/main/index.ts`
  (novo handler de `close` na `BrowserWindow`, hoje inexistente).
- **Preload**: `src/preload/index.ts` (novo `onDownloadProgress`, `cancelDownload`).
- **Renderer**: `src/renderer/domain/ports/IRemoteApi.ts`, `src/renderer/ui/components/explorer/TreeNode.tsx`
  (dispara download e ouve progresso), novo componente de progresso (ou extensão do `Notification`/
  `AppContext`), novo diálogo de confirmação de fechamento.
- Nenhuma dependência nova é necessária; reaproveita o padrão de eventos existente (`sftp:uploadProgress`,
  `webContents.send`).
