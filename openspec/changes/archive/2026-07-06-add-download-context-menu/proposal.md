## Why

Hoje o único jeito de tirar um arquivo remoto da máquina do servidor é abri-lo no editor (que baixa uma cópia temporária) — não existe uma forma de baixar um arquivo ou pasta remota para um local escolhido pelo usuário no Windows. Usuários que só querem exportar/baixar conteúdo (sem editar) precisam desse fluxo direto no explorador de arquivos.

## What Changes

- Adicionar item "Download" no menu de contexto do explorador de arquivos (`TreeNode.tsx`), disponível tanto para arquivos quanto para pastas.
- Para **arquivos**: baixa o conteúdo via SFTP e abre o diálogo nativo "Salvar como" do Windows (`dialog.showSaveDialog`) para o usuário escolher o destino.
- Para **pastas**: percorre recursivamente todo o conteúdo remoto, compacta em um `.zip` (mantendo a estrutura de diretórios) e abre o diálogo "Salvar como" para o usuário salvar o `.zip` resultante.
- Adicionar nova dependência de compactação zip no processo principal (main), já que não existe nenhuma lib de zip no projeto hoje.
- Feedback de progresso/erro via sistema de notificação já existente (`notify`), incluindo tratamento de pastas grandes/demoradas.

## Capabilities

### New Capabilities
- `file-download`: download de arquivos e pastas remotas (via SFTP) para o sistema de arquivos local do usuário, com diálogo nativo de "Salvar como"; pastas são compactadas em `.zip` recursivamente antes do download.

### Modified Capabilities
(nenhuma — as capacidades existentes de listagem/leitura via SFTP são reaproveitadas sem alteração de contrato)

## Impact

- **Renderer**: `src/renderer/ui/components/explorer/TreeNode.tsx` (novo item de menu), `src/renderer/domain/ports/IRemoteApi.ts` (novos métodos), `src/renderer/adapters/api/WindowRemoteApi.ts`.
- **Preload**: `src/preload/index.ts` (expor novos métodos `download:*`).
- **Main**: novo IPC handler (`src/main/infrastructure/ipc/download.ipc.ts`), possivelmente novo port/adapter (`IDownloadService` / implementação) para orquestrar leitura recursiva via `ISftpService` + compactação zip.
- **Dependências**: adicionar biblioteca de criação de arquivos zip (ex.: `archiver`) em `package.json`.
- **Sem impacto** em `ISftpService` (reaproveita `listDir`/`readFile` existentes) nem em armazenamento de credenciais/segurança.
