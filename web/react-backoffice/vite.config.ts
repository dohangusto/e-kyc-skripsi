import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  envDir: path.resolve(__dirname, '../../shared/env'),
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['.ngrok-free.dev'],
    fs: {
      allow: [
        path.resolve(__dirname, '..', '..', '..'),
        path.resolve(__dirname, '../../shared'),
        path.resolve(__dirname, 'src'),
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@domain": path.resolve(__dirname, "src/domain"),
      "@application": path.resolve(__dirname, "src/application"),
      "@infrastructure": path.resolve(__dirname, "src/infrastructure"),
      "@presentation": path.resolve(__dirname, "src/presentation"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@app": path.resolve(__dirname, "src/app"),
      "@dummies": path.resolve(__dirname, "../../shared/dummies"),
    },
  },
})
