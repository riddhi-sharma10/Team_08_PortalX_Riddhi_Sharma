// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        {
            name: 'antigravity-signal',
            configureServer() {
                console.log('\x1b[33m%s\x1b[0m', '--- VITE RESTARTED BY ANTIGRAVITY ---');
            }
        }
    ],
    server: {
        host: true, // Allow connection from IP addresses
        strictPort: false,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path // Ensure we DON'T strip the /api prefix
            }
        }
    }
});
