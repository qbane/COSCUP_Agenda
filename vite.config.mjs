import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'
import basicSSL from '@vitejs/plugin-basic-ssl'

export default defineConfig(async ({ mode }) => {
  return {
    build: {
      rollupOptions: {
        input: {
          'index': 'index.html',
          'service_worker': 'src/service_worker.js',
        },
        output: {
          // do not generate hashes (for sw)
          entryFileNames: '[name].js',
          chunkFileNames: '_chunks/[name].js',
          assetFileNames({name}) {
            if (name == 'index.css') return 'style.css'
            // sw must be at root
            return '[name][extname]'
          },
        },
      },
      assetsInlineLimit: 0,
    },
    plugins: [
      basicSSL(),
      vue({
        template: {
          compilerOptions: {
            whitespace: 'preserve',
            // for accessing globalThis in module context
            inline: true,
          },
        },
      }),
    ],
    envPrefix: 'COSCUP_AGENDA_',
    clearScreen: false,
  }
})
