import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  base: './',
  publicDir: path.resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  plugins: [
    vue(),
    tailwindcss(),
    electron({
      main: {
        entry: 'src/main/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            sourcemap: false,
            minify: true,
            esbuildOptions: {
              pure: ['console.log', 'console.warn', 'console.info', 'console.debug'],
              drop: ['debugger']
            },
            rollupOptions: {
              external: ['electron', 'better-sqlite3', 'bufferutil', 'utf-8-validate'],
              output: {
                format: 'cjs',
                entryFileNames: 'index.js',
                inlineDynamicImports: true
              }
            }
          }
        }
      },
      preload: {
        entry: 'src/main/preload/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            sourcemap: false,
            minify: true,
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: 'index.js',
                inlineDynamicImports: true
              }
            }
          }
        }
      }
    })
  ],
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  build: {
    target: ['chrome148', 'node24'],
    cssTarget: 'chrome148',
    minify: 'esbuild',
    emptyOutDir: true,
    outDir: 'dist',
    esbuildOptions: {
      pure: ['console.log', 'console.warn', 'console.info', 'console.debug'],
      drop: ['debugger']
    }
  }
})