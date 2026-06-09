## 1. Criar `ConnectionContextMenu` component

- [x] 1.1 Criar `src/renderer/ui/components/connections/ConnectionContextMenu.tsx` com props `{ x, y, connection, onEdit, onDelete, onClose }`
- [x] 1.2 Renderizar menu posicionado absolutamente em `(x, y)` com opções "Edit" e "Delete" usando tokens `ide-*`
- [x] 1.3 Registrar `useEffect` que adiciona listener `mousedown` no `document` para fechar o menu ao clicar fora
- [x] 1.4 Registrar `useEffect` que adiciona listener `keydown` no `document` para fechar ao pressionar Escape
- [x] 1.5 Implementar lógica de clamp de posição: ajustar `x`/`y` para que o menu não ultrapasse `window.innerWidth` e `window.innerHeight`

## 2. Criar `DeleteConnectionModal` component

- [x] 2.1 Criar `src/renderer/ui/components/connections/DeleteConnectionModal.tsx` com props `{ connection, onConfirm, onClose }`
- [x] 2.2 Usar o componente `Modal` existente com título "Delete Connection"
- [x] 2.3 Exibir nome da conexão e instrução para digitar `excluir` para confirmar
- [x] 2.4 Controlar estado do campo de texto; habilitar o botão "Delete" apenas quando valor === `"excluir"` (case-insensitive)
- [x] 2.5 Chamar `onConfirm()` ao clicar em "Delete"; chamar `onClose()` ao clicar em "Cancel"

## 3. Estender `ConnectionForm` para suportar modo de edição

- [x] 3.1 Adicionar prop opcional `connection?: Connection` à interface `Props` de `ConnectionForm.tsx`
- [x] 3.2 Inicializar o estado `form` com os dados da conexão quando `connection` for fornecido (label, host, port, username, authType)
- [x] 3.3 Alterar o título do modal para "Edit Connection" quando em modo de edição
- [x] 3.4 Adicionar placeholder "Leave blank to keep current" nos campos de senha e chave privada em modo de edição
- [x] 3.5 Quando em modo de edição, chamar `updateConnection({ ...connection, ...form })` em vez de `saveConnection(form)`; omitir campos de credencial se estiverem vazios

## 4. Atualizar `ConnectionManager`

- [x] 4.1 Remover o botão 🗑 inline (e o `div` `opacity-0 group-hover:opacity-100` que o contém junto com o botão Connect, se necessário reposicionar o botão Connect fora do grupo)
- [x] 4.2 Adicionar estado `contextMenu: { conn: Connection; x: number; y: number } | null` ao componente
- [x] 4.3 Adicionar estado `editingConn: Connection | null` e `deletingConn: Connection | null`
- [x] 4.4 Adicionar handler `onContextMenu` no `<li>` de cada conexão que chama `e.preventDefault()` e seta `contextMenu`
- [x] 4.5 Renderizar `<ConnectionContextMenu>` quando `contextMenu !== null`
- [x] 4.6 Renderizar `<ConnectionForm connection={editingConn}>` quando `editingConn !== null`
- [x] 4.7 Renderizar `<DeleteConnectionModal connection={deletingConn}>` quando `deletingConn !== null`
- [x] 4.8 Remover a importação e uso de `deleteConnection` direto do `useApp` (agora mediado pelo modal)

## 5. Testes

- [x] 5.1 Adicionar teste unitário para `DeleteConnectionModal`: verificar que o botão está desabilitado com texto vazio e habilitado ao digitar `excluir`
- [x] 5.2 Adicionar teste unitário para `ConnectionContextMenu`: verificar que `onEdit` e `onDelete` são chamados corretamente e que `onClose` é chamado ao pressionar Escape
- [x] 5.3 Atualizar/adicionar teste para `ConnectionForm` em modo de edição: verificar inicialização dos campos e que `updateConnection` é chamado no save
