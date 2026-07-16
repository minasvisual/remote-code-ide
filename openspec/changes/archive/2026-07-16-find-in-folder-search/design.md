## Context

O explorador (`FileExplorer.tsx` + `TreeNode.tsx`) já tem dois padrões de menu de contexto: o de diretórios/
arquivos (`TreeNode`, sempre um `ContextMenu` com itens condicionais como `canCopy`/`canPaste`) e o da área
vazia da raiz (`FileExplorer`, hoje só renderiza o `ContextMenu` `{contextMenu && clipboard && (...)}`, com um
único item "Paste" — precisa virar condicional por item, não por render do menu inteiro, para acomodar "Find in
Folder..." que deve aparecer sempre).

Não existe hoje nenhuma operação SFTP de busca de conteúdo — `ISftpService` só expõe operações pontuais
(`readFile`, `listDir`, etc.) ou recursivas fire-and-forget (`deleteRecursive`, `copy`). O precedente mais
próximo para "operação longa, recursiva, com progresso incremental e cancelamento" é o par
`downloadFile`/`downloadFolderAsZip` (`Ssh2SftpService.ts`) + `DownloadTransferRegistry` +
`sftp:downloadProgress`, formalizado na change arquivada `2026-07-16-download-progress-safe-close`. Este design
reaproveita exatamente esse padrão (id de transferência gerado no IPC, retornado imediatamente, resultado
reportado via eventos, cancelamento via `AbortController`/`AbortSignal`), adaptado para múltiplos resultados
incrementais (um por arquivo com match) em vez de um único progresso percentual.

Diferente de download, uma busca de conteúdo não grava nada em disco local — não há arquivo parcial para
limpar, então o hook de fechamento seguro de janela (`safe-window-close`) não se aplica aqui.

## Goals / Non-Goals

**Goals:**
- Permitir buscar um termo literal (substring, case-insensitive) no conteúdo de todos os arquivos de texto sob
  um diretório remoto, recursivamente, via SFTP.
- Iniciar a busca a partir de um item de menu em qualquer diretório da árvore e na área vazia/raiz do
  explorador.
- Mostrar resultados incrementalmente num modal (um arquivo aparece assim que tem pelo menos um match), sem
  esperar a árvore inteira terminar de ser varrida.
- Permitir cancelar uma busca em andamento.
- Abrir o arquivo no editor (fluxo já existente de `EditorContext.openFile`) ao clicar em um resultado.
- Não travar a varredura em arquivos binários ou muito grandes.

**Non-Goals:**
- Busca por regex ou por múltiplos termos/operadores — apenas substring literal, case-insensitive.
- Ir para a linha exata do match dentro do editor (o Monaco abre o arquivo do zero; navegar até a linha do
  match ficaria para uma iteração futura, já que `EditorContext.openFile`/`MonacoWrapper` não expõem hoje uma
  API de "abrir na linha X").
- Excluir diretórios por convenção (`node_modules`, `.git`, etc.) — a varredura é literal sobre a árvore
  inteira do diretório escolhido, como pedido; filtros de exclusão ficam para uma iteração futura se o uso real
  mostrar que é necessário.
- Indexação/cache de conteúdo entre buscas — cada busca é uma varredura nova, sem estado persistido.
- Progresso "byte a byte" como em `downloadFile` — o feedback de progresso aqui é por arquivo processado
  (contagem) e por match encontrado, não por bytes.

## Decisions

**1. Busca por substring literal, não regex.**
O termo digitado pelo usuário é comparado como texto literal (case-insensitive por padrão) contra o conteúdo
de cada arquivo, nunca interpretado como expressão regular. Alternativa considerada: aceitar regex (mais
poderoso, replica `grep -E`). Rejeitada por dois motivos — (a) superfície de ataque desnecessária (um padrão
regex vindo de input do usuário pode causar ReDoS ao rodar contra arquivos grandes, já que o motor de regex do
V8 roda no processo principal), e (b) o pedido original é "busca no conteúdo" simples, não uma ferramenta de
busca avançada; literal + case-insensitive cobre o caso de uso com risco zero de ReDoS.

**2. Varredura via SFTP puro (`readdir`/`createReadStream`), não `exec('grep -r ...')` sobre a sessão SSH.**
`Ssh2SftpService` já tem um `SFTPWrapper` persistente por sessão (`getSftp`) e um padrão de recursão estabelecido
(`collectFilesRecursive`, usado por `downloadFolderAsZip`). A busca reaproveita esse mesmo padrão: percorre
`listDir` recursivamente e lê cada arquivo candidato com `readFile` (já existente). Alternativa considerada:
abrir um canal `exec` e rodar `grep -rn` no servidor remoto — seria mais rápido em árvores grandes, mas exige
interpolar o termo de busca e o caminho num comando de shell remoto, abrindo risco de injeção de comando se a
escaping não for perfeita (ex.: diretório com caracteres especiais, termo de busca com aspas), depende de
`grep` existir no `PATH` remoto (não garantido — o app já suporta qualquer host SSH, não só Linux com GNU
tools), e adicionaria uma superfície nova (`ISshClient` não expõe `exec` hoje; só `getClient` cru é usado pelo
terminal). Ficar 100% em SFTP mantém a mesma garantia de segurança e portabilidade que o resto do app já tem,
ao custo de uma varredura mais lenta em árvores muito grandes — aceito como trade-off (ver Riscos).

**3. Resultados incrementais via evento `sftp:searchProgress`, ID de busca retornado de imediato — mesmo
padrão de `sftp:downloadFile`/`sftp:downloadProgress`.**
`sftp:searchInFolder` gera um `searchId` (uuid), registra a operação, e retorna `{ searchId }`
*imediatamente*, sem esperar a varredura terminar. A varredura roda em background; cada arquivo com pelo menos
um match dispara um evento `sftp:searchProgress` do tipo `match` carregando aquele arquivo e seus matches. Ao
final, um evento terminal (`done` | `error` | `cancelled`) é emitido. Isso segue exatamente a mesma decisão já
tomada (e documentada) para downloads: o `id` precisa estar disponível *durante* a operação para o botão
"Cancel" funcionar, e múltiplos resultados diferentes por natureza pedem eventos incrementais em vez de um
único valor de retorno.

**4. Cancelamento via `AbortController`/`AbortSignal`, registrado num novo `SearchTransferRegistry`.**
Mesmo mecanismo do `DownloadTransferRegistry`: um `Map<searchId, { abort }>` no processo principal,
instanciado em `src/main/index.ts` e injetado em `registerSftpIpc`. Diferente do registry de download, não há
`localPath`/arquivo parcial para limpar — o registry só existe para permitir `sftp:cancelSearch(searchId)` e
para permitir cancelar automaticamente uma busca anterior ao iniciar uma nova a partir do mesmo modal (o
renderer chama `cancelSearch` no `searchId` anterior antes de disparar um novo `searchInFolder`). Como não
grava nada em disco, **não** se integra ao hook de fechamento seguro de janela (`safe-window-close`); uma busca
ativa simplesmente é abandonada se a janela fechar, sem necessidade de limpeza.

**5. Arquivos binários e arquivos grandes são pulados silenciosamente, não reportados como erro.**
Antes de rodar o match, cada arquivo candidato passa por dois filtros: (a) tamanho — arquivos acima de um
limite (`MAX_SEARCH_FILE_SIZE`, 2 MB) são pulados sem serem lidos, evitando que um único arquivo grande deixe a
busca lenta ou consuma memória excessiva; (b) conteúdo binário — depois de ler, se os primeiros 8 KB do buffer
contiverem um byte `0x00`, o arquivo é tratado como binário e pulado (heurística padrão usada por ferramentas
como `git`/`grep`). Alternativa considerada: usar a lib `chardet` (já uma dependência do projeto, usada em
`sftp:readFile` para detecção de encoding) para decidir texto vs. binário — descartada porque `chardet` detecta
*encoding*, não *binário*; o teste de byte nulo é mais direto e mais barato para esse fim. Diretórios e
arquivos que falham a listar/ler (ex.: permissão negada numa subpasta) são pulados e a varredura continua no
resto da árvore — um erro pontual não deve abortar a busca inteira.

**6. Snippet de contexto por match: apenas a linha inteira (truncada), sem grifo via HTML.**
Cada match carrega `{ line: number; text: string }`, onde `text` é o conteúdo da linha onde o termo apareceu
(truncado a ~200 caracteres se a linha for muito longa). O destaque do termo encontrado na UI é feito
dividindo a string em pedaços (antes/match/depois) e renderizando cada pedaço como texto JSX normal — nunca via
`dangerouslySetInnerHTML` — para não introduzir um vetor de XSS a partir de conteúdo arbitrário de um arquivo
remoto.

**7. Limite de matches por arquivo reportados (10 primeiros), mas contagem total sempre exata.**
Para não sobrecarregar o payload de IPC/DOM em arquivos com centenas de ocorrências (ex.: um arquivo minificado
com o termo repetido), cada `SearchFileMatch` carrega no máximo as primeiras 10 linhas com match e um campo
`totalMatches` com a contagem real; a UI mostra "+N more" quando `totalMatches > matches.length`.

**8. Item "Find in Folder..." e modal vivem como estado local do componente que os abre (`TreeNode`/
`FileExplorer`), sem novo estado em `AppContext`.**
Segue o mesmo padrão já usado para `propertiesTarget`/`newFileOpen`/`deleteTarget` em `TreeNode.tsx`: um
`useState` local guarda o diretório-alvo da busca; quando não-nulo, renderiza `<FindInFolderModal>`. Não há
necessidade de estado compartilhado entre componentes — a busca é uma ação transiente por diretório, igual às
outras ações de menu de contexto já implementadas.

**9. Strings de UI em inglês; documentos de spec/proposta em português — mesma convenção já adotada.**
"Find in Folder...", "Search", "Cancel", "No matches found" seguem o padrão já usado em `notify()`/labels do
`ContextMenu` em todo o app.

## Risks / Trade-offs

- [Risk] Varredura via SFTP puro (uma leitura por arquivo) é mais lenta que `grep -r` nativo em árvores muito
  grandes (milhares de arquivos) → Mitigação: resultados incrementais (o usuário já vê matches conforme
  aparecem, não precisa esperar o fim) e cancelamento a qualquer momento; aceito como trade-off consciente de
  segurança/portabilidade (Decisão 2).
- [Risk] Nenhuma exclusão de diretórios pesados por convenção (`node_modules`, `.git`, `dist`) pode tornar
  buscas na raiz de projetos Node/Git desnecessariamente lentas → Mitigação: não-goal explícito nesta versão;
  cancelamento sempre disponível; revisar se o uso real mostrar necessidade.
- [Risk] Heurística de binário (byte nulo nos primeiros 8 KB) pode classificar incorretamente um arquivo de
  texto exótico como binário (falso positivo raro) → Mitigação: mesma heurística usada por ferramentas
  amplamente adotadas (git, grep); impacto limitado a pular um arquivo individual, não a busca inteira.
- [Risk] Múltiplas buscas cliques rápidos no mesmo modal podem gerar `searchId`s órfãos brevemente antes do
  cancelamento da anterior ser confirmado pelo servidor → Mitigação: renderer descarta eventos
  `sftp:searchProgress` cujo `searchId` não é o `searchId` atualmente ativo no estado do modal.

## Migration Plan

Não há dado persistido nem migração de esquema — apenas novos métodos de porta, um novo handler IPC e um novo
componente de UI. Deploy é um PR normal; rollback é reverter o PR, sem efeitos colaterais em conexões ou
arquivos existentes.

## Open Questions

- Nenhuma bloqueante. Se a demanda por exclusão de diretórios (`node_modules`, `.git`) ou por navegação até a
  linha exata do match no editor se mostrar forte no uso real, ambas ficam como candidatas naturais para uma
  iteração futura (ver Non-Goals).
