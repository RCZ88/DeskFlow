import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(async () => {
  const plugins = [react(), tailwindcss()];
  return {
    plugins,
    optimizeDeps: { exclude: ['better-sqlite3'] },
    base: './',
    build: {
      minify: false,
      sourcemap: true,
      rollupOptions: {
        external: ['better-sqlite3'],
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
        onwarn(warning, warn) {
          if (warning.code === 'CIRCULAR_DEPENDENCY') {
            console.error('\n=== CIRCULAR DEPENDENCY ===');
            console.error('importer:', warning.importer);
            console.error('ids:', warning.ids);
            console.error('==========================\n');
          }
          warn(warning);
        }
      }
    },
  };
})
