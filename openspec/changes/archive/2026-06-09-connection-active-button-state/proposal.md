## Why

O botão "Connect" exibe o mesmo estado para todas as conexões, independentemente de haver uma sessão ativa. Isso confunde o usuário: não há indicação visual de qual conexão está ativa, e é possível tentar conectar uma segunda conexão enquanto outra já está em uso. O app suporta apenas uma sessão ativa por vez.

## What Changes

- O botão "Connect" da conexão ativa muda para "Disconnect"
- Os botões "Connect" das demais conexões ficam desabilitados enquanto há uma sessão ativa
- Ao desconectar, todos os botões voltam ao estado normal

## Capabilities

### New Capabilities

_(nenhuma)_

### Modified Capabilities

- `connection-management`: o requirement "Conectar a uma conexão" ganha regras de estado de botão baseadas na sessão ativa

## Impact

- `src/renderer/ui/components/connections/ConnectionManager.tsx` — lógica de estado dos botões
- `src/renderer/application/contexts/AppContext.tsx` — `activeSession` já existe; nenhuma mudança de API necessária
- Testes unitários de `ConnectionManager` precisam cobrir os novos estados
