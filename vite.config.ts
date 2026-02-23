import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig(() => {
  return {
    plugins: [sveltekit()],
  };
});
