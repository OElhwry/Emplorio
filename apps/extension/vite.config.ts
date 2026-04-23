import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.js';

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  if (isBuild) process.env.NODE_ENV = 'production';
  return {
    envDir: '../..',
    plugins: [
      react({ jsxRuntime: 'automatic', jsxImportSource: 'react' }),
      crx({ manifest }),
    ],
    define: isBuild
      ? {
          'process.env.NODE_ENV': JSON.stringify('production'),
          __DEV__: 'false',
        }
      : {},
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      minify: 'esbuild',
    },
    esbuild: isBuild
      ? { legalComments: 'none', drop: ['debugger'] }
      : undefined,
    server: {
      port: 5173,
      strictPort: true,
      cors: {
        origin: [/chrome-extension:\/\//],
      },
      hmr: {
        port: 5173,
      },
    },
  };
});
