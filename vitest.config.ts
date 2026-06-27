import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const monacoStub = resolve(__dirname, 'src/renderer/__tests__/helpers/__mocks__/monaco-editor.ts')

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/renderer/__tests__/setup.ts'],
    include: ['src/renderer/**/*.test.{ts,tsx}'],
    globals: true,
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer'),
      'monaco-editor/esm/vs/editor/editor.worker?worker': monacoStub,
      'monaco-editor/esm/vs/language/json/json.worker?worker': monacoStub,
      'monaco-editor/esm/vs/language/css/css.worker?worker': monacoStub,
      'monaco-editor/esm/vs/language/html/html.worker?worker': monacoStub,
      'monaco-editor/esm/vs/language/typescript/ts.worker?worker': monacoStub,
      'monaco-editor': monacoStub,
    },
  },
})
