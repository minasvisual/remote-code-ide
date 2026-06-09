## 1. Atualizar `ConnectionManager`

- [x] 1.1 Destruturar `activeSession` e `disconnect` do `useApp()` em `ConnectionManager.tsx`
- [x] 1.2 Derivar `isActive = activeSession?.connectionId === conn.id` por item da lista
- [x] 1.3 Derivar `isBlocked = activeSession !== null && !isActive` por item da lista
- [x] 1.4 Quando `isActive`: renderizar botão com label "Disconnect" chamando `disconnect()`
- [x] 1.5 Quando `isBlocked`: renderizar botão "Connect" com `disabled={true}`
- [x] 1.6 Garantir que o spinner de loading continua aparecendo durante `connectingId === conn.id`

## 2. Testes

- [x] 2.1 Adicionar teste: sem sessão ativa, todos os botões "Connect" estão habilitados
- [x] 2.2 Adicionar teste: com `activeSession` setado para `conn.id`, aquele item exibe "Disconnect"
- [x] 2.3 Adicionar teste: com `activeSession` setado, os demais itens têm botão "Connect" desabilitado
- [x] 2.4 Adicionar teste: clicar em "Disconnect" chama `disconnect()` do contexto
