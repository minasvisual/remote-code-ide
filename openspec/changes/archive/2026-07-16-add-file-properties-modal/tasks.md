## 1. Domínio e adapter (main)

- [x] 1.1 Adicionar tipo `FileInfo` (`name`, `path`, `type`, `size`, `itemCount?`, `permissions`, `owner`, `group`, `modifiedAt`, `accessedAt`, `symlinkTarget?`) e o método `getFileInfo(sessionId: string, path: string): Promise<FileInfo>` a `src/main/domain/ports/ISftpService.ts`
- [x] 1.2 Implementar `getFileInfo` em `Ssh2SftpService.ts`: chamar `sftp.stat` (promisificado, seguindo o padrão de `statSafe`) para obter `mode`/`uid`/`gid`/`size`/`atime`/`mtime`; derivar `type` a partir do `mode` (mesma lógica de bitmask já usada em `listDir`: `& 0o170000`)
- [x] 1.3 Quando `type === 'directory'`, reaproveitar `this.listDir(sessionId, path)` e usar `.length` como `itemCount`
- [x] 1.4 Quando `type === 'symlink'`, chamar `sftp.readlink(path)` (promisificado); se falhar, deixar `symlinkTarget` como `undefined` em vez de propagar erro
- [x] 1.5 Converter `mtime`/`atime` (segundos UNIX) para ISO 8601 (`modifiedAt`/`accessedAt`), mesma conversão já usada para `modifiedAt` em `listDir`

## 2. IPC (main)

- [x] 2.1 Adicionar handler `sftp:getFileInfo` em `sftp.ipc.ts` (recebe `sessionId`, `path`; retorna `{ success: true, data: FileInfo } | { success: false, error: string }`, seguindo o padrão de `sftp:createFile`/`sftp:copy`)

## 3. Contrato IPC (renderer)

- [x] 3.1 Adicionar `getFileInfo(sessionId, path): Promise<FileInfo>` a `IRemoteApi.ts` (namespace `sftp`), incluindo o tipo `FileInfo` espelhado em `src/renderer/domain/entities/` ou reexportado de `IRemoteApi.ts`
- [x] 3.2 Implementar `getFileInfo` em `src/preload/index.ts` (`ipcRenderer.invoke('sftp:getFileInfo', ...)`, lançando erro quando `success: false`, mesmo padrão dos demais métodos que retornam `{ success, error }`)
- [x] 3.3 Confirmar que `WindowRemoteApi.ts` expõe o novo método sem alterações adicionais (delegação direta a `window.api`)

## 4. UI — modal de propriedades

- [x] 4.1 Criar `src/renderer/ui/components/explorer/FilePropertiesModal.tsx`: recebe `node: FileNode`, `sessionId: string`, `onClose(): void`; usa `Modal` de `commons/Modal.tsx`
- [x] 4.2 No mount, chamar `api.sftp.getFileInfo(sessionId, node.path)`; exibir `Spinner` enquanto carrega; exibir mensagem de erro dentro do modal (sem fechar) se a chamada falhar
- [x] 4.3 Implementar helper local `formatBytes(bytes: number): string` (formato "482 KB (493.212 bytes)" ou equivalente), análogo em estilo ao helper local `getFileIcon` já existente em `TreeNode.tsx`
- [x] 4.4 Derivar extensão do `node.name` no componente (mesma lógica de `getFileIcon`) e exibi-la apenas quando `type === 'file'`
- [x] 4.5 Converter `permissions` (octal) para forma simbólica (`rwxr-xr-x`) no componente e exibir ambas as formas
- [x] 4.6 Renderizar campos condicionalmente por tipo: `itemCount` só para `directory`; `symlinkTarget` (ou "—" se ausente) só para `symlink`; nenhum campo de "data de criação" em nenhum caso

## 5. UI — menu de contexto do explorador

- [x] 5.1 Adicionar estado `propertiesTarget: FileNode | null` em `TreeNode.tsx` (mesmo padrão de `deleteTarget`)
- [x] 5.2 Adicionar item "Properties" ao final de `contextMenuItems`, precedido por um divisor (`{ type: 'divider' }`), disponível para `file`, `directory` e `symlink` (sem a restrição `canCopy`/`canPaste` de outros itens)
- [x] 5.3 Renderizar `FilePropertiesModal` condicionalmente quando `propertiesTarget` estiver definido, ao lado dos demais modais já renderizados em `TreeNode.tsx`

## 6. Testes (renderer)

- [x] 6.1 Atualizar `createMockApi()` em `src/renderer/__tests__/helpers/mockApi.ts` com mock para `getFileInfo`
- [x] 6.2 Adicionar testes em `TreeNode.test.tsx`: item "Properties" aparece como último item do menu de contexto para arquivo, pasta e symlink; clicar abre o modal e chama `api.sftp.getFileInfo` com o `path` correto
- [x] 6.3 Criar `FilePropertiesModal.test.tsx`: exibe `Spinner` durante o carregamento; exibe os campos corretos para um arquivo (incluindo extensão, tamanho formatado, permissões simbólica); exibe `itemCount` para uma pasta; exibe `symlinkTarget` (ou "—") para um symlink; exibe mensagem de erro quando `getFileInfo` rejeita, sem fechar o modal

## 7. Verificação manual

- [x] 7.1 Rodar `npm run typecheck` e `npm run test:unit`
- [x] 7.2 ~~Testar manualmente contra um servidor SSH real~~ — sem servidor de teste disponível neste ambiente; fechado com base na cobertura automatizada (205 testes unitários passando, incluindo os cenários de arquivo/pasta/pasta vazia/symlink/erro em `FilePropertiesModal.test.tsx` e `TreeNode.test.tsx`) e no typecheck limpo do código de produção
