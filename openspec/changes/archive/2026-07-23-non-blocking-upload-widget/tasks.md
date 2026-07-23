## 1. Mover estado de upload para `AppContext`

- [x] 1.1 Em `src/renderer/application/contexts/AppContext.tsx`, adicionar um slice de estado de
      upload isolado (não misturado ao array `notifications`): lista de lotes de upload, cada lote
      com `{ id, targetDir, entries: UploadEntry[] }`, e um flag de expandido/recolhido não é
      necessário aqui (fica local ao widget — ver tarefa 2.3).
- [x] 1.2 Adicionar `startUpload(sessionId, targetDir, mode)` ao valor do contexto: abre a
      janela nativa de seleção (`api.sftp.openUploadDialog`), cria um novo lote com `entries: []`,
      assina `api.sftp.onUploadProgress` atualizando apenas as entradas desse lote, e chama
      `api.sftp.uploadFiles`. Reaproveitar a lógica hoje em `FileExplorer.handleUpload`.
- [x] 1.3 Ao detectar que todas as `entries` de um lote transitaram para `done`/`error`, o contexto
      SHALL emitir um sinal de "lote concluído" (ex. callback registrado por `targetDir`, ou um
      contador/timestamp exposto no lote) para que `FileExplorer` possa disparar o refresh do
      diretório correspondente — cobre o Requirement "Atualização do explorador de arquivos ao
      concluir" do spec.
- [x] 1.4 Adicionar `dismissUpload(batchId)` ao contexto: remove o lote do estado, mas SHALL ser
      no-op (ou lançar/ignorar) se o lote ainda tiver entradas `pending`/`uploading` — cobre
      "Fechar o widget somente após conclusão".
- [x] 1.5 Garantir que múltiplos `startUpload` concorrentes (upload B iniciado antes de A terminar)
      resultem em lotes distintos e independentes, sem que a assinatura de progresso de um lote
      sobrescreva a do outro — cobre "Múltiplos lotes de upload concorrentes".

## 2. Criar `UploadWidget`

- [x] 2.1 Criar `src/renderer/ui/components/commons/UploadWidget.tsx`, consumindo os lotes de upload
      via `useApp()`. Retorna `null` quando não há nenhum lote ativo/pendente de dispensa (mesma
      guarda que `NotificationList` usa para `notifications.length === 0`).
- [x] 2.2 Estilizar como widget flutuante `fixed bottom-20 right-4 z-50` (acima do
      `NotificationList`, que usa `bottom-8`), usando tokens `ide-*` (`bg-ide-sidebar`,
      `border-ide-border`, `text-ide-text`, etc.) — nunca hex hardcoded.
- [x] 2.3 Adicionar `useState` local para expandido/recolhido, inicializado recolhido. Renderizar um
      botão de toggle visível em ambos os estados.
