import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'

export default defineConfig(async ({ mode }) => {
  return {
    build: {
      rollupOptions: {
        input: {
          'index': 'index.html',
          'service_worker': 'src/service_worker.js',
        },
        output: {
          assetFileNames({name}) {
            if (name == 'index.css') return 'style.css'
            return '[name][extname]'
          },
        },
      },
      assetsInlineLimit: 0,
    },
    plugins: [
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
