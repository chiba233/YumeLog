// noinspection ES6PreferShortImport,RegExpSimplifiable

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { loadAllPosts } from "../src/shared/lib/yaml/getYaml.server.ts";
import type { Post } from "../src/shared/types/blog.ts";
import { getPostSlug } from "../src/shared/lib/app/postSlug.ts";
import { sanitizeAssetUrl } from "../src/shared/lib/app/siteOrigin.ts";
import { runGoldenCases } from "./testHarness";

const distRoot = path.resolve(process.cwd(), "dist");

const readDistHtml = async (relativePath: string): Promise<string> => {
  const fullPath = path.join(distRoot, relativePath);
  return await fs.readFile(fullPath, "utf8");
};

const assertNoDefaultPlaceholder = (html: string, pageLabel: string): void => {
  assert.ok(!html.includes(">...<"), `${pageLabel} should not render placeholder "..."`);
  assert.ok(!html.includes("Your Brand"), `${pageLabel} should not contain fallback brand text`);
  assert.ok(
    !html.includes('<h1 aria-hidden="false" class="sr-only"></h1>'),
    `${pageLabel} should not contain an empty sr-only h1`,
  );
};

const getHeadHtml = (html: string, pageLabel: string): string => {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  assert.ok(head, `${pageLabel} should contain a head element`);
  return head;
};

const getTagAttribute = (tagHtml: string, attr: string): string =>
  tagHtml.match(new RegExp(`\\b${attr}=(["'])([\\s\\S]*?)\\1`, "i"))?.[2] ?? "";

const findMetaContent = (
  headHtml: string,
  attr: "name" | "property",
  key: string,
): string | undefined => {
  const tag = [...headHtml.matchAll(/<meta\b[^>]*>/gi)].find(
    (match) => getTagAttribute(match[0], attr) === key,
  )?.[0];

  return tag ? getTagAttribute(tag, "content") : undefined;
};

const findLinkHref = (headHtml: string, rel: string): string | undefined => {
  const tag = [...headHtml.matchAll(/<link\b[^>]*>/gi)].find(
    (match) => getTagAttribute(match[0], "rel") === rel,
  )?.[0];

  return tag ? getTagAttribute(tag, "href") : undefined;
};

