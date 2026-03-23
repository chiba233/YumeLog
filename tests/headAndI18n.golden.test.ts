// noinspection ES6PreferShortImport,HttpUrlsUsage

import assert from "node:assert/strict";
import { ref } from "vue";
import { createYamlTextState } from "../src/shared/lib/app/useYamlI18n.ts";
import { createBlogHeadEntries } from "../src/shared/lib/app/useHead.ts";
import { lang } from "../src/shared/lib/app/setupLang.ts";
import {
  globalWebTitleMap,
  posts,
  selectedPost,
  showModal,
} from "../src/shared/lib/app/useGlobalState.ts";
import { personRawData } from "../src/shared/lib/app/setupJson.ts";
import type { Post } from "../src/shared/types/blog.ts";
import type { CommonI18nBlock } from "../src/shared/types/common.ts";
import { MAIN_CONTENT_RESOURCES } from "../src/shared/lib/app/mainContentResources.ts";
import { resolveSiteOrigin, sanitizeAssetUrl } from "../src/shared/lib/app/siteOrigin.ts";
import { runGoldenCases } from "./testHarness";
import { loadTestJsonFixture } from "./testFixtures.ts";

interface HeadAndI18nFixture {
  yamlFallback: {
    initialLang: string;
    switchLang: string;
    titleEntries: CommonI18nBlock[];
    expectedInitialText: string;
    expectedSwitchedText: string;
    expectedMessages: string[];
  };
  yamlError: {
    lang: string;
    expectedPlaceholder: string;
    errorMessage: string;
  };
  seoHead: {
    origin: string;
    webTitles: Record<string, Record<string, string>>;
    author: Record<string, Record<string, string>>;
    posts: Post[];
    blogCanonical: string;
    articleCanonical: string;
    expectedListTitle: string;
    expectedArticleTitle: string;
    expectedArticlePublishedTime: string;
    expectedImage: string;
    expectedDescriptionPattern: string;
    expectedBlogSchemaPattern: string;
    expectedPostingSchemaPattern: string;
    expectedAuthorPattern: string;
  };
  originSafety: {
    ssrOrigin: string;
    browserOrigin: string;
    expectedResolvedOrigin: string;
    headOrigin: string;
  };
  assetSafety: {
    origin: string;
    webTitles: Record<string, Record<string, string>>;
    post: Post;
    safeAssetSamples: string[];
    unsafeAssetSamples: string[];
  };
}

const fixture = await loadTestJsonFixture<HeadAndI18nFixture>("headAndI18n.golden.json");

const captureConsoleError = async (run: () => Promise<void> | void): Promise<string[]> => {
  const original = console.error;
  const messages: string[] = [];
  console.error = (...args: unknown[]) => {
    messages.push(args.map((arg) => String(arg)).join(" "));
  };

  try {
    await run();
  } finally {
    console.error = original;
  }

  return messages;
};

const resetHeadState = (): void => {
  lang.value = "en";
  globalWebTitleMap.value = {};
  posts.value = [];
  selectedPost.value = null;
  showModal.value = false;
  personRawData.value = null;
};

