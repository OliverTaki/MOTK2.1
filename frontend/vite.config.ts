import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 10000,
        proxyTimeout: 10000,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    // Performance optimizations
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'query-vendor': ['@tanstack/react-query'],
          
          // Feature chunks
          'file-management': [
            './src/components/file-management/FileManagementDemo',
            './src/components/file-management/FileUpload',
            './src/components/file-management/ThumbnailGrid',
            './src/components/file-management/FileList',
            './src/components/file-management/VersionsDisplay'
          ],
          'entities': [
            './src/components/entities/EntityTable',
            './src/components/entities/ShotTable',
            './src/components/entities/AssetTable',
            './src/components/entities/TaskTable'
          ],
          'auth': [
            './src/components/auth/LoginPage',
            './src/components/auth/AuthCallback'
          ]
        }
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging
    sourcemap: process.env.NODE_ENV !== 'production'
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@mui/icons-material',
      '@tanstack/react-query',
      'axios'
    ]
  }
});