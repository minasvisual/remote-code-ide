## Context

MyCODEany é um desktop app Electron que replica a experiência de um IDE remoto (estilo Codeanywhere). O processo main tem acesso total ao Node.js e controla SSH/SFTP via `ssh2`; o renderer é React 18 rodando em Chromium isolado, comunicando-se com o main exclusivamente via `contextBridge` (`window.api`). A arquitetura adota Ports & Adapters para garantir que o domínio nunca dependa de adaptadores concretos.

## Goals / Non-Goals

**Goals:**
- Estabelecer a camada de domínio (entidades + interfaces de porta) sem dependências externas
- Implementar todos os adaptadores da v1: `Ssh2Client`, `Ssh2SftpService`, `ElectronStoreConnectionRepo`, `SafeStorageCrypto`, `TempFileManager`
- Expor funcionalidades ao renderer via IPC handlers finos (`connections`, `ssh`, `sftp`, `terminal`)
- Construir a UI completa em React: layout IDE, gerenciador de conexões, explorador SFTP, editor Monaco, terminal xterm.js, painel de extensões
- Garantir segurança: credenciais criptografadas via `safeStorage`, nunca expostas ao renderer após o save
- Corrigir incompatibilidade de chaves privadas SSH com CRLF no Windows

**Non-Goals:**
- Suporte a múltiplas sessões SSH simultâneas visíveis na UI
- Extensões VSCode reais carregadas via extension host
- Colaboração em tempo real / compartilhamento de sessão
- Suporte a protocolos além de SSH/SFTP (FTP, FTPS, WebDAV)

## Decisions

### D1: Ports & Adapters com injeção manual

**Decisão:** Todas as dependências são instanciadas em `src/main/index.ts` e injetadas via construtor nas funções `registerXxxIpc`. Nenhum singleton fora do entry point.

**Alternativas consideradas:**
- Container IoC (InversifyJS): overhead desnecessário para a escala atual
- Singletons globais: dificulta testes e viola separação de camadas

**Rationale:** Simplicidade máxima; a wiring explícita é legível e testável.

---

### D2: safeStorage para credenciais

**Decisão:** Usar `electron.safeStorage` (OS keychain) para criptografar senhas e chaves privadas antes de persistir no `electron-store`.

**Alternativas consideradas:**
- AES com chave hardcoded: inseguro, expõe a chave no bundle
- Armazenamento em texto plano: inaceitável para credenciais SSH

**Rationale:** `safeStorage` delega ao mecanismo do OS (DPAPI no Windows, Keychain no macOS, libsecret no Linux), sem gerenciamento de chave pelo app.

---

### D3: Normalização de CRLF em chaves privadas

**Decisão:** Em `Ssh2Client.buildConnectConfig()`, aplicar `.replace(/\r\n/g, '\n').replace(/\r/g, '\n')` na chave privada antes de passá-la ao `ssh2`.

**Alternativas consideradas:**
- Normalizar no momento do save (`repo.save`): a chave poderia vir de outras fontes futuras; melhor centralizar no ponto de uso
- Normalizar no textarea via `onChange`: acoplamento desnecessário da UI com detalhe do protocolo SSH

**Rationale:** O `ssh2` rejeita chaves com `\r\n` com erro "Unsupported key format". A normalização no adaptador isola o problema no único lugar que importa.

---

### D4: TempFileManager para edição de arquivos remotos

**Decisão:** Arquivos remotos são baixados para `os.tmpdir()/mycodeany/<sessionId>/` antes de abrir no editor. O `TempFileManager` rastreia o ciclo de vida e limpa os arquivos ao desconectar ou fechar o app.

**Alternativas consideradas:**
- Edição in-memory sem arquivo local: Monaco funciona assim, mas `localTempPath` é necessário para integrações futuras (linters, formatters)
- Persistir em `userData`: mistura arquivos temporários com dados do usuário

**Rationale:** Arquivos temporários têm vida útil da sessão; `os.tmpdir()` é o local semanticamente correto.

---

### D5: Monaco com modelos por URI `remote://`

**Decisão:** Cada arquivo aberto recebe um model URI do tipo `remote://<sessionId><remotePath>`, permitindo que o Monaco preserve o undo history quando o usuário troca de aba e volta.

**Alternativas consideradas:**
- URI baseado no `tab.id`: undo history se perde se a tab for fechada e reaberta no mesmo arquivo
- URI baseado só no `remotePath`: colide entre sessões diferentes

**Rationale:** O prefixo `remote://` + sessionId garante unicidade e preserva o histórico por arquivo por sessão.

---

### D6: `externalizeDepsPlugin` para módulos nativos

**Decisão:** Configurar `externalizeDepsPlugin()` no `electron.vite.config.ts` para o main e preload, evitando que o Vite bundle módulos nativos como `ssh2` e `electron-store`.

**Rationale:** Módulos com bindings nativos (`.node`) não podem ser bundled pelo Vite/Rollup; devem ser carregados diretamente do `node_modules` em runtime.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| `safeStorage` indisponível em ambientes headless/CI | `SafeStorageCrypto` lança erro explícito; nunca faz fallback para plaintext |
| Arquivo temporário vazar se o app crashar | `app.on('before-quit')` chama `tempFiles.cleanAll()`; arquivos em `os.tmpdir()` são limpos pelo OS no reboot |
| Chave privada com passphrase não suportada | Não há campo de passphrase na UI v1; conexões com chave protegida falharão com mensagem de erro clara |
| Múltiplos listeners `ssh:disconnected` acumulando no renderer | `onDisconnected` não remove listeners anteriores; pode causar leaks em hot-reload dev — aceitável para v1 |
| Monaco bundle grande (~5 MB) | Mitigado pelo `optimizeDeps.include` no Vite; carregado uma vez e cacheado |

## Migration Plan

Não aplicável — é a versão inicial do produto. Deploy via `npm run dist:win` gera instalador NSIS standalone.

## Open Questions

- Suporte a passphrase em chaves privadas: adicionar campo opcional na `ConnectionForm` em v1.1?
- `electron-store` v8 usa ESM; verificar compatibilidade com `externalizeDepsPlugin` em builds de produção
- Estratégia de atualização do app (auto-updater) não definida para v1
