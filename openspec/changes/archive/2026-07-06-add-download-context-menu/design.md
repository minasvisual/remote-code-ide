## Context

O explorador de arquivos (`FileExplorer` / `TreeNode`) já tem um menu de contexto (`ContextMenu`) com ações como Rename, Delete, Upload, New File/Folder (ver `TreeNode.tsx:259-273`). O acesso ao servidor remoto passa sempre por `ISftpService` (implementado por `Ssh2SftpService`), que hoje expõe apenas operações que retornam `Buffer` inteiro em memória (`readFile`) ou percorrem a árvore recursivamente no próprio processo main (`deleteRecursive`, `listDir`). Não existe hoje nenhum fluxo de "salvar no disco local escolhido pelo usuário" — o único download existente é o download implícito para arquivo temporário ao abrir no editor (`sftp:readFile`, limitado a 5 MB via `MAX_FILE_SIZE` em `sftp.ipc.ts`).

Não há nenhuma biblioteca de zip no projeto (`package.json` não tem `archiver`/`adm-zip`/`yazl`).

## Goals / Non-Goals

**Goals:**
- Baixar um arquivo remoto individual para um caminho escolhido pelo usuário via diálogo nativo do Windows.
- Baixar uma pasta remota inteira como um único `.zip` (recursivo, preservando estrutura de diretórios), para um caminho escolhido pelo usuário.
- Reaproveitar `ISftpService` (mesma camada usada por list/read/delete) em vez de criar uma nova capacidade de acesso remoto paralela.
- Feedback claro de sucesso/erro via `notify()` já existente no renderer.

**Non-Goals:**
- Barra de progresso granular (% ou arquivo-a-arquivo) durante o download/zip — v1 mostra apenas estado "baixando" → sucesso/erro, seguindo o mesmo nível de simplicidade do fluxo de upload existente (que tem progresso granular, mas isso é um `stretch goal` fora do escopo aqui).
- Download de múltiplos itens selecionados simultaneamente (multi-seleção no explorador) — cada acionamento do menu de contexto opera sobre um único nó (arquivo ou pasta).
- Otimização de memória para arquivos individuais extremamente grandes (>> centenas de MB) — v1 usa o mesmo padrão de buffer completo em memória que `readFile` já usa hoje.
- Seguir links simbólicos (`type: 'symlink'`) recursivamente ao compactar uma pasta — evita ciclos infinitos.

## Decisions

### 1. Estender `ISftpService` em vez de criar um novo port `IDownloadService`
Download é fundamentalmente "ler dados remotos + gravar no disco local escolhido pelo usuário". A leitura remota já é responsabilidade do `ISftpService`; criar um port paralelo duplicaria a lógica de sessão SFTP (`getSftp`, cache de canal) já encapsulada em `Ssh2SftpService`. Seguimos o padrão documentado em `src/main/CLAUDE.md` ("How to Add a New SSH/SFTP Operation"): adicionar métodos ao port existente.

Novos métodos em `ISftpService`:
```typescript
downloadFile(sessionId: string, remotePath: string, localPath: string): Promise<void>
downloadFolderAsZip(sessionId: string, remotePath: string, localZipPath: string): Promise<void>
```
Ambos escrevem diretamente no `localPath`/`localZipPath` (não retornam Buffer) — o processo main já tem acesso a `fs`, então não há necessidade de passar bytes pela borda do IPC.

**Alternativa considerada**: novo port `IDownloadService` injetado separadamente. Rejeitada por duplicar a gestão de sessão SFTP e não trazer benefício real de separação (download não é uma capacidade de infraestrutura distinta, é uma composição de operações SFTP existentes).

### 2. Diálogo "Salvar como" é acionado ANTES de iniciar a transferência
Tanto para arquivo quanto para pasta, o fluxo é:
1. Renderer chama `sftp:openSaveDialog` (novo canal, análogo ao já existente `sftp:openUploadDialog`) com um nome sugerido (`node.name` para arquivo, `${node.name}.zip` para pasta).
2. Se o usuário cancelar, nada mais acontece (nenhuma chamada SFTP é feita).
3. Se confirmado, renderer chama `sftp:downloadFile` ou `sftp:downloadFolder` com o caminho local escolhido.

Isso evita transferir dados do servidor antes de saber se o usuário realmente quer salvar, e evita armazenamento intermediário em arquivo temporário (o zip é escrito diretamente no destino final via stream).

