import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    build: {
      rollupOptions: {
        input: {
          app: resolve(__dirname, 'src/renderer/index.html'),
          overlay: resolve(__dirname, 'src/renderer/overlay.html')
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src/app'),
        '@overlay': resolve('src/renderer/src/overlay')
      }
    },
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: 'src/app/routes',
        generatedRouteTree: 'src/app/routeTree.gen.ts'
      }),
      react(),
      svgr(),
      tailwindcss()
    ]
  }
})
