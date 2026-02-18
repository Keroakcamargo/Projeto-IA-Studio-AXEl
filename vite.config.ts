import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Garante que o processo de build do Vite mapeie corretamente a variável de ambiente
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || 'AIzaSyA6CuQsIu3qyn453uKKROxDY6tlWZmFP6o'),
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