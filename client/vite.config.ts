import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const clerkKey =
    env.CLERK_PUBLISHABLE_KEY ||
    env.VITE_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.VITE_CLERK_PUBLISHABLE_KEY ||
    '';

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'CLERK_'],
    define: {
      'import.meta.env.CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkKey),
      'process.env.CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkKey)
    },
    server: {
      port: 5173,
      host: true
    },
    build: {
      // Increase warning limit slightly for Phaser which is a large bundle
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor libs into separate cacheable chunks
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-phaser': ['phaser'],
            'vendor-ui': ['lucide-react', 'axios']
          }
        }
      }
    }
  };
});
