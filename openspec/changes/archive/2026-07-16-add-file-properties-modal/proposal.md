## Why

Hoje o menu de contexto do explorador de arquivos não tem nenhuma forma de consultar metadados de um arquivo ou pasta remota (tamanho, permissões, datas, etc.) sem abrir o arquivo no editor ou baixá-lo — os dados exibidos na árvore (`FileNode.size`/`modifiedAt`/`permissions`) vêm do último `listDir` e podem estar desatualizados. Usuários que precisam apenas inspecionar informações do item (ex: confirmar tamanho antes de decidir baixar, checar permissões, ver o caminho completo) não têm essa opção hoje.

## What Changes

- Adicionar item "Properties" ao final do menu de contexto do explorador de arquivos (`TreeNode.tsx`), disponível para arquivos, pastas e symlinks.
- Ao clicar, abre um modal exibindo metadados do item, obtidos via uma nova consulta SFTP `stat` (sempre fresca, não reaproveita o cache da árvore):
  - Nome, caminho completo, tipo (Arquivo / Pasta / Link simbólico)
  - Extensão (derivada do nome, apenas para arquivos)
  - Tamanho (bytes + formato legível, ex: "482 KB (493.212 bytes)")
  - Quantidade de itens diretos (apenas para pastas, via `listDir` da própria pasta)
  - Permissões (octal, ex: `755`, e simbólica, ex: `rwxr-xr-x`)
  - Dono (UID) e grupo (GID)
  - Data de modificação e data de último acesso
  - Alvo do link (apenas para symlinks, via `readlink`)
- **Sem data de criação**: o protocolo SFTP v3 (implementado pela lib `ssh2` usada no projeto) não expõe `birthtime`/creation time em seus atributos (`ATTRS` só tem `mode`, `uid`, `gid`, `size`, `atime`, `mtime`) — por isso esse campo não aparece no modal, ao contrário do pedido original que citava "data de criação" como exemplo.
- Nenhum conteúdo do arquivo é lido/baixado para exibir essas informações (apenas `stat`/`readdir`/`readlink`, sem `readFile`).

## Capabilities

### New Capabilities
- `file-properties`: exibição de metadados de um arquivo/pasta/symlink remoto (tamanho, tipo, permissões, dono/grupo, datas, contagem de itens) em um modal acionado pelo item "Properties" do menu de contexto do explorador, sem baixar o conteúdo do arquivo.

### Modified Capabilities
(nenhuma — a nova consulta de metadados é um método adicional em `ISftpService`, sem alterar o contrato/comportamento de `listDir`, `readFile` ou demais operações já especificadas em `sftp-operations`)

## Impact

- **Renderer**: `src/renderer/ui/components/explorer/TreeNode.tsx` (novo item de menu + estado do modal), novo componente `src/renderer/ui/components/explorer/FilePropertiesModal.tsx`, `src/renderer/domain/ports/IRemoteApi.ts` (novo método `sftp.getFileInfo`), `src/renderer/adapters/api/WindowRemoteApi.ts`.
- **Preload**: `src/preload/index.ts` (expor `sftp:getFileInfo`).
- **Main**: novo handler em `src/main/infrastructure/ipc/sftp.ipc.ts` (`sftp:getFileInfo`), novo método `getFileInfo` em `src/main/domain/ports/ISftpService.ts` e implementação em `src/main/adapters/sftp/Ssh2SftpService.ts` (reaproveitando `sftp.stat`, `sftp.readlink` e o `listDir` existente para contagem de itens).
- **Sem impacto** em armazenamento de credenciais, segurança de conexão, ou nos contratos existentes de `listDir`/`readFile`/`downloadFile`.
