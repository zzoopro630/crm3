import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8788',
          changeOrigin: true,
        },
      },
    },
    define: {
      __SUPABASE_URL__: JSON.stringify(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      __SUPABASE_ANON_KEY__: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    },
  }
})

