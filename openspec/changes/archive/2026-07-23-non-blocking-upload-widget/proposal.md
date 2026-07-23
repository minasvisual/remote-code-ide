## Why

Hoje, o `UploadDialog` é um modal centralizado com overlay (`fixed inset-0` + backdrop escuro) que
bloqueia toda a interação com a aplicação enquanto um upload está em andamento — o usuário não
consegue navegar no explorador, editar arquivos ou usar o terminal até o upload terminar e o modal
ser fechado. Isso é especialmente ruim para uploads de pastas grandes, que podem levar bastante
tempo. O progresso de upload deve ser visível sem impedir o resto do trabalho.

## What Changes

- **BREAKING**: Remover o modal bloqueante `UploadDialog` (overlay + `fixed inset-0`) do fluxo de upload.
- Substituir por um widget flutuante não-bloqueante ancorado no canto inferior direito da janela,
  seguindo o mesmo padrão visual/posicional do `NotificationList` já existente.
- O widget tem dois estados: **recolhido** (barra compacta com nome do upload atual/contagem e
  progresso resumido) e **expandido** (lista completa de arquivos com status individual), alternados
  por um toggle de expansão clicado pelo usuário.
- O widget aparece automaticamente quando um upload começa e permanece disponível — sem overlay,
  sem bloquear cliques no restante da UI — permitindo que o usuário continue navegando, editando e
  usando o terminal durante o upload.
- Fechar/dispensar o widget quando todos os itens estiverem `done`/`error` não cancela nada (uploads
  já concluídos); o widget nunca pode ser fechado enquanto houver itens `pending`/`uploading` — pode
  apenas ser recolhido.
- Múltiplos uploads iniciados em sequência (ex.: upload em duas pastas diferentes antes do primeiro
  terminar) devem ser representados no mesmo widget, sem abrir instâncias sobrepostas.

## Capabilities

### New Capabilities
- `upload-progress-widget`: widget flutuante e não-bloqueante de progresso de upload, ancorado no
  canto inferior direito, com estados recolhido/expandido via toggle.

### Modified Capabilities
(nenhuma — não há requisitos de spec existentes cobrindo o `UploadDialog`; o comportamento de
transferência em si, via `sftp:uploadFiles`/`sftp:onUploadProgress`, não muda)

## Impact

- `src/renderer/ui/components/commons/UploadDialog.tsx` — removido/substituído por um novo componente
  de widget (ex.: `UploadWidget.tsx`), reaproveitando o mesmo modelo `UploadEntry`.
- `src/renderer/ui/components/commons/__tests__/UploadDialog.test.tsx` — substituído por testes do
  novo componente.
- `src/renderer/ui/components/explorer/FileExplorer.tsx` — troca o estado/render de
  `showUploadDialog`/`UploadDialog` pelo novo widget; lógica de `handleUpload` e
  `handleUploadDialogClose` (fechamento/refresh do diretório-alvo) permanece, mas deixa de exigir
  fechamento explícito bloqueante.
- Nenhuma mudança em IPC, `ISftpService`, ou nos canais `sftp:uploadFiles`/`sftp:onUploadProgress`.
