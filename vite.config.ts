// vite.config.ts
import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
  // Set base path for GitHub Pages deployment
  // This will be /painting-ref-tool/ when deployed to GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/painting-ref-tool/' : '/',
  server: {
    host: true,
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    },
  },
  build: {
    outDir: 'dist',
    // Generate sourcemaps for debugging
    sourcemap: true,
  },
});