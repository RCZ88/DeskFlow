import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(async () => {
  const plugins = [react(), tailwindcss()];
  return {
    plugins,
    base: './',
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          // Disable hashing for Electron app (no cache issues, simplifies paths)
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        }
      }
    },
  };
})
