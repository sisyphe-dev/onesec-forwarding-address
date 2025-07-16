// vite.config.ts
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [dts()],
  build: {
    target: 'esnext',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'), // Adjust if your entry file is elsewhere
      name: 'OnesecBridge',
      fileName: (format) => `index.${format}.js`,
      formats: ['es']
    },
    rollupOptions: {
      // Exclude peer dependencies from the bundle
      external: ['@dfinity/agent', 'fflate'],
      output: {
        globals: {
          '@dfinity/agent': 'DFINITYAgent',
          'fflate': 'fflate'
        }
      }
    }
  },
  esbuild: {
    supported: {
      'top-level-await': true
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      supported: {
        'top-level-await': true,
      },
    },
  },
})
