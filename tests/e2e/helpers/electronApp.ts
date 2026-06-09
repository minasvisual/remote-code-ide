import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'path'

const APP_ENTRY = path.resolve(__dirname, '../../../out/main/index.js')

export interface AppHandle {
  app: ElectronApplication
  page: Page
}

export async function launchApp(): Promise<AppHandle> {
  const app = await electron.launch({
    args: [APP_ENTRY],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  return { app, page }
}

export async function closeApp(handle: AppHandle): Promise<void> {
  await handle.app.close()
}