### 3. Biblioteca de zip: `archiver` (pinado em `^7.0.1`)
Precisamos compactar recursivamente arquivos vindos de streams/buffers remotos (não de um diretório local), então soluções baseadas em "zipar uma pasta do disco" não se aplicam diretamente. `archiver`:
- Aceita `.append(buffer | readableStream, { name: relativePath })`, permitindo alimentar o zip arquivo a arquivo conforme cada um é baixado via SFTP.
- Suporta `pipe()` direto para um `fs.createWriteStream(localZipPath)`, permitindo escrever o zip diretamente no destino final sem buffer intermediário do arquivo zip inteiro.
- Amplamente usado, mantido, licença MIT.
- **Importante**: `archiver@8.0.0` é uma reescrita ESM-only que remove a factory function clássica (`archiver('zip', options)`) em favor de `new ZipArchive(options)` — para manter a API estável, CJS, e compatível com `esModuleInterop` (usado em `tsconfig.node.json`), fixamos a dependência em `^7.0.1` (última major com a API clássica) junto com `@types/archiver@^6.0.4`.

**Alternativas consideradas**:
- `yazl`: mais baixo nível, exigiria mais código manual para portar a estrutura de diretórios; sem ganho relevante para este caso de uso.
- Implementação manual com `zlib`: `zlib` só resolve compressão (deflate/gzip), não o formato de container ZIP (central directory, entradas, etc.) — reimplementar isso é desnecessário dado que existe uma lib madura.

### 4. Percurso recursivo da pasta reaproveita `listDir` existente
`downloadFolderAsZip` percorre a árvore remota com a mesma lógica de pilha usada em `deleteRecursive`/`collectUploadEntries`: para cada entrada de `listDir`, se `type === 'directory'` recursa; se `type === 'file'` lê via stream SFTP e adiciona ao `archiver` com o caminho relativo (`relative(rootPath, entryPath)`); entradas `type === 'symlink'` são ignoradas (não seguidas), evitando ciclos.

### 5. Nomenclatura dos canais IPC
Seguindo o padrão `domain:action` já usado (`sftp:listDir`, `sftp:writeFile`, etc.):
- `sftp:openSaveDialog` (sessionId opcional não necessário; recebe `{ mode: 'file' | 'folder', suggestedName: string }`, retorna caminho escolhido ou `null` se cancelado)
- `sftp:downloadFile` (`sessionId`, `remotePath`, `localPath`) → `Promise<{ success: boolean; error?: string }>`
- `sftp:downloadFolder` (`sessionId`, `remotePath`, `localPath`) → `Promise<{ success: boolean; error?: string }>`

### 6. Limpeza em caso de erro
Se `downloadFile`/`downloadFolderAsZip` falhar no meio da escrita, o handler tenta apagar o arquivo local parcialmente escrito (`fs.promises.unlink`, ignorando erro de "arquivo não existe") antes de propagar o erro para o renderer, evitando deixar um arquivo `.zip`/arquivo corrompido e enganoso no destino escolhido.

## Risks / Trade-offs

- **[Risco]** Pastas muito grandes/profundas podem demorar bastante e não há indicação de progresso granular → **Mitigação**: notificação "Baixando..." imediata ao iniciar e sucesso/erro ao final (Non-Goal explícito evita escopo maior nesta iteração).
- **[Risco]** Arquivos individuais muito grandes ainda são bufferizados inteiramente em memória (mesma limitação que `sftp:readFile` já tem, mas sem o teto de 5 MB do fluxo de edição) → **Mitigação**: aceitável para v1 pois o padrão já existe no código; pode virar uma melhoria futura (stream direto sftp→disco sem buffer completo).
- **[Risco]** Nova dependência de terceiros (`archiver`) aumenta a superfície de manutenção → **Mitigação**: lib madura e amplamente usada, licença compatível (MIT).
- **[Risco]** Download parcial deixando arquivo corrompido no destino em caso de falha de rede no meio da transferência → **Mitigação**: limpeza automática do arquivo parcial no handler de erro (decisão 6).
- **[Trade-off]** Reaproveitar `ISftpService` em vez de um port dedicado simplifica a arquitetura, mas acopla lógica de zip dentro do adapter SFTP — aceitável dado o tamanho do projeto e o padrão já estabelecido (`deleteRecursive` também mistura orquestração recursiva no mesmo adapter).

## Open Questions

- Symlinks dentro de uma pasta baixada são simplesmente omitidos do zip (decisão 4) — se no futuro for necessário replicá-los (como link ou como cópia do alvo), isso fica para uma iteração futura.
