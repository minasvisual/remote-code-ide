## Context

O upload de arquivos/pastas é hoje disparado em `FileExplorer.tsx` (`handleUpload`), que guarda
`uploadEntries`/`showUploadDialog` em estado local do componente e assina
`api.sftp.onUploadProgress`. O resultado é renderizado como `UploadDialog`, um modal com overlay
(`fixed inset-0 bg-black/60`) que ocupa a tela inteira e desabilita o botão de fechar enquanto
`isInProgress` é verdadeiro.

Importante: `FileExplorer` é montado condicionalmente dentro do sidebar switch em
`IDELayout` (`App.tsx`) — ao trocar para "Extensions", "About" ou "Connections" no `ActivityBar`,
`FileExplorer` desmonta. Um widget "não-bloqueante" que precise sobreviver à troca de aba do
sidebar não pode viver em estado local de `FileExplorer`; a transferência real em si continua no
processo main independentemente da UI, mas o estado de progresso do renderer seria perdido.

Já existe um padrão de widget flutuante não-bloqueante no canto inferior direito:
`NotificationList` (`Notification.tsx`), renderizado uma única vez em `IDELayout` com
`fixed bottom-8 right-4 z-50`, cujas entradas já suportam uma barra de progresso (`n.progress`) para
downloads. O novo widget de upload deve seguir o mesmo padrão de posicionamento/z-index, mas como um
componente próprio (não reaproveita o modelo de notificação single-line, pois upload precisa listar
múltiplos arquivos com status individual e alternar entre resumido/expandido).

## Goals / Non-Goals

**Goals:**
- Upload nunca bloqueia a interação com o resto da aplicação (explorer, editor, terminal, troca de
  sidebar) — sem overlay, sem `fixed inset-0`.
- Progresso visível como widget ancorado no canto inferior direito, no mesmo nível de empilhamento
  que `NotificationList`, sem sobrepor as notificações existentes.
- Widget com dois estados — recolhido (compacto, uma linha com resumo) e expandido (lista completa
  por arquivo) — alternados por um toggle explícito controlado pelo usuário.
- Estado de upload sobrevive à troca de view no sidebar (mover para `AppContext`, mesmo mecanismo já
  usado por `notifications`).
- Reaproveitar o modelo de dados `UploadEntry` e os canais IPC existentes
  (`sftp.uploadFiles`, `sftp.onUploadProgress`) sem alterações de contrato.

**Non-Goals:**
- Não implementa cancelamento de upload em andamento (fora de escopo desta mudança).
- Não altera a lógica de transferência em si, nem os handlers `sftp.ipc.ts` / `Ssh2SftpService`.
- Não unifica o widget de upload com `NotificationList` num único componente — convivem lado a lado.
- Não adiciona persistência entre reinícios da aplicação (o widget é efêmero, como hoje).

## Decisions

### 1. Estado de upload move de `FileExplorer` para `AppContext`
`uploadEntries`, `showUploadDialog`/estado equivalente de visibilidade, o estado de
recolhido/expandido, e a assinatura `onUploadProgress` passam a viver em `AppContext.tsx`, expostos
via `useApp()` (mesmo padrão de `notifications`/`notify`/`dismissNotification`). `FileExplorer`
continua disparando o upload (chama um novo método do contexto, ex. `startUpload(sessionId,
targetDir, paths)`), mas não é mais dono do estado de progresso nem faz o render do widget.
**Alternativa considerada**: manter estado em `FileExplorer` e usar um portal/`createPortal` para
renderizar fora da árvore do sidebar. Rejeitada — o estado em si (a assinatura de progresso, os
`uploadEntries`) ainda seria perdido ao desmontar `FileExplorer`, um portal só resolve o problema de
render, não o de ciclo de vida do estado.

