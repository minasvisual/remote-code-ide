## Context

O menu de contexto do explorador (`ContextMenu` acionado a partir de `TreeNode.tsx`) hoje cobre Copy/Paste, Rename, Delete, Download, Upload, Open Terminal Here, New File/Folder e Refresh (`TreeNode.tsx:334-352`). Todos os itens que precisam de dados do servidor usam `ISftpService` via IPC (`sftp:*`), seguindo o padrão documentado em `src/main/CLAUDE.md`.

Os únicos metadados de arquivo/pasta disponíveis hoje no renderer são os campos de `FileNode` (`name`, `path`, `type`, `size`, `modifiedAt`, `permissions`) retornados por `sftp:listDir` (`Ssh2SftpService.listDir`, `Ssh2SftpService.ts:87-123`). Esses campos:
- Vêm de `sftp.readdir`, cujo `attrs` já expõe `mode`, `uid`, `gid`, `size`, `atime`, `mtime` (ver `node_modules/ssh2/SFTP.md`, seção ATTRS) — mas hoje só `size`, `mtime` e `mode` (como octal) são mapeados para `FileNode`; `uid`, `gid` e `atime` são descartados.
- Podem estar desatualizados: são preenchidos na última vez que o diretório pai foi listado, não no momento em que o usuário abre o menu de contexto.

Já existe um método privado `statSafe` em `Ssh2SftpService` (`Ssh2SftpService.ts:452-459`) que chama `sftp.stat` sob demanda — usado hoje só para checar existência de destino em `copy`. Ele será a base para a nova consulta pública de metadados.

**Limitação de protocolo**: o pedido original menciona "data de criação" como exemplo de informação a exibir. O `ATTRS` do SFTP v3 (o que a lib `ssh2` implementa) não tem campo de `birthtime`/creation time — apenas `atime` (acesso) e `mtime` (modificação). Não há como obter data de criação real de um arquivo remoto por este protocolo sem extensões não padronizadas que o `ssh2` não implementa. O design assume essa limitação e não tenta contorná-la.

## Goals / Non-Goals

**Goals:**
- Exibir metadados precisos e atualizados de um único arquivo/pasta/symlink remoto num modal, acionado por "Properties" no final do menu de contexto do explorador.
- Não baixar/ler o conteúdo do arquivo para obter essas informações — apenas `stat` (sempre), `readlink` (só para symlinks) e `listDir` (só para pastas, para contar itens diretos).
- Reaproveitar `ISftpService` e o padrão de IPC já estabelecido, sem introduzir um novo port.

**Non-Goals:**
- Edição de permissões/dono a partir do modal (somente leitura, v1). `chmod`/`chown` ficam fora de escopo.
- Tamanho recursivo de pastas (soma de todos os arquivos dentro, recursivamente) — exigiria percorrer toda a árvore (mesmo custo de `deleteRecursive`/`downloadFolderAsZip`) só para exibir um número; v1 mostra apenas a contagem de itens diretos (um único `listDir` na própria pasta).
- Properties de múltiplos itens selecionados simultaneamente — o menu de contexto hoje opera sobre um único nó por vez (mesma limitação já aceita em Download/Copy).
- Resolver o alvo final de symlinks encadeados (`readlink` de um `readlink`) — mostra apenas o alvo imediato retornado por `sftp.readlink`.

## Decisions

### 1. Novo método `getFileInfo` em `ISftpService`, não um novo port
Segue o padrão já usado para `downloadFile`/`downloadFolderAsZip` (ver mudança arquivada `add-download-context-menu`): a operação é fundamentalmente "consultar o servidor remoto via SFTP", que já é responsabilidade de `ISftpService`/`Ssh2SftpService`. Um port novo duplicaria a gestão de sessão/canal SFTP (`getSftp`) sem ganho de separação real.

```typescript
export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory' | 'symlink'
  size: number
  itemCount?: number        // apenas para type === 'directory'
  permissions: string       // octal, ex: '755'
  owner: number             // uid
  group: number             // gid
  modifiedAt: string        // ISO 8601, de attrs.mtime
  accessedAt: string        // ISO 8601, de attrs.atime
  symlinkTarget?: string    // apenas para type === 'symlink', de sftp.readlink
}

getFileInfo(sessionId: string, path: string): Promise<FileInfo>
```

`permissions` continua octal (mesma convenção já usada em `FileNode.permissions`); a conversão para forma simbólica (`rwxr-xr-x`) é feita no componente de UI, evitando duplicar essa lógica de formatação no main.

