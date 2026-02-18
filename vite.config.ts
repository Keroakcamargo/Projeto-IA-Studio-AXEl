import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Injeta a API_KEY do Secret Manager no código compilado do navegador
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