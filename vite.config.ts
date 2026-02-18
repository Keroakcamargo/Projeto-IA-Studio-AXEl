import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Substitui process.env.API_KEY pela chave real durante o build
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