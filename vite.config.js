import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'

export default defineConfig(async ({ mode }) => {
  return {
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
    clearScreen: false,
  }
})
