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
        manualChunks: {
          vue: ["vue"],
          naive: ["naive-ui"],
          moment: ["moment"],
          yaml: ["js-yaml"],
          icons: ["@vicons/fluent", "@vicons/ionicons5", "@vicons/material"],
        },
      },
    },
  },
});
