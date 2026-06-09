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

async function connectAndGoToExplorer(page: AppHandle['page']) {
  await page.click('[title="Connections"]')
  await page.click('[title="New connection"]')
  await page.getByLabel('Label').fill('E2E Server')
  await page.getByLabel('Host').fill(SSH_HOST)
  await page.getByLabel('Username').fill(SSH_USER)
  await page.getByLabel('Password').fill(SSH_PASS)
  await page.click('button:has-text("Save")')
  await page.click('button:has-text("Connect")')
  await page.click('[title="Explorer"]')
  // Wait for explorer to load
  await page.locator('div[class*="cursor-pointer"]').first().waitFor({ timeout: 10_000 })
}

test.describe('Open File', () => {
  test('opens a file in a new editor tab', async () => {
    const { page } = handle
    await connectAndGoToExplorer(page)

    // Click on the first file node (not a directory)
    const files = page.locator('div[class*="cursor-pointer"]').filter({ hasNot: page.locator('span:has-text("▸")') })
    await files.first().click()

    // A tab should appear in the tab bar
    await expect(page.locator('[class*="bg-ide-tab"]').first()).toBeVisible({ timeout: 5_000 })
  })

  test('editor area shows file content after opening', async () => {
    const { page } = handle
    await connectAndGoToExplorer(page)

    const files = page.locator('div[class*="cursor-pointer"]').filter({ hasNot: page.locator('span:has-text("▸")') })
    await files.first().click()

    // Monaco editor or loading indicator should be visible
    await expect(page.locator('[class*="editor"], textarea[data-testid="monaco-editor"], .overflow-guard').first()).toBeVisible({ timeout: 8_000 })
  })

  test('opening two files shows two tabs', async () => {
    const { page } = handle
    await connectAndGoToExplorer(page)

    const files = page.locator('div[class*="cursor-pointer"]').filter({ hasNot: page.locator('span:has-text("▸")') })
    await files.nth(0).click()
    await page.waitForTimeout(500)
    await files.nth(1).click()

    const tabs = page.locator('[class*="bg-ide-tab"]')
    await expect(tabs).toHaveCount(2, { timeout: 5_000 })
  })
})
