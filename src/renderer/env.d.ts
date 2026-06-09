/// <reference types="vite/client" />

import type { IRemoteApi } from './domain/ports/IRemoteApi'

declare global {
  interface Window {
    api: IRemoteApi
  }
}
