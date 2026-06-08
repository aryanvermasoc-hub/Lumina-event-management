import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This is the magic line that exposes it to your Wi-Fi
    port: 5173  // Keeps it consistently on port 5173
  }
})