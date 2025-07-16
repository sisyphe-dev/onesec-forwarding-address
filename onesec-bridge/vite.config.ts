// vite.config.ts
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'

export default defineConfig({
<<<<<<< Updated upstream
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    globals: true,
    watch: false,
=======
   plugins: [dts({
    entryRoot: 'src',
    outDir: 'dist',
    insertTypesEntry: true
  })],
  build: {
    target: 'esnext',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'), // Adjust if your entry file is elsewhere
      name: 'OnesecBridge',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs']
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
>>>>>>> Stashed changes
  },
})
