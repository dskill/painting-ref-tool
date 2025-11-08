// vite.config.ts
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import fs from 'fs';
// https://vitejs.dev/guide/build.html#library-mode
export default defineConfig({
  server: {
    host: true,
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'opencv-document-scanner',
      fileName: 'opencv-document-scanner',
    },
  },
  plugins: [
    dts()
  ],
});