### 2. Novo componente `UploadWidget.tsx`, renderizado uma vez em `IDELayout`
Substitui `UploadDialog.tsx`. Renderizado ao lado de `<NotificationList />` em `App.tsx`, com
`fixed bottom-20 right-4 z-50` (acima do `NotificationList`, que fica em `bottom-8`) para não
sobrepor notificações ativas ao mesmo tempo que uploads acontecem. Só renderiza algo (retorna `null`)
quando não há uploads ativos/recentes — mesmo padrão de guarda que `NotificationList` já usa.

### 3. Toggle de expansão é estado local do widget, não do contexto
Se o usuário expandir e a lista de arquivos crescer/mudar de estado (novo evento de progresso), o
widget deve manter o estado de expansão escolhido pelo usuário. Expandido/recolhido é `useState`
local em `UploadWidget`, inicializado como recolhido; a lista de entradas em si (dado) vem do
contexto.

### 4. Fechar vs. recolher
"Fechar" (dispensar o widget) só é permitido quando todas as entradas estão em `done`/`error` — igual
à regra atual do `UploadDialog` (`isInProgress` desabilita o fechamento). Diferença: como o widget
não bloqueia nada, "fechar" deixa de ser a única forma de sair da tela — o usuário pode simplesmente
ignorá-lo ou recolhê-lo (toggle) mesmo com upload em andamento. Recolher nunca é bloqueado, mesmo
durante upload ativo.

### 5. Reuso do fluxo de refresh do diretório-alvo
A lógica atual em `handleUploadDialogClose` (recarregar `rootNodes` se `targetDir === '/'`, ou
disparar `refreshTarget` para um subdiretório) é preservada, mas passa a ser acionada quando o
contexto detecta que todas as entradas do upload concluíram (não mais atrelada ao clique explícito de
fechar o modal). `FileExplorer` continua escutando esse sinal (ex. um callback opcional passado ao
iniciar o upload, ou observando a transição de "em andamento" → "concluído" das entradas do contexto)
para disparar o refresh da árvore de arquivos correta.

## Risks / Trade-offs

- **[Risco]** Mover estado para `AppContext` aumenta o escopo do contexto e pode acoplar upload a um
  contexto já concorrido → **Mitigação**: expor como slice isolado dentro do contexto (estado e
  ações próprias, ex. `uploadState`, `startUpload`, `dismissUpload`), sem misturar com o array de
  `notifications`.
- **[Risco]** Sem overlay bloqueante, o usuário pode iniciar uma segunda operação (ex. deletar um
  arquivo que está sendo enviado) durante o upload → **Mitigação**: fora de escopo desta mudança;
  o comportamento de conflito de operações concorrentes no SFTP já não era protegido pelo modal atual
  de forma alguma (o modal só bloqueava a UI do renderer, não impedia race conditions reais no
  backend) — não há regressão de segurança/integridade em relação ao estado atual.
- **[Risco]** Dois uploads iniciados em sequência antes do primeiro terminar podem confundir o
  refresh do diretório-alvo (`uploadTargetDirRef` só guarda um diretório) → **Mitigação**: o widget
  deve tratar entradas por upload em lote (mantendo qual diretório-alvo pertence a qual lote), não
  apenas uma lista achatada global; detalhado em tasks.md.

## Migration Plan

1. Adicionar estado/ações de upload em `AppContext` sem remover `UploadDialog` ainda (paralelo).
2. Criar `UploadWidget.tsx` consumindo o novo estado do contexto.
3. Trocar `FileExplorer` para usar `startUpload` do contexto em vez do fluxo local; renderizar
   `<UploadWidget />` em `IDELayout` junto de `<NotificationList />`.
4. Remover `UploadDialog.tsx` e seu teste, uma vez que `UploadWidget` cobre os mesmos cenários.
5. Rollback: como não há mudança de schema/IPC/dados persistidos, reverter é apenas reverter o commit
   (sem passos de migração de dados).

## Open Questions

- Nenhuma pendente — escopo, posicionamento e modelo de estado já decididos acima.
