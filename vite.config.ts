import { CSSOptions, defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import { fileURLToPath, URL } from "node:url";
import { loadAllPostsForSSG } from "./ssgGetPost";

interface BaseContent {
  time?: string;
  pin?: boolean;

  [key: string]: unknown;
}

interface ImageContent {
  src: string;
  spareUrl?: string;
  desc?: string;
}

interface PostBlock {
  type: string;
  content: string | ImageContent[];
}

interface Post extends BaseContent {
  id: string;
  time?: string;
  pin?: boolean;
  title?: string;
  layout?: string;
  blocks?: PostBlock[];
}

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
    async includedRoutes(paths) {
      const staticPaths = paths.filter((p) => !p.includes(":"));
      const posts = (await loadAllPostsForSSG("blog")) as Post[];
      const postRoutes = posts.filter((p) => p.id).map((p) => `/blog/${p.id}/`);
      return [...new Set([...staticPaths, "/blog/", ...postRoutes])];
    },
    onPageRendered(route, html) {
      return html.replace(/(<html[^>]*\slang=")([^"]*)(")/gi, "$1lang$3");
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        implementation: (await import("sass")).default,
        silenceDeprecations: ["legacy-js-api"],
      },
    },
  } as CSSOptions,

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
