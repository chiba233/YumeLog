import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue(), svgLoader()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  ssgOptions: {
    script: "async",
    formatting: "minify",
    onPageRendered(route, html) {
      return html.replace(/(<html[^>]*\slang=")([^"]*)(")/gi, "$1lang$3");
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

  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
