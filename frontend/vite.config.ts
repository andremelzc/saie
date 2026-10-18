import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Los planos SVG viven en /assets/planos (fuera de frontend): se importan como '@planos/piso-1.svg?url'.
const planos = fileURLToPath(new URL('../assets/planos', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@planos': planos } },
  server: { fs: { allow: ['..'] } },
});
