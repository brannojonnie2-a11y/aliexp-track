import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { noHostCheck } from './vite-plugin-no-host-check';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      preview: {
        host: '0.0.0.0',
        port: 4173,
        strictPort: false,
        allowedHosts: true,
      },
      server: {
        port: 5173,
        host: true,
        strictPort: false,
        allowedHosts: true,
        hmr: {
          clientPort: 5173,
        },
      },
      plugins: [react(), noHostCheck()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
