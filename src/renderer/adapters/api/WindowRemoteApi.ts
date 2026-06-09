import type { IRemoteApi } from '../../domain/ports/IRemoteApi'

export function getRemoteApi(): IRemoteApi {
  return window.api
}
