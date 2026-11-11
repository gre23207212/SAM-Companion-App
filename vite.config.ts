import { defineConfig } from "vite";
import path from "path";

export default defineConfig(({ mode }) => ({
  base: './',
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  worker: { format: 'es' },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
