## ADDED Requirements

### Requirement: Copiar arquivo ou diretório remoto
O sistema SHALL copiar arquivos e diretórios no servidor remoto de um caminho de origem para um caminho de
destino, inteiramente via SFTP (sem transitar pelo disco local), suportando cópia recursiva de diretórios e
um fluxo explícito de confirmação de sobrescrita.

#### Scenario: Copiar arquivo remoto
- **WHEN** o sistema chama `sftp:copy` com o caminho de um arquivo de origem e um caminho de destino livre
- **THEN** o sistema cria uma cópia do arquivo no destino, lendo e escrevendo via streams SFTP

#### Scenario: Copiar diretório remoto recursivamente
- **WHEN** o sistema chama `sftp:copy` com o caminho de um diretório de origem e um caminho de destino livre
- **THEN** o sistema cria o diretório de destino e copia recursivamente todo o seu conteúdo (arquivos e
  subdiretórios aninhados), preservando a estrutura completa da subárvore

#### Scenario: Destino já possui um item com o mesmo nome e sobrescrita não foi solicitada
- **WHEN** o sistema chama `sftp:copy` sem a flag de sobrescrita e já existe um arquivo ou diretório no
  caminho de destino
- **THEN** o sistema rejeita a operação com um erro `DEST_EXISTS`, sem criar ou alterar nenhum arquivo

#### Scenario: Destino já possui um item com o mesmo nome e sobrescrita foi solicitada
- **WHEN** o sistema chama `sftp:copy` com a flag de sobrescrita e já existe um arquivo ou diretório no
  caminho de destino
- **THEN** o sistema remove o item existente no destino (arquivo ou, recursivamente, diretório) e então
  realiza a cópia no lugar dele

#### Scenario: Destino é o próprio diretório de origem ou um descendente dele
- **WHEN** o caminho de destino calculado é igual ao caminho de origem, ou está contido dentro dele
- **THEN** o sistema rejeita a operação com um erro, sem criar ou alterar nenhum arquivo, mesmo que a flag
  de sobrescrita tenha sido solicitada
