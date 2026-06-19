import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    ssr: 'src/main.ts',
    ssrManifest: false,
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'],
      fileName: () => 'main.cjs',
    },
    rollupOptions: {
      external: ['better-sqlite3', 'active-win', 'electron'],
    },
  },
});
