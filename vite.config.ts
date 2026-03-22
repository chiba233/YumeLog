// noinspection ES6PreferShortImport,JSUnusedGlobalSymbols

import type { PluginOption } from "vite";
import { CSSOptions, defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import { fileURLToPath, URL } from "node:url";
import { loadAllPosts } from "./src/shared/lib/yaml/getYaml.server";
import * as sass from "sass";
import fs from "node:fs";
import Components from "unplugin-vue-components/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import { Post } from "./src/shared/types/blog";
import { getPostSlug } from "./src/shared/lib/app/postSlug";

let cachedPosts: Post[] | null = null;

const getPosts = async (): Promise<Post[]> => {
  if (!cachedPosts) {
    cachedPosts = await loadAllPosts<Post>("blog");
  }
  return cachedPosts;
};

export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd());
  const siteOrigin = env.VITE_SSR_SITE_URL?.replace(/\/$/, "") || "https://example.com";

  const srcRoot = fileURLToPath(new URL("./src", import.meta.url));
  const resolveFromRoot = (relativePath: string): string =>
    fileURLToPath(new URL(relativePath, import.meta.url));

  return {
    plugins: [
      vue(),
      svgLoader(),
      (Components as unknown as (options: { resolvers: unknown[] }) => PluginOption)({
        resolvers: [(NaiveUiResolver as unknown as () => unknown)()],
      }),
    ],

    resolve: {
      alias: [
        {
          find: "@/shared/lib/yaml",
          replacement: resolveFromRoot(
            isSsrBuild === true
              ? "./src/shared/lib/yaml/getYaml.server.ts"
              : "./src/shared/lib/yaml/getYaml.client.ts",
          ),
        },
        {
          find: "@",
          replacement: srcRoot,
        },
      ],
    },

    ssgOptions: {
      script: "async",
      formatting: "minify",

      async includedRoutes(paths) {
        const staticPaths = paths.filter((p) => !p.includes(":"));
        const posts = await getPosts();
        const postRoutes = posts
          .map((p) => getPostSlug(p))
          .filter(Boolean)
          .map((slug) => `/blog/${slug}/`);

        return [...new Set([...staticPaths, "/blog/", ...postRoutes])];
      },

      onPageRendered(route, html) {
        return html.replace(/<html[^>]*\slang="[^"]*"/i, `<html lang="lang"`);
      },

      async onFinished() {
        console.log("SSG finished, generating sitemap and robots.txt...");

        const viteDir = "dist/.vite";
        if (fs.existsSync(viteDir)) {
          fs.rmSync(viteDir, { recursive: true, force: true });
          console.log("Removed dist/.vite");
        }

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
            .map((p) => {
              const slug = getPostSlug(p);
              if (!slug) return null;
              return {
                url: `/blog/${slug}/`,
                lastmod: formatDate(p.time),
              };
            })
            .filter((r): r is { url: string; lastmod: string } => r !== null),
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
      cssMinify: "esbuild",
      chunkSizeWarningLimit: 1300,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("naive-ui")) return "naive-ui";
            if (id.includes("dayjs")) return "date";
            if (id.includes("shiki")) return "shiki";
            return "vendor";
          },
        },
      },
    },
  };
});
