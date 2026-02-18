import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Garante que a chave de API seja injetada no código do cliente (browser)
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
  },
  server: {
    port: Number(process.env.PORT) || 8080,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    port: Number(process.env.PORT) || 8080,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});