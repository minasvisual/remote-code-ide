import { test, expect } from '@playwright/test'
import { launchApp, closeApp } from './helpers/electronApp'
import type { AppHandle } from './helpers/electronApp'

const SSH_HOST = process.env.E2E_SSH_HOST ?? '127.0.0.1'
const SSH_USER = process.env.E2E_SSH_USER ?? ''
const SSH_PASS = process.env.E2E_SSH_PASS ?? ''

let handle: AppHandle

test.beforeEach(async () => {
  test.skip(!SSH_USER, 'SSH credentials not set — skipping E2E SSH tests')
  handle = await launchApp()
})

test.afterEach(async () => {
  if (handle) await closeApp(handle)
})

async function connectToServer(page: AppHandle['page']) {
  await page.click('[title="Connections"]')
  await page.click('[title="New connection"]')
  await page.getByLabel('Label').fill('E2E Server')
  await page.getByLabel('Host').fill(SSH_HOST)
  await page.getByLabel('Username').fill(SSH_USER)
  await page.getByLabel('Password').fill(SSH_PASS)
  await page.click('button:has-text("Save")')
  await page.click('button:has-text("Connect")')
  // Wait until file explorer is available
  await page.click('[title="Explorer"]')
  await page.locator('div[class*="cursor-pointer"]').first().waitFor({ timeout: 10_000 })
}

test.describe('Disconnect', () => {
  test('disconnects session and clears file explorer', async () => {
    const { page } = handle
    await connectToServer(page)

    // Navigate back to connections panel and disconnect
    await page.click('[title="Connections"]')
    await page.click('button:has-text("Disconnect"), [title="Disconnect"]')

    // Explorer should no longer show files
    await page.click('[title="Explorer"]')
    await expect(page.locator('div[class*="cursor-pointer"]')).toHaveCount(0, { timeout: 5_000 })
  })

  test('status bar no longer shows host after disconnect', async () => {
    const { page } = handle
    await connectToServer(page)

    // Verify host is shown in status bar while connected
    await expect(page.locator('[class*="bg-ide-statusbar"]')).toContainText(SSH_HOST)

    // Disconnect
    await page.click('[title="Connections"]')
    await page.click('button:has-text("Disconnect"), [title="Disconnect"]')

    // Status bar should no longer show the host
    await expect(page.locator('[class*="bg-ide-statusbar"]')).not.toContainText(SSH_HOST, { timeout: 3_000 })
  })

  test('can reconnect after disconnecting', async () => {
    const { page } = handle
    await connectToServer(page)

    // Disconnect
    await page.click('[title="Connections"]')
    await page.click('button:has-text("Disconnect"), [title="Disconnect"]')

    // Reconnect to the same server
    await page.click('button:has-text("Connect")')
    await page.click('[title="Explorer"]')
    await expect(page.locator('div[class*="cursor-pointer"]').first()).toBeVisible({ timeout: 10_000 })
  })
})