### 2. `getFileInfo` sempre busca dados frescos, não reaproveita `FileNode` da árvore
O objetivo explícito (ver Why do proposal.md) é corrigir a limitação de dados desatualizados do `listDir` em cache. Por isso `getFileInfo` sempre chama `sftp.stat(path)` no momento em que o modal é aberto, em vez de aceitar o `FileNode` já carregado como parâmetro. Custo adicional é uma única chamada SFTP (`stat`), equivalente em custo ao `statSafe` já usado em `copy`.

### 3. Contagem de itens de pasta via `listDir` existente, não um novo comando
Para `type === 'directory'`, `getFileInfo` chama `this.listDir(sessionId, path)` internamente e usa `.length` como `itemCount`. Reaproveita o método já testado e usado pela árvore, em vez de implementar uma contagem separada (ex: `sftp.readdir` cru). Isso significa que pastas com milhares de itens pagam o mesmo custo de uma expansão normal na árvore — aceitável, é o mesmo custo que o usuário já paga ao expandir a pasta no explorador.

### 4. Symlinks: `readlink` best-effort
Para `type === 'symlink'`, `getFileInfo` tenta `sftp.readlink(path)`; se falhar (ex: link quebrado), `symlinkTarget` fica `undefined` e o modal mostra "—" em vez de propagar erro — o restante das informações (`stat` do próprio link) ainda é útil mesmo com link quebrado.

### 5. Canal IPC: `sftp:getFileInfo`
Segue o padrão `domain:action` e o formato de retorno já usado por handlers que podem falhar de forma recuperável (`sftp:createFile`, `sftp:copy`):
```typescript
ipcMain.handle('sftp:getFileInfo', async (_e, sessionId: string, path: string) => {
  try {
    const info = await sftp.getFileInfo(sessionId, path)
    return { success: true, data: info }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
})
```

### 6. Novo componente `FilePropertiesModal.tsx`, montado a partir de `TreeNode.tsx`
Mesmo padrão dos modais existentes em `TreeNode.tsx` (delete confirm, overwrite conflict): estado local `propertiesTarget: FileNode | null`, renderizado condicionalmente ao lado dos demais modais. O componente:
- Recebe `node` (para `path`/`type` iniciais) e `sessionId`.
- No mount, chama `api.sftp.getFileInfo(sessionId, node.path)`, mostra `Spinner` (padrão já usado em `TreeNode`/`FileExplorer`) enquanto carrega.
- Formata `size` em bytes + forma legível (KB/MB/GB) com um helper local `formatBytes`, análogo ao helper local `getFileIcon` já existente em `TreeNode.tsx`.
- Deriva a extensão do `name` no próprio componente (mesma lógica de `getFileIcon`), sem precisar de campo novo do backend.
- Em caso de erro (ex: sessão caiu entre o clique e a resposta), mostra mensagem de erro dentro do próprio modal em vez de fechar silenciosamente.

### 7. Item "Properties" sempre por último no menu, com divisor antes dele
Para atender ao pedido explícito ("no final"), o item é anexado ao final do array `contextMenuItems` em `TreeNode.tsx`, precedido por um divisor, e disponível para `file`, `directory` e `symlink` (diferente de itens como Download/Rename que hoje só cobrem file/directory).

## Risks / Trade-offs

- **[Risco]** UID/GID exibidos são números crus (o SFTP v3 não resolve para nome de usuário/grupo) → **Mitigação**: aceitável para v1; exibir "UID 1000" é informação real e útil mesmo sem resolução de nome, e resolver nomes exigiria um canal adicional (`exec` de `id`/`getent`) fora do escopo desta mudança.
- **[Risco]** Ausência de data de criação pode frustrar expectativa do pedido original → **Mitigação**: documentado explicitamente no proposal e no próprio modal (linha "Created: not available via SFTP", omitida discretamente) para não parecer um bug.
- **[Risco]** Contagem de itens de pastas muito grandes pode demorar (mesma latência de expandir a pasta) → **Mitigação**: `Spinner` de carregamento no modal; não é uma regressão de performance nova, é a mesma operação já paga hoje ao expandir a pasta.
- **[Trade-off]** Reaproveitar `ISftpService` em vez de um port dedicado mantém a arquitetura simples, ao custo de mais um método concentrado no mesmo adapter — consistente com o padrão já aceito em `copy`/`downloadFolderAsZip`.

## Open Questions
(nenhuma)
