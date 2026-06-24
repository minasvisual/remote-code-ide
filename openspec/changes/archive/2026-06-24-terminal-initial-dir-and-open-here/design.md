## Context

O terminal integrado hoje abre sempre no home (`~/`) do usuário SSH. A entidade `Connection` já possui o campo `initialDirectory?: string` (usado pelo `FileExplorer` para listar arquivos), e o `ActiveSession` já carrega esse valor. O `TerminalPanel` é um componente singleton — cria um único terminal por sessão e o destrói no cleanup.

O canal IPC `terminal:create` atualmente aceita `(sessionId, cols, rows)` e retorna um `termId`. Não há suporte a diretório inicial.

## Goals / Non-Goals

**Goals:**
- Terminal abre no `initialDirectory` da conexão quando configurado
- Diretório inicial pode ser sobrescrito por ação do usuário ("Open Terminal Here")
- O `cd` acontece no backend, de forma transparente ao usuário (terminal abre limpo)
- Context menu de diretórios no explorer inclui "Open Terminal Here"
- Estrutura preparada para evolução futura (tabs de terminal)

**Non-Goals:**
- Tabs de terminal (múltiplos terminais simultâneos) — fora do escopo desta change
- Validar se o diretório existe no servidor antes de tentar `cd`
- Split de terminal (horizontal/vertical)

## Decisions

### 1. `cd` no backend vs frontend

**Decisão**: Fazer o `cd` no backend (`terminal.ipc.ts`), logo após o shell abrir.

**Alternativa descartada**: Enviar `cd <dir>\n` via `terminal:sendInput` no renderer após o terminal abrir. Descartada porque o usuário veria o comando `cd` e o prompt reaparecer, poluindo a experiência.

**Implementação**: Após `client.shell()` resolver, o handler escreve `cd <dir> && clear\n` no stream antes de registrar os listeners de `data`. Isso garante que o output do `cd` não chega ao renderer. Se o diretório não existir, o shell simplesmente mostra erro e fica no home — comportamento natural do shell.

### 2. Comunicação Explorer → Terminal para "Open Terminal Here"

**Decisão**: Adicionar estado `terminalTargetDir` e método `openTerminalAt(path)` no `AppContext`.

**Alternativa descartada**: Usar um EventEmitter ou pub/sub custom. Descartada por adicionar complexidade desnecessária quando React context já resolve.

**Fluxo**:
1. `TreeNode` chama `onOpenTerminal(node.path)` → `FileExplorer` repassa → `AppContext.openTerminalAt(path)`
2. `AppContext` seta `terminalTargetDir` (com um tick/counter para detectar mudanças mesmo se o path for o mesmo)
3. `TerminalPanel` observa `terminalTargetDir` via `useApp()`. Quando muda, fecha o terminal atual e abre um novo com o diretório especificado
4. O painel de terminal é automaticamente ativado (panel visible)

### 3. Reabertura vs múltiplos terminais

**Decisão**: "Open Terminal Here" fecha o terminal existente e abre um novo no diretório escolhido (singleton).

**Justificativa**: Manter o modelo singleton atual. A estrutura (callback `onOpenTerminal`, estado `terminalTargetDir`, parâmetro `initialDir` no IPC) já prepara o caminho para tabs de terminal no futuro — basta mudar o `TerminalPanel` para manter um array de terminais ao invés de um único.

### 4. Sequência de comandos no shell

**Decisão**: Usar `cd <path> && clear\n` ao invés de `cd` seguido de ANSI clear (`\x1bc`).

**Justificativa**: `clear` é mais portável entre shells (bash, zsh, sh) e respeita o tamanho do terminal. O `&&` garante que o `clear` só executa se o `cd` for bem-sucedido — se o diretório não existir, o usuário vê a mensagem de erro do shell, o que é informativo.

## Risks / Trade-offs

- **Race condition no output**: O `cd && clear` é escrito antes de registrar os listeners, mas em teoria o shell pode responder antes dos listeners estarem prontos. → Mitigação: registrar os listeners primeiro, mas segurar o envio ao renderer com um flag `ready` que é ativado após um breve delay ou após detectar o primeiro prompt. Alternativa mais simples: aceitar que o `clear` limpa qualquer output residual.

- **Shells exóticos**: Se o servidor usar um shell que não suporta `cd` ou `clear` da mesma forma (ex: fish, csh), o comportamento pode variar. → Mitigação: `cd` e `clear` são universais em POSIX shells. Edge case aceitável.

- **Terminal singleton**: "Open Terminal Here" destrói a sessão de terminal existente. → Trade-off aceito. Documentar na UI ou avisar o usuário seria over-engineering para esta fase.
