import { defineConfig } from "vite";
import { resolve } from "path";

// Vite config for building the plugin UI (main.ts → static/ui/main.js)
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      name: "main",
      fileName: () => "main.js",
      formats: ["iife"],
    },
    outDir: "static/ui",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
        assetFileNames: "style.[ext]",
      },
    },
    sourcemap: true,
  },
});
