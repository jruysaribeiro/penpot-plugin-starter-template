import { defineConfig, loadEnv } from "vite";
import livePreview from "vite-live-preview";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      livePreview({
        reload: true,
        config: {
          build: {
            sourcemap: true,
          },
        },
      }),
    ],
    define: {
      "import.meta.env.VITE_GEMINI_API_KEY": JSON.stringify(
        env.GEMINI_API_KEY || "",
      ),
    },
    build: {
      rollupOptions: {
        input: {
          plugin: "src/plugin.ts",
          index: "./index.html",
        },
        output: {
          entryFileNames: "[name].js",
        },
      },
    },
    preview: {
      port: 4400,
      cors: true,
    },
  };
});