- [x] 2.4 Estado recolhido: mostrar resumo agregando todos os lotes ativos (ex. "Enviando 3 de 7
      arquivos…" ou contagem de lotes/erros), sem listar arquivos individuais.
- [x] 2.5 Estado expandido: reaproveitar a lista/ícones de status por entrada do `UploadDialog`
      atual (pending `·`, uploading `Spinner`, done `✓` verde, error `✗` vermelho com mensagem),
      agrupada por lote/diretório-alvo.
- [x] 2.6 Botão de fechar (geral, dispensando todos os lotes concluídos de uma vez) chama
      `dismissUpload` para cada lote; SHALL ficar `disabled` enquanto qualquer lote tiver entradas
      `pending`/`uploading` (mesma regra do `Close` atual do `UploadDialog.test.tsx`, adaptada ao
      novo componente).
- [x] 2.7 Confirmar que o toggle de expandir/recolher nunca é desabilitado, mesmo com upload em
      andamento (diferente do botão de fechar).

## 3. Integrar no layout e no `FileExplorer`

- [x] 3.1 Em `src/renderer/App.tsx`, importar e renderizar `<UploadWidget />` dentro de `IDELayout`,
      ao lado de `<NotificationList />` (fora da árvore do sidebar, para sobreviver à troca de
      painel).
- [x] 3.2 Em `src/renderer/ui/components/explorer/FileExplorer.tsx`, remover `uploadEntries`,
      `showUploadDialog`, `uploadUnsubscribeRef`, `uploadTargetDirRef`, `handleUploadDialogClose` e a
      renderização de `<UploadDialog />`; substituir `handleUpload` por uma chamada a
      `startUpload(...)` do `useApp()`.
- [x] 3.3 Ligar o sinal de "lote concluído" (tarefa 1.3) a `load()` (quando `targetDir === '/'`) ou
      `setRefreshTarget({ path: targetDir, tick: Date.now() })` (subdiretório), preservando o
      comportamento atual de refresh da árvore.
- [x] 3.4 Verificar manualmente que iniciar um upload, trocar para o painel "Extensions" ou "About"
      e voltar para "Explorer" mantém o widget e o progresso visíveis e corretos. *(Verificado
      manualmente pelo usuário com uma sessão real.)*

## 4. Remover o modal antigo

- [x] 4.1 Remover `src/renderer/ui/components/commons/UploadDialog.tsx`.
- [x] 4.2 Remover `src/renderer/ui/components/commons/__tests__/UploadDialog.test.tsx`.
- [x] 4.3 Buscar por outras referências a `UploadDialog`/`UploadEntry` no código (ex.
      `src/renderer/__tests__/helpers/mockApi.ts`, testes de `FileExplorer`) e atualizar para o novo
      componente/contexto.

## 5. Testes

- [x] 5.1 Criar `src/renderer/ui/components/commons/__tests__/UploadWidget.test.tsx` cobrindo os
      cenários do spec: recolhido por padrão, expandir/recolher, fechar desabilitado durante
      upload, fechar habilitado quando tudo `done`/`error`, múltiplos lotes exibidos
      simultaneamente.
- [x] 5.2 Atualizar/adicionar testes de `AppContext` (ou dos componentes que o consomem) para
      `startUpload`, `dismissUpload` e o sinal de conclusão de lote.
- [x] 5.3 Atualizar testes existentes de `FileExplorer` (`FileExplorer.test.tsx`) que hoje dependem
      de `UploadDialog`/`showUploadDialog` para o novo fluxo baseado em contexto.
- [x] 5.4 Rodar `npm run test:unit` e `npm run typecheck` e corrigir quaisquer falhas. `test:unit`:
      27/27 arquivos, 231/231 testes passando. `typecheck`: nenhum erro nos arquivos de produção
      tocados por esta mudança (`AppContext.tsx`, `FileExplorer.tsx`, `App.tsx`,
      `UploadWidget.tsx`); os únicos erros do `tsc --noEmit` são pré-existentes no baseline do
      projeto (mocks de `vi.fn()` perdendo os métodos de mock ao serem atribuídos a tipos de
      interface simples), presentes em arquivos de teste não relacionados a esta mudança
      (`ConnectionManager.test.tsx`, `FilePropertiesModal.test.tsx`, `useKeyboardShortcuts.test.ts`,
      etc.) e não introduzidos por ela.

## 6. Verificação manual

- [x] 6.1 Rodar `npm run dev`, conectar a uma sessão (ver `E2E_SSH_*` em `tests/e2e/helpers` para um
      ambiente de teste), fazer upload de uma pasta com vários arquivos e confirmar visualmente que
      a aplicação permanece utilizável durante o upload. *(Verificado manualmente pelo usuário com
      uma sessão real; upload de múltiplos arquivos confirmado sem bloquear a aplicação.)*
- [x] 6.2 Confirmar que o widget aparece automaticamente, alterna entre recolhido/expandido pelo
      toggle, e que o botão de fechar só habilita após a conclusão de todas as entradas. *(Verificado
      manualmente pelo usuário, além da cobertura em `UploadWidget.test.tsx`.)*
