import { fileURLToPath, URL } from 'node:url'
import { createRequire } from 'node:module'
import process from 'node:process'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import VueDevTools from 'vite-plugin-vue-devtools'
import Markdown from 'vite-plugin-md'
import tailwindcss from '@tailwindcss/vite'
import inject from '@rollup/plugin-inject'
import stdLibBrowser from 'node-stdlib-browser'

const require = createRequire(import.meta.url)
const esbuildShim = require.resolve('node-stdlib-browser/helpers/esbuild/shim')

const ensureNodeProcess = () => {
  if (
    globalThis.process == null ||
    typeof globalThis.process.cwd !== 'function'
  ) {
    globalThis.process = process
  }
}

ensureNodeProcess()

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  plugins: [
    {
      name: 'ensure-node-process',
      configResolved() {
        ensureNodeProcess()
      },
      buildStart() {
        ensureNodeProcess()
      },
    },
    vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Markdown(),
    vueJsx(),
    VueDevTools(),
    tailwindcss(),
    {
      ...inject({
        global: [esbuildShim, 'global'],
        process: [esbuildShim, 'process'],
        Buffer: [esbuildShim, 'Buffer'],
      }),
      enforce: 'post',
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      ...stdLibBrowser,
    },
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
