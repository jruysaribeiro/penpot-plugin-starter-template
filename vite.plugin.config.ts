import { defineConfig } from "vite";
import { resolve } from "path";

// Vite config for building the Penpot plugin files
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/plugin.ts"),
      name: "plugin",
      fileName: () => "plugin.js",
      formats: ["iife"],
    },
    outDir: "static",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      },
    },
    sourcemap: true,
  },
});
