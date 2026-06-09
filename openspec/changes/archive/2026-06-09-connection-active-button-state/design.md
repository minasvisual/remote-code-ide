## Context

`ConnectionManager` exibe um botão "Connect" para cada conexão. O `AppContext` já expõe `activeSession` (com `connectionId`) e `disconnect()`. Atualmente o componente não usa `activeSession` para diferenciar o estado visual dos botões — todos ficam iguais.

## Goals / Non-Goals

**Goals:**
- Botão da conexão ativa mostra "Disconnect" e chama `disconnect()`
- Botões das demais conexões ficam `disabled` enquanto `activeSession !== null`
- Ao desconectar, todos os botões voltam ao estado habilitado

**Non-Goals:**
- Suporte a múltiplas sessões simultâneas
- Indicadores visuais além do estado do botão (ícone de status, cor de fundo, etc.)

## Decisions

**Derivar estado do botão a partir de `activeSession`**

Em `ConnectionManager`, destruturar `activeSession` e `disconnect` do `useApp()`. Para cada item da lista:

```
isActive  = activeSession?.connectionId === conn.id
isBlocked = activeSession !== null && !isActive
```

- `isActive` → botão mostra "Disconnect", chama `disconnect()`
- `isBlocked` → botão mostra "Connect", `disabled={true}`
- senão → comportamento atual

Alternativa descartada: criar campo `status` na entidade `Connection` — desnecessário, o estado da sessão já vive no contexto.

## Risks / Trade-offs

- `activeSession` é `null` durante o processo de conexão (`isConnecting = true`); o spinner de loading já cobre esse intervalo — nenhuma inconsistência visual esperada.
- Se o processo main encerrar a sessão inesperadamente (ex: timeout SSH), `activeSession` é zerado pelo evento `terminal:output` que já existe no `AppContext` — botões voltam ao normal automaticamente.
