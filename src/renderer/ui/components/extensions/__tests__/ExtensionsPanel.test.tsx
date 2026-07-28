import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ExtensionsPanel } from '../ExtensionsPanel'
import { createMockApi, createMockInstalledExtension } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'

let mockApi: ReturnType<typeof createMockApi>

const searchResult = {
  namespace: 'someone',
  name: 'cool-theme',
  displayName: 'Cool Theme',
  version: '1.0.0',
  description: 'A cool theme',
}

function mockSearchResponse(extensions: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ extensions }),
    })
  )
}

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ExtensionsPanel', () => {
  it('installs an extension from search results via getRemoteApi().extensions.install', async () => {
    mockSearchResponse([searchResult])
    mockApi.extensions.install.mockResolvedValue(
      createMockInstalledExtension({
        id: 'someone.cool-theme',
        namespace: 'someone',
        name: 'cool-theme',
        displayName: 'Cool Theme',
      })
    )

    renderWithProviders(<ExtensionsPanel />)
    await userEvent.type(screen.getByPlaceholderText('Search extensions…'), 'cool')
    await userEvent.click(screen.getByText('🔍'))
    await waitFor(() => expect(screen.getByText('Cool Theme')).toBeInTheDocument())

    await userEvent.click(screen.getByText('⬇'))

    await waitFor(() =>
      expect(mockApi.extensions.install).toHaveBeenCalledWith('someone', 'cool-theme', '1.0.0')
    )
  })

  it('renders installed extensions in an Installed section', async () => {
    mockApi.extensions.list.mockResolvedValue([
      createMockInstalledExtension({ id: 'a.b', displayName: 'Theme A' }),
    ])
    renderWithProviders(<ExtensionsPanel />)
    await waitFor(() => expect(screen.getByText('Installed')).toBeInTheDocument())
    expect(screen.getByText('Theme A')).toBeInTheDocument()
  })

  it('shows a "not activatable in basic mode" badge for extensions without a theme contribution', async () => {
    mockApi.extensions.list.mockResolvedValue([
      createMockInstalledExtension({
        id: 'a.b',
        displayName: 'Plain Ext',
        hasBasicModeContribution: false,
        themeFile: undefined,
      }),
    ])
    renderWithProviders(<ExtensionsPanel />)
    await waitFor(() => expect(screen.getByText('not activatable in basic mode')).toBeInTheDocument())
  })

  it('toggles enable/disable for an installed extension', async () => {
    mockApi.extensions.list.mockResolvedValue([
      createMockInstalledExtension({ id: 'a.b', displayName: 'Theme A', enabled: false }),
    ])
    mockApi.extensions.setEnabled.mockResolvedValue(
      createMockInstalledExtension({ id: 'a.b', displayName: 'Theme A', enabled: true })
    )
    renderWithProviders(<ExtensionsPanel />)
    await waitFor(() => expect(screen.getByText('Theme A')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Enable' }))

    await waitFor(() => expect(mockApi.extensions.setEnabled).toHaveBeenCalledWith('a.b', true))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument())
  })

  it('uninstalls an installed extension and removes it from the list', async () => {
    mockApi.extensions.list.mockResolvedValue([
      createMockInstalledExtension({ id: 'a.b', displayName: 'Theme A' }),
    ])
    renderWithProviders(<ExtensionsPanel />)
    await waitFor(() => expect(screen.getByText('Theme A')).toBeInTheDocument())

    await userEvent.click(screen.getByTitle('Uninstall'))

    await waitFor(() => expect(mockApi.extensions.uninstall).toHaveBeenCalledWith('a.b'))
    await waitFor(() => expect(screen.queryByText('Theme A')).not.toBeInTheDocument())
  })

  it('shows an "already installed" indicator instead of the install button in search results', async () => {
    mockApi.extensions.list.mockResolvedValue([
      createMockInstalledExtension({ id: 'someone.cool-theme', displayName: 'Existing install' }),
    ])
    mockSearchResponse([searchResult])

    renderWithProviders(<ExtensionsPanel />)
    await waitFor(() => expect(screen.getByText('Existing install')).toBeInTheDocument())

    await userEvent.type(screen.getByPlaceholderText('Search extensions…'), 'cool')
    await userEvent.click(screen.getByText('🔍'))

    await waitFor(() => expect(screen.getByText('Already installed')).toBeInTheDocument())
    expect(screen.queryByText('⬇')).not.toBeInTheDocument()
  })
})
