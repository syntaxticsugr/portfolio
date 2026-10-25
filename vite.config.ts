import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    target: "es2022",
    // Keep the Three.js world separate from the interface and cinema bundles.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/three/examples/"))
            return "three-addons";
          if (id.includes("/node_modules/three/")) return "three";
        },
      },
    },
  },
});
