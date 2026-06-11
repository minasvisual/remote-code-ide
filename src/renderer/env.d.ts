/// <reference types="vite/client" />

import type { IRemoteApi } from './domain/ports/IRemoteApi'

declare const __APP_VERSION__: string

declare global {
  interface Window {
    api: IRemoteApi
  }
}
