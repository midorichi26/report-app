import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/report-app/', // GitHub Pages用のベースパス
  server: {
    host: true, // ネットワーク上の他デバイスからアクセス可能にする
  },
})
