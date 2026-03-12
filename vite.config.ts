import { CSSOptions, defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import { fileURLToPath, URL } from "node:url";
import { loadAllPostsForSSG } from "./ssgGetPost";
import sass from "sass";
import fs from "node:fs";

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
  title?: string;
  layout?: string;
  blocks?: PostBlock[];
}

let cachedPosts: Post[] | null = null;

async function getPosts(): Promise<Post[]> {
  if (!cachedPosts) {
    cachedPosts = (await loadAllPostsForSSG("blog")) as Post[];
  }
  return cachedPosts;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const siteOrigin = env.VITE_SSR_SITE_URL?.replace(/\/$/, "") || "https://example.com";

  return {
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
        const posts = await getPosts();
        const postRoutes = posts.filter((p) => p.id).map((p) => `/blog/${p.id}/`);
        return [...new Set([...staticPaths, "/blog/", ...postRoutes])];
      },

      onPageRendered(route, html) {
        return html.replace(/<html[^>]*\slang="[^"]*"/i, `<html lang="lang"`);
      },

      async onFinished() {
        console.log("SSG finished, generating sitemap and robots.txt...");

        const formatDate = (t?: string) => {
          if (!t) return "";
          if (/^\d{8}$/.test(t)) {
            return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
          }
          const d = new Date(t);
          if (isNaN(d.getTime())) return "";
          return d.toISOString().slice(0, 10);
        };

        const posts = await getPosts();

        const routes = [
          { url: "/", lastmod: "" },
          { url: "/blog/", lastmod: "" },
          ...posts
            .filter((p) => p.id)
            .map((p) => ({
              url: `/blog/${p.id}/`,
              lastmod: formatDate(p.time),
            })),
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${siteOrigin}${r.url}</loc>${r.lastmod ? `\n    <lastmod>${r.lastmod}</lastmod>` : ""}
  </url>`,
  )
  .join("\n")}
</urlset>`;

        const robots = `User-agent: *
Allow: /

Sitemap: ${siteOrigin}/sitemap.xml
`;

        if (!fs.existsSync("dist")) {
          fs.mkdirSync("dist", { recursive: true });
        }

        fs.writeFileSync("dist/sitemap.xml", xml);
        fs.writeFileSync("dist/robots.txt", robots);

        console.log("Sitemap and robots.txt generated successfully!");
      },
    },

    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
          implementation: sass,
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
  };
});
