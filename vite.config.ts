import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devOptimizeApiPlugin } from './server/devApiMiddleware';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), devOptimizeApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
