import { test, expect } from '@playwright/test'
import { launchApp, closeApp } from './helpers/electronApp'
import type { AppHandle } from './helpers/electronApp'

let handle: AppHandle

test.beforeEach(async () => {
  handle = await launchApp()
})

test.afterEach(async () => {
  await closeApp(handle)
})

test.describe('Create Connection', () => {
  test('opens connection form when + button is clicked', async () => {
    const { page } = handle

    // Navigate to connections panel (activity bar)
    await page.click('[title="Connections"]')
    await page.click('[title="New connection"]')

    await expect(page.getByText('New Connection')).toBeVisible()
  })

  test('creates a connection with valid data and shows it in the list', async () => {
    const { page } = handle

    await page.click('[title="Connections"]')
    await page.click('[title="New connection"]')

    await page.getByLabel('Label').fill('Test Server')
    await page.getByLabel('Host').fill('127.0.0.1')
    await page.getByLabel('Port').fill('22')
    await page.getByLabel('Username').fill('testuser')
    await page.getByLabel('Password').fill('secret')

    await page.click('button:has-text("Save")')

    await expect(page.getByText('Test Server')).toBeVisible()
    await expect(page.getByText('testuser@127.0.0.1:22')).toBeVisible()
  })

  test('persists connection after closing and reopening the panel', async () => {
    const { page } = handle

    await page.click('[title="Connections"]')
    await page.click('[title="New connection"]')
    await page.getByLabel('Label').fill('Persistent Server')
    await page.getByLabel('Host').fill('10.0.0.1')
    await page.getByLabel('Username').fill('admin')
    await page.click('button:has-text("Save")')

    await expect(page.getByText('Persistent Server')).toBeVisible()

    // Navigate away and back
    await page.click('[title="Explorer"]')
    await page.click('[title="Connections"]')

    await expect(page.getByText('Persistent Server')).toBeVisible()
  })
})
