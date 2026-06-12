import Store = require('electron-store')
import { v4 as uuidv4 } from 'uuid'
import type { IConnectionRepo } from '../../domain/ports/IConnectionRepo'
import type { Connection, NewConnection } from '../../domain/entities/Connection'
import type { ICryptoService } from '../../domain/ports/ICryptoService'

interface StoreSchema {
  connections: Connection[]
}

export class ElectronStoreConnectionRepo implements IConnectionRepo {
  private store: Store<StoreSchema>
  private crypto: ICryptoService

  constructor(crypto: ICryptoService) {
    this.crypto = crypto
    this.store = new Store<StoreSchema>({
      name: 'connections',
      defaults: { connections: [] }
    })
  }

  async list(): Promise<Connection[]> {
    return this.store.get('connections', [])
  }

  async get(id: string): Promise<Connection> {
    const connections = this.store.get('connections', [])
    const found = connections.find((c: Connection) => c.id === id)
    if (!found) throw new Error(`Connection ${id} not found`)
    return found
  }

  async save(conn: NewConnection): Promise<Connection> {
    const now = new Date().toISOString()
    const connection: Connection = {
      id: uuidv4(),
      label: conn.label,
      host: conn.host,
      port: conn.port,
      username: conn.username,
      authType: conn.authType,
      initialDirectory: conn.initialDirectory || undefined,
      encryptedPassword: conn.plainPassword
        ? this.crypto.encrypt(conn.plainPassword)
        : undefined,
      encryptedPrivateKey: conn.plainPrivateKey
        ? this.crypto.encrypt(conn.plainPrivateKey)
        : undefined,
      createdAt: now,
      updatedAt: now
    }
    const connections = this.store.get('connections', [])
    this.store.set('connections', [...connections, connection])
    return connection
  }

  async update(conn: Connection): Promise<Connection> {
    const updated = { ...conn, updatedAt: new Date().toISOString() }
    const connections = this.store.get('connections', [])
    this.store.set(
      'connections',
      connections.map((c: Connection) => (c.id === conn.id ? updated : c))
    )
    return updated
  }

  async delete(id: string): Promise<void> {
    const connections = this.store.get('connections', [])
    this.store.set('connections', connections.filter((c: Connection) => c.id !== id))
  }
}
