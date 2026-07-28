export interface InstalledExtension {
  id: string
  namespace: string
  name: string
  version: string
  displayName: string
  enabled: boolean
  hasBasicModeContribution: boolean
  installDir: string
  themeFile?: string
}
