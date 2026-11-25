import { defineConfig } from 'vite';
export default defineConfig({
  server: { port: 5183, strictPort: true, proxy: { '/api': 'http://localhost:8803' } },
  build: { target: 'es2022' }
});
