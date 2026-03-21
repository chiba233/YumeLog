// noinspection ES6PreferShortImport

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

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "useYamlI18n 会在缺少当前语言时回退 en 并在语言切换后更新文本",
    run: async () => {
      const currentLang = ref("ja");
      const messages: string[] = [];
      const state = createYamlTextState({
        type: "main",
        fileName: "title.dsl",
        keyName: "title",
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
            title: [
              { temp_id: "1", type: "en", content: "Hello" },
              { temp_id: "2", type: "zh", content: "你好" },
            ] satisfies CommonI18nBlock[],
          }) as unknown as T,
      });

      await state.loadData();
      assert.equal(state.text.value, "Hello");

      currentLang.value = "zh";
      assert.equal(state.text.value, "你好");
      assert.deepEqual(messages, []);
    },
  },
  {
    name: "useYamlI18n 在非 SSR 加载失败时会保留占位并上报消息",
    run: async () => {
      const messages: string[] = [];
      const state = createYamlTextState({
        type: "main",
        fileName: "title.dsl",
        keyName: "title",
        ssr: true,
        registerServerPrefetch: false,
        currentLang: ref("en"),
        message: { error: (msg) => messages.push(msg) },
        getSingle: async <T extends object>(
          _type: string,
          _fileName: string,
          _force?: boolean,
        ): Promise<T | null> => {
          throw new Error("boom");
        },
      });

      const errors = await captureConsoleError(async () => {
        await state.loadData();
      });

      assert.equal(state.text.value, "...");
      assert.deepEqual(messages, []);
      assert.equal(errors[0], "[YAML Load Error] main/title.dsl: Error: boom");
    },
  },
  {
    name: "useHead 会在博客列表页和文章详情页之间正确切换 head 数据",
    run: () => {
      resetHeadState();
      lang.value = "en";
      globalWebTitleMap.value = {
        blog: { en: "Blog" },
        home: { en: "Home" },
      };
      personRawData.value = {
        author: {
          en: "Tester",
        },
      };

      const blogPosts: Post[] = [
        {
          id: "hello-world",
          title: "Hello World",
          time: "20240102",
          blocks: [
            { type: "text", content: "Intro $$bold(text)$$", temp_id: "t1" },
            {
              type: "image",
              content: [{ src: "https://img/a.webp", temp_id: "i1" }],
              temp_id: "b1",
            },
          ],
        },
        {
          title: "Second Post",
          time: "20231201",
          blocks: [{ type: "text", content: "Second body", temp_id: "t2" }],
        },
      ];
      posts.value = blogPosts;

      const head = createBlogHeadEntries({ origin: "https://example.com", ssr: true });

      assert.equal(head.title.value, "Blog");
      assert.deepEqual(head.link.value, [
        {
          rel: "canonical",
          href: "https://example.com/blog",
        },
      ]);
      assert.match(head.script.value[0]?.innerHTML ?? "", /"@type":"Blog"/);
      assert.match(
        head.meta.value.find((item) => item.name === "description")?.content ?? "",
        /Hello World/,
      );
      assert.equal(head.meta.value.find((item) => item.property === "og:type")?.content, "website");

      selectedPost.value = blogPosts[0];
      showModal.value = true;

      assert.equal(head.title.value, "Hello World - Blog");
      assert.deepEqual(head.link.value, [
        {
          rel: "canonical",
          href: "https://example.com/blog/hello-world",
        },
      ]);
      assert.equal(head.meta.value.find((item) => item.property === "og:type")?.content, "article");
      assert.equal(
        head.meta.value.find((item) => item.property === "article:published_time")?.content,
        "2024-01-02",
      );
      assert.equal(
        head.meta.value.find(
          (item) => item.property === "og:image" || item.name === "twitter:image",
        )?.content,
        "https://img/a.webp",
      );
      assert.match(head.script.value[0]?.innerHTML ?? "", /"@type":"BlogPosting"/);
      assert.match(head.script.value[0]?.innerHTML ?? "", /"name":"Tester"/);

      resetHeadState();
    },
  },
];

let failed = false;

for (const testCase of cases) {
  try {
    await testCase.run();
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${testCase.name}`);
    console.error(error);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`PASS ${cases.length} 个 Head + I18n golden case`);
}
