import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const target = env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:3000';
  return {
    plugins: [react()],
    build: { rollupOptions: { output: { manualChunks: undefined } } },
    server: {
      proxy: {
        '/api': { target, changeOrigin: false },
        '/socket.io': { target, ws: true, changeOrigin: false },
      },
    },
  };
});
