## 1. Dependência

- [x] 1.1 Adicionar `archiver` (e `@types/archiver` em devDependencies) ao `package.json` e instalar

## 2. Domínio e adapter (main)

- [x] 2.1 Adicionar `downloadFile(sessionId, remotePath, localPath): Promise<void>` e `downloadFolderAsZip(sessionId, remotePath, localZipPath): Promise<void>` a `src/main/domain/ports/ISftpService.ts`
- [x] 2.2 Implementar `downloadFile` em `Ssh2SftpService.ts`: abre `sftp.createReadStream(remotePath)` e faz pipe para `fs.createWriteStream(localPath)`, rejeitando/limpando o arquivo local em caso de erro de stream
- [x] 2.3 Implementar `downloadFolderAsZip` em `Ssh2SftpService.ts`: percorre recursivamente via `listDir` (reaproveitando o padrão de pilha de `deleteRecursive`), ignora entradas `type === 'symlink'`, adiciona cada arquivo a uma instância de `archiver('zip')` com o caminho relativo à pasta raiz, e faz pipe do archiver para `fs.createWriteStream(localZipPath)`
- [x] 2.4 Em ambos os métodos, apagar (`fs.promises.unlink`, ignorando erro "não existe") o arquivo local parcialmente escrito quando a operação falhar, antes de propagar o erro

## 3. IPC (main)

- [x] 3.1 Adicionar handler `sftp:openSaveDialog` em `sftp.ipc.ts` (recebe `{ mode: 'file' | 'folder', suggestedName: string }`, usa `dialog.showSaveDialog` com `defaultPath: suggestedName`, retorna o caminho escolhido ou `null` se cancelado) — seguir o padrão já usado em `sftp:openUploadDialog`
- [x] 3.2 Adicionar handler `sftp:downloadFile` (`sessionId`, `remotePath`, `localPath`) chamando `sftp.downloadFile`, retornando `{ success, error? }` (padrão dos handlers já existentes)
- [x] 3.3 Adicionar handler `sftp:downloadFolder` (`sessionId`, `remotePath`, `localPath`) chamando `sftp.downloadFolderAsZip`, retornando `{ success, error? }`

## 4. Contrato IPC (renderer)

- [x] 4.1 Adicionar `openSaveDialog`, `downloadFile`, `downloadFolder` a `IRemoteApi.ts` (namespace `sftp`)
- [x] 4.2 Implementar os três métodos em `src/preload/index.ts` (`ipcRenderer.invoke`)
- [x] 4.3 Confirmar que `WindowRemoteApi.ts` expõe os novos métodos sem alterações adicionais (delegação direta a `window.api`)

## 5. UI — menu de contexto do explorador

- [x] 5.1 Adicionar item "Download" ao `contextMenuItems` em `TreeNode.tsx`, disponível tanto para `type === 'file'` quanto `type === 'directory'`
- [x] 5.2 Implementar `handleDownloadClick`: chama `api.sftp.openSaveDialog` com `suggestedName = node.name` (arquivo) ou `${node.name}.zip` (pasta); se não cancelado, chama `api.sftp.downloadFile` ou `api.sftp.downloadFolder` conforme `node.type`
- [x] 5.3 Exibir notificação (`notify`) de sucesso ao concluir e de erro em caso de falha, usando o padrão já usado em delete/rename

## 6. Testes (renderer)

- [x] 6.1 Atualizar `createMockApi()` em `src/renderer/__tests__/helpers/mockApi.ts` com mocks para `openSaveDialog`, `downloadFile`, `downloadFolder`
- [x] 6.2 Adicionar testes em `TreeNode.test.tsx`: item "Download" aparece no menu de contexto de arquivo e de pasta; clicar chama `openSaveDialog` com o nome sugerido correto e, se confirmado, chama `downloadFile`/`downloadFolder`; se o diálogo for cancelado, nenhuma chamada de download é feita

## 7. Verificação manual

- [x] 7.1 Rodar `npm run typecheck` e `npm run test:unit`
- [x] 7.2 Testar manualmente (via `/verify` ou `npm run dev`) contra um servidor SSH real: baixar um arquivo pequeno, baixar uma pasta com subpastas aninhadas, cancelar o diálogo de salvar, e forçar um erro (ex: desconectar a sessão) para confirmar a notificação de erro e a limpeza do arquivo parcial
