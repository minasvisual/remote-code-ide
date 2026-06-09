export type AuthType = 'password' | 'privateKey'

export interface Connection {
  id: string
  label: string
  host: string
  port: number
  username: string
  authType: AuthType
  encryptedPassword?: string
  encryptedPrivateKey?: string
  createdAt: string
  updatedAt: string
}

export type NewConnection = Omit<Connection, 'id' | 'createdAt' | 'updatedAt'> & {
  plainPassword?: string
  plainPrivateKey?: string
}
