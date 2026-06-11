## ADDED Requirements

### Requirement: Iniciar explorador no diretório configurado
O sistema SHALL iniciar a listagem do explorador de arquivos a partir do `initialDirectory` da conexão quando esse campo estiver preenchido; caso contrário, SHALL usar `/` como raiz.

### Requirement: Navegar para explorador ao conectar
O sistema SHALL mudar automaticamente para a aba "Explorer" no sidebar ao estabelecer uma conexão SSH com sucesso.

#### Scenario: Conexão com initialDirectory preenchido
- **WHEN** o usuário conecta a uma conexão que possui `initialDirectory` configurado (ex.: `/home/user/projects`)
- **THEN** o explorador de arquivos lista o conteúdo de `/home/user/projects` ao abrir

#### Scenario: Conexão sem initialDirectory
- **WHEN** o usuário conecta a uma conexão sem `initialDirectory` definido
- **THEN** o explorador de arquivos lista o conteúdo de `/` (comportamento atual)

#### Scenario: Navegar para explorador após conexão bem-sucedida
- **WHEN** o usuário conecta com sucesso a qualquer conexão SSH
- **THEN** o sidebar muda automaticamente para a aba do explorador de arquivos

#### Scenario: initialDirectory inválido ou inexistente
- **WHEN** o usuário conecta e o `initialDirectory` configurado não existe no servidor
- **THEN** o explorador exibe notificação de erro informando a falha ao carregar o diretório
- **AND** a sessão SSH é desconectada automaticamente
