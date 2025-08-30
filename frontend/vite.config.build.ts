import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs-extra';

// Plugin personalizado para copiar assets públicos
const copyPublicAssets = () => {
  return {
    name: 'copy-public-assets',
    closeBundle: async () => {
      const publicDir = path.resolve(__dirname, 'public');
      const distDir = path.resolve(__dirname, 'dist');
      
      // Copiar todos los archivos y carpetas de public a dist
      const items = await fs.readdir(publicDir);
      
      for (const item of items) {
        const srcPath = path.join(publicDir, item);
        const destPath = path.join(distDir, item);
        
        // Copiar recursivamente
        await fs.copy(srcPath, destPath, { overwrite: true });
        console.log(`✅ Copiado: ${item}`);
      }
      
      console.log('🎉 Todos los assets públicos copiados a dist/');
    }
  };
};

export default defineConfig({
  plugins: [
    react(),
    copyPublicAssets()
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});