const getJsonLdPayloads = (headHtml: string): unknown[] =>
  [
    ...headHtml.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((match) => match[1]?.trim())
    .filter(Boolean)
    .map((payload, index) => {
      try {
        const parsed: unknown = JSON.parse(payload);
        return parsed;
      } catch (error) {
        assert.fail(
          `JSON-LD script #${index + 1} should be valid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    });

const getExpectedSeoImage = (post: Post): string => {
  const imageBlock = post.blocks?.find((block) => block.type === "image");
  return sanitizeAssetUrl(imageBlock?.content?.[0]?.src);
};

const getSiteOrigin = async (): Promise<string> => {
  const [robotsTxt, sitemapXml] = await Promise.all([
    readDistHtml("robots.txt"),
    readDistHtml("sitemap.xml"),
  ]);

  return extractSiteOrigin(robotsTxt, sitemapXml);
};

const assertMetaEquals = (
  headHtml: string,
  attr: "name" | "property",
  key: string,
  expected: string,
  pageLabel: string,
): void => {
  assert.equal(
    findMetaContent(headHtml, attr, key),
    expected,
    `${pageLabel} should expose ${attr}=${key}`,
  );
};

const collectPotentialUrlValues = (html: string): string[] => {
  const values = new Set<string>();
  const attributePattern = /<(?:img|meta|link)\b[^>]*\b(?:src|href|content)=["']([^"'<>]+)["']/gi;
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
  assert.equal(
    robotsOrigin,
    sitemapOrigin,
    "robots.txt and sitemap.xml should share the same origin",
  );

  return robotsOrigin;
};

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "主页和博客列表页的 SSG HTML 应输出稳定的 SEO Head，而不是只渲染正文",
    run: async () => {
      const siteOrigin = await getSiteOrigin();
      const [homeHtml, blogHtml] = await Promise.all([
        readDistHtml("index.html"),
        readDistHtml(path.join("blog", "index.html")),
      ]);
      const homeHead = getHeadHtml(homeHtml, "home");
      const blogHead = getHeadHtml(blogHtml, "blog list");

      assertNoDefaultPlaceholder(homeHtml, "home");
      assertNoDefaultPlaceholder(blogHtml, "blog list");
      assert.match(homeHtml, /<title>.+<\/title>/);
      assert.match(blogHtml, /<title>.+<\/title>/);
      assert.match(blogHtml, /class="post-card glass"/);
      assertNoLocalImageLeak(homeHtml, "home");
      assertNoLocalImageLeak(blogHtml, "blog list");

      assert.equal(findLinkHref(homeHead, "canonical"), siteOrigin);
      assertMetaEquals(homeHead, "property", "og:url", siteOrigin, "home");
      assertMetaEquals(homeHead, "property", "og:type", "website", "home");
      assertMetaEquals(homeHead, "property", "og:image", `${siteOrigin}/icon/icon.webp`, "home");
      assert.ok(findMetaContent(homeHead, "name", "description"), "home should expose description");
      assert.ok(
        findMetaContent(homeHead, "property", "og:description"),
        "home should expose og:description",
      );
      assert.ok(
        findMetaContent(homeHead, "property", "twitter:description"),
        "home should expose twitter:description",
      );
      assert.match(homeHead, /<link\b[^>]*rel=["']me["']/);
      const homeJsonLd = getJsonLdPayloads(homeHead);
      assert.ok(homeJsonLd.length > 0, "home should expose at least one JSON-LD script");
      const friendsSchema = homeJsonLd.find(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          (payload as { "@type"?: string })["@type"] === "ItemList",
      ) as
        | {
            "@id"?: string;
            "@type"?: string;
            name?: string;
            numberOfItems?: number;
            itemListElement?: Array<{
              position?: number;
              item?: {
                "@type"?: string;
                name?: string;
                image?: string;
                url?: string;
              };
            }>;
          }
        | undefined;
      assert.ok(friendsSchema, "home should expose friends ItemList JSON-LD");
      assert.equal(friendsSchema["@id"], `${siteOrigin}#friends-list`);
      assert.ok(typeof friendsSchema.name === "string" && friendsSchema.name.length > 0);
      assert.ok(typeof friendsSchema.numberOfItems === "number");
      assert.ok(
        Array.isArray(friendsSchema.itemListElement),
        "friends JSON-LD should expose items",
      );
      assert.equal(
        friendsSchema.itemListElement?.length,
        friendsSchema.numberOfItems,
        "friends JSON-LD count should match item count",
      );
      friendsSchema.itemListElement?.forEach((entry, index) => {
        assert.equal(entry?.position, index + 1);
        assert.equal(entry?.item?.["@type"], "Person");
        assert.ok(typeof entry?.item?.name === "string" && entry.item.name.length > 0);
        assert.ok(typeof entry?.item?.url === "string" && entry.item.url.length > 0);
        assert.match(entry?.item?.url ?? "", /^https?:\/\//);

        if (entry?.item?.image) {
          assert.match(entry.item.image, /^https?:\/\//);
        }
      });
      assert.ok(findMetaContent(homeHead, "property", "og:title"), "home should expose og:title");

      assert.equal(findLinkHref(blogHead, "canonical"), `${siteOrigin}/blog`);
      assertMetaEquals(blogHead, "property", "og:url", `${siteOrigin}/blog`, "blog list");
      assertMetaEquals(blogHead, "name", "twitter:url", `${siteOrigin}/blog`, "blog list");
      assertMetaEquals(blogHead, "property", "og:type", "website", "blog list");
      assertMetaEquals(blogHead, "name", "twitter:card", "summary", "blog list");
      assertMetaEquals(
        blogHead,
        "property",
        "og:image",
        `${siteOrigin}/icon/icon.webp`,
        "blog list",
      );
      const blogJsonLd = getJsonLdPayloads(blogHead);
      assert.equal(blogJsonLd.length, 1, "blog list should expose one JSON-LD script");
      const blogSchema = blogJsonLd[0] as { "@type"?: string; blogPost?: unknown[] };
      assert.equal(blogSchema["@type"], "Blog");
      assert.ok(Array.isArray(blogSchema.blogPost), "blog list JSON-LD should contain blogPost");
    },
  },
  {
    name: "每篇文章都应生成对应的 SSG index.html，并包含文章级 canonical、社交卡片和 JSON-LD",
    run: async () => {
      const siteOrigin = await getSiteOrigin();
      const posts = await loadAllPosts<Post>("blog");
      assert.ok(posts.length > 0, "blog posts should not be empty");

      await Promise.all(
        posts.map(async (post) => {
          const slug = getPostSlug(post);
          if (!slug) {
            assert.fail(`post slug should exist for "${post.title ?? "unknown"}"`);
          }

          const articleHtml = await readDistHtml(path.join("blog", slug, "index.html"));
          const articleHead = getHeadHtml(articleHtml, `blog/${slug}`);
          const canonicalUrl = `${siteOrigin}/blog/${slug}`;

          assertNoDefaultPlaceholder(articleHtml, `blog/${slug}`);
          assert.match(articleHtml, /<title>.+<\/title>/);
          assert.ok(
            articleHtml.includes(`id="${slug}"`) || articleHtml.includes(`data-id="${slug}"`),
            `blog/${slug} should contain article identity`,
          );
          assertNoLocalImageLeak(articleHtml, `blog/${slug}`);
          assert.equal(findLinkHref(articleHead, "canonical"), canonicalUrl);
          assertMetaEquals(articleHead, "property", "og:url", canonicalUrl, `blog/${slug}`);
          assertMetaEquals(articleHead, "name", "twitter:url", canonicalUrl, `blog/${slug}`);
          assertMetaEquals(articleHead, "property", "og:type", "article", `blog/${slug}`);
          assertMetaEquals(
            articleHead,
            "name",
            "twitter:card",
            "summary_large_image",
            `blog/${slug}`,
          );

          const ogTitle = findMetaContent(articleHead, "property", "og:title");
          const twitterTitle = findMetaContent(articleHead, "name", "twitter:title");
          assert.ok(ogTitle, `blog/${slug} should expose og:title`);
          assert.equal(ogTitle, twitterTitle, `blog/${slug} should align social titles`);

          const ogDescription = findMetaContent(articleHead, "property", "og:description");
          const twitterDescription = findMetaContent(articleHead, "name", "twitter:description");
          const description = findMetaContent(articleHead, "name", "description");
          assert.ok(description, `blog/${slug} should expose description`);
          assert.ok(ogDescription, `blog/${slug} should expose og:description`);
          assert.equal(
            ogDescription,
            twitterDescription,
            `blog/${slug} should align social descriptions`,
          );

          const ogImage = findMetaContent(articleHead, "property", "og:image");
          const twitterImage = findMetaContent(articleHead, "name", "twitter:image");
          assert.equal(ogImage, twitterImage, `blog/${slug} should align social images`);
          if (ogImage) {
            const expectedSeoImage = getExpectedSeoImage(post);
            if (expectedSeoImage) {
              assert.equal(
                ogImage,
                expectedSeoImage,
                `blog/${slug} should expose first safe image`,
              );
            } else {
              assert.match(
                ogImage,
                /^https?:\/\//,
                `blog/${slug} should expose an absolute social image`,
              );
            }
          }

          const [blogPosting] = getJsonLdPayloads(articleHead) as Array<{
            "@id"?: string;
            "@type"?: string;
            url?: string;
            headline?: string;
            datePublished?: string;
            image?: string;
            mainEntityOfPage?: { "@id"?: string };
          }>;
          assert.ok(blogPosting, `blog/${slug} should expose article JSON-LD`);
          assert.equal(blogPosting["@type"], "BlogPosting");
          assert.equal(blogPosting["@id"], canonicalUrl);
          assert.equal(blogPosting.url, canonicalUrl);
          assert.ok(blogPosting.headline, `blog/${slug} should expose JSON-LD headline`);
          assert.equal(blogPosting.headline, ogTitle, `blog/${slug} should align JSON-LD headline`);
          assert.equal(blogPosting.mainEntityOfPage?.["@id"], canonicalUrl);
          if (blogPosting.datePublished) {
            assertMetaEquals(
              articleHead,
              "property",
              "article:published_time",
              blogPosting.datePublished,
              `blog/${slug}`,
            );
          }
          if (blogPosting.image) {
            assert.equal(blogPosting.image, ogImage);
          }
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
      assert.match(robotsTxt, new RegExp(`Sitemap:\\s*${escapeRegExp(siteOrigin)}/sitemap\\.xml`));
      assert.match(sitemapXml, new RegExp(`<loc>${escapeRegExp(siteOrigin)}/</loc>`));
      assert.match(sitemapXml, new RegExp(`<loc>${escapeRegExp(siteOrigin)}/blog/</loc>`));

      for (const post of posts) {
        const slug = getPostSlug(post);
        if (!slug) {
          assert.fail(`post slug should exist for "${post.title ?? "unknown"}"`);
        }
        assert.match(
          sitemapXml,
          new RegExp(`<loc>${escapeRegExp(siteOrigin)}/blog/${escapeRegExp(slug)}/</loc>`),
        );
      }
    },
  },
];

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

await runGoldenCases("Post-build SSG", " post-build SSG golden case", cases);
