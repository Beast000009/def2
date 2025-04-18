import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5000,
    cors: true,
    hmr: {
      host: 'localhost',
      clientPort: 443,
      protocol: 'wss'
    },
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false
      }
    },
    allowedHosts: ['42cf6569-64ec-46e0-a30e-3de582939022-00-t9ovowgoav0n.pike.replit.dev', 'localhost', '.replit.dev', '1a9c3630-6538-4900-80de-1ece7a789e61-00-3rhiv7lxt22q5.pike.replit.dev']
  },
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    // Temporarily disable cartographer due to "traverse is not a function" errors
    // ...(process.env.NODE_ENV !== "production" &&
    // process.env.REPL_ID !== undefined
    //   ? [
    //       await import("@replit/vite-plugin-cartographer").then((m) =>
    //         m.cartographer(),
    //       ),
    //     ]
    //   : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
