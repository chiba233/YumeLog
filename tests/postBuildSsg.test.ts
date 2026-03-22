import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { loadAllPosts } from "../src/shared/lib/yaml/getYaml.server.ts";
import type { Post } from "../src/shared/types/blog.ts";
import { getPostSlug } from "../src/shared/lib/app/postSlug.ts";
import { runGoldenCases } from "./testHarness";

const distRoot = path.resolve(process.cwd(), "dist");

const readDistHtml = async (relativePath: string): Promise<string> => {
  const fullPath = path.join(distRoot, relativePath);
  return await fs.readFile(fullPath, "utf8");
};

const assertNoDefaultPlaceholder = (html: string, pageLabel: string): void => {
  assert.ok(!html.includes(">...<"), `${pageLabel} should not render placeholder "..."`);
  assert.ok(!html.includes("Your Brand"), `${pageLabel} should not contain fallback brand text`);
  assert.ok(!html.includes("<h1 aria-hidden=\"false\" class=\"sr-only\"></h1>"), `${pageLabel} should not contain an empty sr-only h1`);
};

const collectPotentialUrlValues = (html: string): string[] => {
  const values = new Set<string>();
  const attributePattern =
    /<(?:img|meta|link)\b[^>]*\b(?:src|href|content)=["']([^"'<>]+)["']/gi;
  const jsonImagePattern = /"image":"([^"]+)"/gi;

  for (const match of html.matchAll(attributePattern)) {
    const value = match[1]?.trim();
    if (value) values.add(value);
  }

  for (const match of html.matchAll(jsonImagePattern)) {
    const value = match[1]?.trim();
    if (value) values.add(value);
  }

  return [...values];
};

const assertNoLocalImageLeak = (html: string, pageLabel: string): void => {
  const joined = collectPotentialUrlValues(html).join("\n");

  assert.doesNotMatch(joined, /file:\/\//i, `${pageLabel} should not leak file protocol paths`);
  assert.doesNotMatch(joined, /[A-Za-z]:\\/, `${pageLabel} should not leak Windows local paths`);
  assert.doesNotMatch(
    joined,
    /\/(?:Users|home|private|var|tmp|etc|mnt|media|Volumes)\//,
    `${pageLabel} should not leak local unix paths`,
  );
};

const extractSiteOrigin = (robotsTxt: string, sitemapXml: string): string => {
  const robotsMatch = robotsTxt.match(/Sitemap:\s*(https?:\/\/[^\s]+)\/sitemap\.xml/i);
  const sitemapMatch = sitemapXml.match(/<loc>(https?:\/\/[^<]+?)<\/loc>/i);
  const robotsOrigin = robotsMatch?.[1] ? new URL(robotsMatch[1]).origin : "";
  const sitemapOrigin = sitemapMatch?.[1] ? new URL(sitemapMatch[1]).origin : "";

  assert.ok(robotsOrigin, "robots.txt should expose a sitemap origin");
  assert.ok(sitemapOrigin, "sitemap.xml should expose a site origin");
  assert.equal(robotsOrigin, sitemapOrigin, "robots.txt and sitemap.xml should share the same origin");

  return robotsOrigin;
};

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "主页和博客列表页的 SSG HTML 不应包含默认空值占位",
    run: async () => {
      const [homeHtml, blogHtml] = await Promise.all([
        readDistHtml("index.html"),
        readDistHtml(path.join("blog", "index.html")),
      ]);

      assertNoDefaultPlaceholder(homeHtml, "home");
      assertNoDefaultPlaceholder(blogHtml, "blog list");
      assert.match(homeHtml, /<title>.+<\/title>/);
      assert.match(blogHtml, /<title>.+<\/title>/);
      assert.match(blogHtml, /class="post-card glass"/);
      assertNoLocalImageLeak(homeHtml, "home");
      assertNoLocalImageLeak(blogHtml, "blog list");
    },
  },
  {
    name: "每篇文章都应生成对应的 SSG index.html 且页面内容真实存在",
    run: async () => {
      const posts = await loadAllPosts<Post>("blog");
      assert.ok(posts.length > 0, "blog posts should not be empty");

      await Promise.all(
        posts.map(async (post) => {
          const slug = getPostSlug(post);
          assert.ok(slug, `post slug should exist for "${post.title ?? "unknown"}"`);

          const articleHtml = await readDistHtml(path.join("blog", slug!, "index.html"));
          assertNoDefaultPlaceholder(articleHtml, `blog/${slug}`);
          assert.match(articleHtml, new RegExp(`<title>${escapeRegExp(post.title ?? "")}`));
          assert.ok(
            articleHtml.includes(`id="${slug}"`) || articleHtml.includes(`data-id="${slug}"`),
            `blog/${slug} should contain article identity`,
          );
          assert.ok(
            articleHtml.includes(post.title ?? ""),
            `blog/${slug} should contain article title`,
          );
          assertNoLocalImageLeak(articleHtml, `blog/${slug}`);
        }),
      );
    },
  },
  {
    name: "sitemap 和 robots 应该覆盖博客静态路由并与当前站点 origin 保持一致",
    run: async () => {
      const [sitemapXml, robotsTxt, posts] = await Promise.all([
        readDistHtml("sitemap.xml"),
        readDistHtml("robots.txt"),
        loadAllPosts<Post>("blog"),
      ]);
      const siteOrigin = extractSiteOrigin(robotsTxt, sitemapXml);

      assert.match(robotsTxt, /User-agent:\s*\*/);
      assert.match(
        robotsTxt,
        new RegExp(`Sitemap:\\s*${escapeRegExp(siteOrigin)}/sitemap\\.xml`),
      );
      assert.match(sitemapXml, new RegExp(`<loc>${escapeRegExp(siteOrigin)}/</loc>`));
      assert.match(sitemapXml, new RegExp(`<loc>${escapeRegExp(siteOrigin)}/blog/</loc>`));

      for (const post of posts) {
        const slug = getPostSlug(post);
        assert.ok(slug, `post slug should exist for "${post.title ?? "unknown"}"`);
        assert.match(
          sitemapXml,
          new RegExp(`<loc>${escapeRegExp(siteOrigin)}/blog/${escapeRegExp(slug!)}/</loc>`),
        );
      }
    },
  },
];

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

await runGoldenCases("Post-build SSG", " post-build SSG golden case", cases);
