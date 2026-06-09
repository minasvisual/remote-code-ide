import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer')
        // 'vscode' resolves from node_modules/vscode → @codingame/monaco-vscode-api
      }
    },
    plugins: [react()],
    worker: {
      format: 'es'
    },
    optimizeDeps: {
      include: [
        '@monaco-editor/react',
        'monaco-editor'
      ]
    }
  }
})
