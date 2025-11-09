// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// Only load HTTPS certificates if they exist (for local development)
const httpsConfig = fs.existsSync('./localhost-key.pem') && fs.existsSync('./localhost.pem')
  ? {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    }
  : undefined;

export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment
  // This will be /painting-ref-tool/ when deployed to GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/painting-ref-tool/' : '/',
  server: {
    host: true,
    https: httpsConfig,
  },
  build: {
    outDir: 'dist',
    // Generate sourcemaps for debugging
    sourcemap: true,
  },
});