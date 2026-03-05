import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue(), svgLoader()],
  resolve: {
    alias: {
      // 这种写法在 TS 5 + Vite 7 中最稳定
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        implementation: "sass",
        silenceDeprecations: ["legacy-js-api"],
      } as any,
    },
  },
});
