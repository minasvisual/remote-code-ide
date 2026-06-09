import { test, expect } from '@playwright/test'
import { launchApp, closeApp } from './helpers/electronApp'
import type { AppHandle } from './helpers/electronApp'

/**
 * These tests require a real SSH server at 127.0.0.1:22.
 * Set environment variables to configure the target server:
 *   E2E_SSH_HOST, E2E_SSH_USER, E2E_SSH_PASS
 * If not set, tests are skipped.
 */
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

async function createAndConnect(page: ReturnType<AppHandle['page']['goto']> extends never ? never : AppHandle['page']) {
  await page.click('[title="Connections"]')
  await page.click('[title="New connection"]')
  await page.getByLabel('Label').fill('E2E Server')
  await page.getByLabel('Host').fill(SSH_HOST)
  await page.getByLabel('Username').fill(SSH_USER)
  await page.getByLabel('Password').fill(SSH_PASS)
  await page.click('button:has-text("Save")')
  await page.click('button:has-text("Connect")')
  // Wait for file explorer to appear
  await page.waitForSelector('[title="Explorer"]', { timeout: 10_000 })
  await page.click('[title="Explorer"]')
}

test.describe('List Files', () => {
  test('shows root files after connecting', async () => {
    const { page } = handle
    await createAndConnect(page)
    // File explorer should render at least one item
    await expect(page.locator('.flex-1.overflow-y-auto div[class*="cursor-pointer"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('expands a directory to show its children', async () => {
    const { page } = handle
    await createAndConnect(page)

    // Click on the first directory shown
    const firstDir = page.locator('div[class*="cursor-pointer"]').filter({ hasText: '▸' }).first()
    await firstDir.click()

    // After expansion, arrow changes to ▾
    await expect(page.locator('span:has-text("▾")').first()).toBeVisible({ timeout: 5_000 })
  })
})
