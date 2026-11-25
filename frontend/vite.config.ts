import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El mapa 2D importa los planos de `assets/planos/` (fuera de `frontend/`).
  server: { fs: { allow: ['..'] } },
});
