## ADDED Requirements

### Requirement: Infraestrutura de testes unitários configurada
O projeto SHALL possuir Vitest configurado com ambiente JSDOM para executar testes dos componentes React do renderer sem depender do processo Electron ou de IPC real.

#### Scenario: Executar suíte de testes unitários
- **WHEN** o desenvolvedor executa `npm run test:unit`
- **THEN** o Vitest encontra e executa todos os arquivos `*.test.tsx` em `src/renderer/`
- **THEN** o resultado exibe o número de testes passando, falhando e o tempo de execução

#### Scenario: Ambiente JSDOM disponível
- **WHEN** um teste importa um componente React e chama `render()`
- **THEN** o componente é renderizado no ambiente JSDOM sem erros de módulo Node.js

### Requirement: window.api mockado nos testes unitários
Os testes unitários SHALL substituir `window.api` (contextBridge) por um mock tipado para isolar componentes do IPC real do Electron.

#### Scenario: Mock do window.api disponível
- **WHEN** um componente chama `getRemoteApi().connections.list()`
- **THEN** o mock retorna os dados configurados no teste sem invocar IPC real

#### Scenario: Mock do Monaco Editor
- **WHEN** `MonacoWrapper` é importado em um teste unitário
- **THEN** `@monaco-editor/react` está mockado e renderiza um elemento substituto sem erros

#### Scenario: Mock do xterm.js
- **WHEN** `TerminalPanel` é importado em um teste unitário
- **THEN** a dependência xterm está mockada e o componente renderiza sem erros de DOM

### Requirement: Testes unitários do ConnectionForm
O `ConnectionForm` SHALL ter cobertura de testes para renderização, preenchimento de campos e submissão do formulário.

#### Scenario: Renderização do formulário vazio
- **WHEN** `ConnectionForm` é renderizado sem `initialData`
- **THEN** os campos de nome, host, porta, usuário e senha estão presentes e vazios

#### Scenario: Submissão do formulário com dados válidos
- **WHEN** o usuário preenche todos os campos obrigatórios e clica em "Save"
- **THEN** a callback `onSave` é chamada com os dados do formulário corretamente estruturados

#### Scenario: Validação de campo obrigatório
- **WHEN** o usuário tenta submeter o formulário com o campo host vazio
- **THEN** a submissão não ocorre e uma mensagem de erro é exibida

### Requirement: Testes unitários do ConnectionManager
O `ConnectionManager` SHALL ter cobertura para listagem, criação, edição e exclusão de conexões.

#### Scenario: Listagem de conexões
- **WHEN** `ConnectionManager` é renderizado com conexões mockadas via `window.api`
- **THEN** cada conexão aparece listada com seu nome e host

#### Scenario: Abrir formulário de nova conexão
- **WHEN** o usuário clica no botão "New Connection"
- **THEN** o `ConnectionForm` é exibido em modo de criação

#### Scenario: Excluir uma conexão
- **WHEN** o usuário clica no botão de excluir de uma conexão e confirma
- **THEN** `getRemoteApi().connections.delete()` é chamado com o ID correto

### Requirement: Testes unitários do FileExplorer
O `FileExplorer` SHALL ter cobertura para renderização da árvore de arquivos e interações básicas.

#### Scenario: Renderização da árvore de arquivos
- **WHEN** `FileExplorer` é renderizado com uma lista de nós de arquivo mockada
- **THEN** os nomes dos arquivos e diretórios aparecem na tela

#### Scenario: Expansão de diretório
- **WHEN** o usuário clica em um diretório
- **THEN** `getRemoteApi().sftp.listDir()` é chamado com o caminho do diretório

#### Scenario: Clique em arquivo
- **WHEN** o usuário clica em um arquivo
- **THEN** o callback de abertura de arquivo é invocado com o caminho correto

### Requirement: Testes unitários de componentes commons
Os componentes `Button`, `Input`, `Modal` e `Notification` SHALL ter testes de renderização e interação básica.

#### Scenario: Button renderiza e responde a clique
- **WHEN** `Button` é renderizado com label e handler `onClick`
- **THEN** o texto do label é visível e o handler é chamado ao clicar

#### Scenario: Input controla valor
- **WHEN** `Input` é renderizado como controlled component
- **THEN** alterações no campo disparam `onChange` com o novo valor

#### Scenario: Modal renderiza conteúdo quando aberto
- **WHEN** `Modal` é renderizado com `isOpen: true`
- **THEN** o conteúdo filho é visível no DOM
