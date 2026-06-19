import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      outDir: 'dist-electron',
      lib: {
        entry: 'src/main.ts',
        fileName: () => 'main.cjs',
      },
      rollupOptions: {
        external: ['better-sqlite3'],
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist-electron',
      lib: {
        entry: 'src/preload.ts',
        fileName: () => 'preload.cjs',
      },
    },
  },
  renderer: {
    plugins: [react()],
    root: '.',
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: 'index.html',
      },
    },
  },
});