const titleResource = MAIN_CONTENT_RESOURCES.title;

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "[I18n/Yaml] 文本自动回退 -> 缺少当前语言时应当回退 en 并在全局语言切换后实时更新文本",
    run: async () => {
      const currentLang = ref(fixture.yamlFallback.initialLang);
      const messages: string[] = [];
      const state = createYamlTextState({
        type: titleResource.type,
        fileName: titleResource.fileName,
        keyName: titleResource.keyName,
        ssr: true,
        registerServerPrefetch: false,
        currentLang,
        message: { error: (msg) => messages.push(msg) },
        getSingle: async <T extends object>(
          _type: string,
          _fileName: string,
          _force?: boolean,
        ): Promise<T | null> =>
          ({
            title: fixture.yamlFallback.titleEntries,
          }) as unknown as T,
      });

      await state.loadData();
      assert.equal(state.text.value, fixture.yamlFallback.expectedInitialText);

      currentLang.value = fixture.yamlFallback.switchLang;
      assert.equal(state.text.value, fixture.yamlFallback.expectedSwitchedText);
      assert.deepEqual(messages, fixture.yamlFallback.expectedMessages);
    },
  },
  {
    name: "[I18n/Yaml] 加载异常处理 -> 非 SSR 模式下加载失败应当保留占位符并上报错误消息",
    run: async () => {
      const messages: string[] = [];
      const state = createYamlTextState({
        type: titleResource.type,
        fileName: titleResource.fileName,
        keyName: titleResource.keyName,
        ssr: true,
        registerServerPrefetch: false,
        currentLang: ref(fixture.yamlError.lang),
        message: { error: (msg) => messages.push(msg) },
        getSingle: async <T extends object>(
          _type: string,
          _fileName: string,
          _force?: boolean,
        ): Promise<T | null> => {
          throw new Error(fixture.yamlError.errorMessage);
        },
      });

      const errors = await captureConsoleError(async () => {
        await state.loadData();
      });

      assert.equal(state.text.value, fixture.yamlError.expectedPlaceholder);
      assert.deepEqual(messages, []);
      assert.equal(
        errors[0],
        `[YAML Load Error] ${titleResource.type}/${titleResource.fileName}: Error: ${fixture.yamlError.errorMessage}`,
      );
    },
  },
  {
    name: "[SEO/Head] 页面状态联动 -> 应当在博客列表页与文章详情页之间正确切换 SEO Head 元数据",
    run: () => {
      resetHeadState();
      lang.value = "en";
      globalWebTitleMap.value = fixture.seoHead.webTitles;
      personRawData.value = fixture.seoHead.author;

      const blogPosts: Post[] = fixture.seoHead.posts;
      posts.value = blogPosts;

      const head = createBlogHeadEntries({ origin: fixture.seoHead.origin, ssr: true });

      assert.equal(head.title.value, fixture.seoHead.expectedListTitle);
      assert.deepEqual(head.link.value, [
        {
          rel: "canonical",
          href: fixture.seoHead.blogCanonical,
        },
      ]);
      assert.match(
        head.script.value[0]?.innerHTML ?? "",
        new RegExp(fixture.seoHead.expectedBlogSchemaPattern),
      );
      assert.match(
        head.meta.value.find((item) => item.name === "description")?.content ?? "",
        new RegExp(fixture.seoHead.expectedDescriptionPattern),
      );
      assert.equal(head.meta.value.find((item) => item.property === "og:type")?.content, "website");

      selectedPost.value = blogPosts[0];
      showModal.value = true;

      assert.equal(head.title.value, fixture.seoHead.expectedArticleTitle);
      assert.deepEqual(head.link.value, [
        {
          rel: "canonical",
          href: fixture.seoHead.articleCanonical,
        },
      ]);
      assert.equal(head.meta.value.find((item) => item.property === "og:type")?.content, "article");
      assert.equal(
        head.meta.value.find((item) => item.property === "article:published_time")?.content,
        fixture.seoHead.expectedArticlePublishedTime,
      );
      assert.equal(
        head.meta.value.find(
          (item) => item.property === "og:image" || item.name === "twitter:image",
        )?.content,
        fixture.seoHead.expectedImage,
      );
      assert.match(
        head.script.value[0]?.innerHTML ?? "",
        new RegExp(fixture.seoHead.expectedPostingSchemaPattern),
      );
      assert.match(
        head.script.value[0]?.innerHTML ?? "",
        new RegExp(fixture.seoHead.expectedAuthorPattern),
      );

      resetHeadState();
    },
  },
  {
    name: "[SEO/Head] 域名安全校验 -> 在本地开发或空域名环境下不应当将编译地址写入 SSR Head",
    run: () => {
      assert.equal(
        resolveSiteOrigin({
          ssr: true,
          ssrOrigin: fixture.originSafety.ssrOrigin,
          browserOrigin: fixture.originSafety.browserOrigin,
        }),
        fixture.originSafety.expectedResolvedOrigin,
      );

      const head = createBlogHeadEntries({ origin: fixture.originSafety.headOrigin, ssr: true });

      assert.deepEqual(head.link.value, []);
      assert.equal(
        head.meta.value.some((item) => item.content === "http://localhost:5173"),
        false,
      );
      assert.equal(
        head.meta.value.some((item) => item.property === "og:url" || item.name === "twitter:url"),
        false,
      );
    },
  },
  {
    name: "[SEO/Asset] 路径安全性 -> 本地或非法协议的图片路径不应当进入博客 SEO 外部索引",
    run: () => {
      resetHeadState();
      lang.value = "en";
      globalWebTitleMap.value = fixture.assetSafety.webTitles;
      posts.value = [fixture.assetSafety.post];
      selectedPost.value = posts.value[0] ?? null;
      showModal.value = true;

      const head = createBlogHeadEntries({ origin: fixture.assetSafety.origin, ssr: true });

      for (const safePath of fixture.assetSafety.safeAssetSamples) {
        assert.equal(sanitizeAssetUrl(safePath), safePath);
      }
      for (const unsafePath of fixture.assetSafety.unsafeAssetSamples) {
        assert.equal(sanitizeAssetUrl(unsafePath), "");
      }
      assert.equal(
        head.meta.value.some(
          (item) => item.property === "og:image" || item.name === "twitter:image",
        ),
        false,
      );
      const scriptHtml = head.script.value[0]?.innerHTML ?? "";
      for (const unsafePath of fixture.assetSafety.unsafeAssetSamples) {
        assert.ok(!scriptHtml.includes(unsafePath));
      }

      resetHeadState();
    },
  },
];

await runGoldenCases("Head + I18n", " Head + I18n golden case", cases);
