import type { Connection, NewConnection } from '../entities/Connection'

export interface IConnectionRepo {
  list(): Promise<Connection[]>
  get(id: string): Promise<Connection>
  save(conn: NewConnection): Promise<Connection>
  update(conn: Connection): Promise<Connection>
  delete(id: string): Promise<void>
}
