// noinspection ES6PreferShortImport,DuplicatedCode

import assert from "node:assert/strict";
import { ref } from "vue";
import { createYamlClientBindings } from "../src/shared/lib/yaml/getYaml.client.ts";
import { createYamlApiState } from "../src/shared/lib/yaml/getYaml.core.ts";
import { MAIN_CONTENT_RESOURCES } from "../src/shared/lib/app/mainContentResources.ts";
import { runGoldenCases } from "./testHarness";

const createStateRefs = () => ({
  yamlLoading: ref(false),
  yamlRetrying: ref(false),
  faultTimes: ref(0),
  changeSpareUrl: ref(false),
  serverError: ref(false),
  notFoundError: ref(false),
  listPrimaryError: ref(false),
  listSpareError: ref(false),
  yamlLoadingFault: ref(false),
  singleChangeSpareUrl: ref(false),
  singleServerError: ref(false),
  singleNotFoundError: ref(false),
  singleYamlLoadFailed: ref(false),
});

const createClientHarness = (
  files: Record<string, string>,
  options: {
    currentLang?: string;
    sleep?: (ms: number) => Promise<void>;
  } = {},
) => {
  const fileMap = new Map(Object.entries(files));
  const messages: Array<{ level: "error" | "warning"; content: string }> = [];
  const refs = createStateRefs();

  const client = createYamlClientBindings(
    async (resourcePath) => {
      if (!fileMap.has(resourcePath)) {
        throw new Error(`ENOENT ${resourcePath}`);
      }

      return fileMap.get(resourcePath)!;
    },
    {
      state: createYamlApiState(),
      stateRefs: refs,
      currentLang: { value: options.currentLang ?? "en" },
      messageApi: {
        error: (content) => messages.push({ level: "error", content }),
        warning: (content) => messages.push({ level: "warning", content }),
      },
      sleep: options.sleep,
    },
  );

  return {
    client,
    refs,
    messages,
  };
};

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const flushMicrotasks = async (times = 4): Promise<void> => {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
};

const getSingleI18nList = (
  value: unknown,
  key: string,
  expectedCount: number,
): Array<{ type: string; content?: string; temp_id: string }> => {
  assert.equal(typeof value, "object");
  assert.ok(value);
  const record = value as Record<string, unknown>;
  assert.ok(Object.prototype.hasOwnProperty.call(record, key));
  const list = record[key];
  assert.ok(Array.isArray(list));
  assert.equal(list.length, expectedCount);

  for (const entry of list) {
    assert.equal(typeof entry, "object");
    assert.ok(entry);
    assert.equal(typeof (entry as { type?: unknown }).type, "string");
    assert.equal(typeof (entry as { content?: unknown }).content, "string");
    assert.equal(typeof (entry as { temp_id?: unknown }).temp_id, "string");
  }

  return list as Array<{ type: string; content?: string; temp_id: string }>;
};

const titleResource = MAIN_CONTENT_RESOURCES.title;
const friendsResource = MAIN_CONTENT_RESOURCES.friends;

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "配置文件加载失败时会同步状态并提示 configLoadFailed",
    run: async () => {
      const { client, refs, messages } = createClientHarness({});

      await assert.rejects(() => client.getYamlConfig());

      assert.deepEqual(messages, [
        {
          level: "error",
          content:
            "[Config Load Failed]: Failed to load configuration file. Error: ENOENT /data/config/yamlUrl.json",
        },
      ]);
      assert.equal(refs.yamlLoading.value, false);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.notFoundError.value, false);
    },
  },
  {
    name: "配置类型缺失时会提示 configTypeError 且不污染错误状态",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify({}),
      });

      const result = await client.loadSingleYaml("missing", titleResource.fileName);

      assert.equal(result, null);
      assert.deepEqual(messages, [
        {
          level: "error",
          content: "[Config Error]: Type 'missing' not found in YamlUrlConfig.",
        },
      ]);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.notFoundError.value, false);
      assert.equal(refs.changeSpareUrl.value, false);
    },
  },
  {
    name: "列表主源和备用源都失败时会置上 listPrimaryError listSpareError 和 notFoundError",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify({
          blog: {
            listUrl: "/blog/list.json",
            spareListUrl: "/spare-blog/list.json",
            url: "/blog",
            spareUrl: "/spare-blog",
          },
        }),
      });

      const posts = await client.loadAllPosts("blog");

      assert.deepEqual(posts, []);
      assert.deepEqual(messages, []);
      assert.equal(refs.listPrimaryError.value, true);
      assert.equal(refs.listSpareError.value, true);
      assert.equal(refs.changeSpareUrl.value, true);
      assert.equal(refs.notFoundError.value, true);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.yamlLoadingFault.value, false);
    },
  },
  {
    name: "单篇缺失时会走 single 独立状态并提示切备用源与彻底失败",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify({
          main: {
            url: "/main",
            spareUrl: "/spare-main",
          },
        }),
      });

      const result = await client.loadSingleYaml(titleResource.type, titleResource.fileName);

      assert.equal(result, null);
      assert.deepEqual(messages, [
        {
          level: "warning",
          content: `Primary resource failed, switching to spare source: ${titleResource.type}/${titleResource.fileName}`,
        },
        {
          level: "error",
          content: `Single resource load failed completely: ${titleResource.type}/${titleResource.fileName}`,
        },
      ]);
      assert.equal(refs.changeSpareUrl.value, false);
      assert.equal(refs.notFoundError.value, false);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.singleChangeSpareUrl.value, true);
      assert.equal(refs.singleNotFoundError.value, true);
      assert.equal(refs.singleServerError.value, false);
      assert.equal(refs.singleYamlLoadFailed.value, true);
    },
  },
  {
    name: "单篇主源失败但备用源成功时只提示切备用源",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify({
          main: {
            url: "/main",
            spareUrl: "/spare-main",
          },
        }),
        [`/spare-main/${titleResource.fileName}`]:
          '@title\n- type: "en"\n  content: "fallback ok"\n@end',
      });

      const result = await client.loadSingleYaml(titleResource.type, titleResource.fileName);

      getSingleI18nList(result, "title", 1);
      assert.deepEqual(messages, [
        {
          level: "warning",
          content: `Primary resource failed, switching to spare source: ${titleResource.type}/${titleResource.fileName}`,
        },
      ]);
      assert.equal(refs.singleChangeSpareUrl.value, true);
      assert.equal(refs.singleYamlLoadFailed.value, false);
      assert.equal(refs.singleNotFoundError.value, false);
      assert.equal(refs.singleServerError.value, false);
      assert.equal(refs.changeSpareUrl.value, false);
    },
  },
  {
    name: "singleYamlFallback 会按当前语言输出 warning 文案并替换路径参数",
    run: async () => {
      const { client, messages, refs } = createClientHarness(
        {
          "/data/config/yamlUrl.json": JSON.stringify({
            main: {
              url: "/main",
              spareUrl: "/spare-main",
            },
          }),
          [`/spare-main/${titleResource.fileName}`]: '@title\n- type: "zh"\n  content: "ok"\n@end',
        },
        {
          currentLang: "zh",
        },
      );

      await client.loadSingleYaml(titleResource.type, titleResource.fileName);

      assert.deepEqual(messages, [
        {
          level: "warning",
          content: `主资源加载失败，正在切换到备用源: ${titleResource.type}/${titleResource.fileName}`,
        },
      ]);
      assert.equal(refs.singleChangeSpareUrl.value, true);
      assert.equal(refs.singleYamlLoadFailed.value, false);
      assert.equal(refs.singleNotFoundError.value, false);
      assert.equal(refs.singleServerError.value, false);
      assert.equal(refs.changeSpareUrl.value, false);
      assert.equal(refs.notFoundError.value, false);
      assert.equal(refs.serverError.value, false);
    },
  },
  {
    name: "singleYamlReadFailed 会按当前语言输出 error 文案并替换路径参数",
    run: async () => {
      const { client, messages, refs } = createClientHarness(
        {
          "/data/config/yamlUrl.json": JSON.stringify({
            main: {
              url: "/main",
              spareUrl: "/spare-main",
            },
          }),
        },
        {
          currentLang: "zh",
        },
      );

      const result = await client.loadSingleYaml(friendsResource.type, friendsResource.fileName);

      assert.equal(result, null);
      assert.deepEqual(messages, [
        {
          level: "warning",
          content: `主资源加载失败，正在切换到备用源: ${friendsResource.type}/${friendsResource.fileName}`,
        },
        {
          level: "error",
          content: `单文件资源加载彻底失败: ${friendsResource.type}/${friendsResource.fileName}`,
        },
      ]);
      assert.equal(refs.singleChangeSpareUrl.value, true);
      assert.equal(refs.singleYamlLoadFailed.value, true);
      assert.equal(refs.singleNotFoundError.value, true);
      assert.equal(refs.singleServerError.value, false);
      assert.equal(refs.changeSpareUrl.value, false);
      assert.equal(refs.notFoundError.value, false);
      assert.equal(refs.serverError.value, false);
    },
  },
  {
    name: "局部 DSL 错误会提示 dsl 文案并在单篇缺失时标记 yamlLoadingFault",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify({
          blog: {
            listUrl: "/blog/list.json",
            url: "/blog",
            spareUrl: "/spare-blog",
          },
        }),
        "/blog/list.json": JSON.stringify(["bad.dsl", "missing.dsl"]),
        "/blog/bad.dsl":
          "@meta\ntitle: Bad\ntime: 20240101\n@end\n@image\noops\n@end\n@text\nhello\n@end",
      });

      const posts = await client.loadAllPosts<{ title: string }>("blog");

      assert.deepEqual(
        posts.map((post) => post.title),
        ["Bad"],
      );
      assert.deepEqual(messages, [
        {
          level: "error",
          content: '[DSL Warning] Unrecognized line, skipped: "oops"',
        },
      ]);
      assert.equal(refs.yamlLoadingFault.value, true);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.notFoundError.value, false);
    },
  },
  {
    name: "DSL 资源不受支持时会提示 yamlLoadFailed 而不是 dsl error",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify({
          main: {
            url: "/main",
          },
        }),
        "/main/unknown.dsl": "@unknown\nhello\n@end",
      });

      const result = await client.loadSingleYaml("main", "unknown.dsl");

      assert.equal(result, null);
      assert.deepEqual(messages, [
        {
          level: "error",
          content: "YAML load failed: Error: Unsupported DSL resource: main:unknown.dsl",
        },
      ]);
      assert.equal(refs.notFoundError.value, false);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.singleYamlLoadFailed.value, true);
    },
  },
  {
    name: "单篇网络错误不会污染列表状态，并会置上 singleServerError",
    run: async () => {
      const refs = createStateRefs();
      const messages: Array<{ level: "error" | "warning"; content: string }> = [];
      const client = createYamlClientBindings(
        async (resourcePath) => {
          if (resourcePath === "/data/config/yamlUrl.json") {
            return JSON.stringify({
              main: {
                url: "/main",
              },
            });
          }
          if (resourcePath === "/main/friends.dsl") {
            throw new Error("network fail");
          }
          throw new Error(`ENOENT ${resourcePath}`);
        },
        {
          state: createYamlApiState(),
          stateRefs: refs,
          currentLang: { value: "en" },
          messageApi: {
            error: (content) => messages.push({ level: "error", content }),
            warning: (content) => messages.push({ level: "warning", content }),
          },
        },
      );

      const result = await client.loadSingleYaml(friendsResource.type, friendsResource.fileName);

      assert.equal(result, null);
      assert.deepEqual(messages, [
        {
          level: "error",
          content: `Single resource load failed completely: ${friendsResource.type}/${friendsResource.fileName}`,
        },
      ]);
      assert.equal(refs.singleServerError.value, true);
      assert.equal(refs.singleNotFoundError.value, false);
      assert.equal(refs.singleYamlLoadFailed.value, true);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.notFoundError.value, false);
    },
  },
  {
    name: "加载进行中时 yamlLoading 会置 true，结束后恢复 false",
    run: async () => {
      const listDeferred = createDeferred<string>();
      const { refs } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify({
          blog: {
            listUrl: "/blog/list.json",
            url: "/blog",
          },
        }),
        "/blog/a.dsl": "@meta\ntitle: A\ntime: 20240101\n@end\n@text\nA\n@end",
      });

      const delayedClient = createYamlClientBindings(
        async (resourcePath) => {
          if (resourcePath === "/data/config/yamlUrl.json") {
            return JSON.stringify({
              blog: {
                listUrl: "/blog/list.json",
                url: "/blog",
              },
            });
          }
          if (resourcePath === "/blog/list.json") {
            return listDeferred.promise;
          }
          if (resourcePath === "/blog/a.dsl") {
            return "@meta\ntitle: A\ntime: 20240101\n@end\n@text\nA\n@end";
          }
          throw new Error(`ENOENT ${resourcePath}`);
        },
        {
          state: createYamlApiState(),
          stateRefs: refs,
          currentLang: { value: "en" },
          messageApi: { error() {}, warning() {} },
        },
      );

      const pending = delayedClient.loadAllPosts("blog");
      await flushMicrotasks();

      assert.equal(refs.yamlLoading.value, true);

      listDeferred.resolve('["a.dsl"]');
      await pending;

      assert.equal(refs.yamlLoading.value, false);
    },
  },
  {
    name: "网络重试时会切到 yamlRetrying 并记录 faultTimes，成功后恢复",
    run: async () => {
      const sleepDeferred = createDeferred<void>();
      let attempts = 0;
      const { refs, messages } = createClientHarness(
        {
          "/data/config/yamlUrl.json": JSON.stringify({
            blog: {
              listUrl: "/blog/list.json",
              url: "/blog",
            },
          }),
          "/blog/list.json": '["ok.dsl"]',
          "/blog/ok.dsl": "@meta\ntitle: OK\ntime: 20240101\n@end\n@text\nok\n@end",
        },
        {
          sleep: async () => sleepDeferred.promise,
        },
      );

      const retryingClient = createYamlClientBindings(
        async (resourcePath) => {
          if (resourcePath === "/data/config/yamlUrl.json") {
            return JSON.stringify({
              blog: {
                listUrl: "/blog/list.json",
                url: "/blog",
              },
            });
          }
          if (resourcePath === "/blog/list.json") {
            attempts++;
            if (attempts === 1) {
              throw new Error("network fail");
            }
            return '["ok.dsl"]';
          }
          if (resourcePath === "/blog/ok.dsl") {
            return "@meta\ntitle: OK\ntime: 20240101\n@end\n@text\nok\n@end";
          }
          throw new Error(`ENOENT ${resourcePath}`);
        },
        {
          state: createYamlApiState(),
          stateRefs: refs,
          currentLang: { value: "en" },
          messageApi: {
            error: (content) => messages.push({ level: "error", content }),
            warning: (content) => messages.push({ level: "warning", content }),
          },
          sleep: async () => sleepDeferred.promise,
        },
      );

      const pending = retryingClient.loadAllPosts("blog");
      await flushMicrotasks(6);

      assert.equal(refs.yamlRetrying.value, true);
      assert.equal(refs.faultTimes.value, 2);
      assert.equal(refs.yamlLoading.value, true);

      sleepDeferred.resolve();
      await pending;

      assert.equal(refs.yamlRetrying.value, false);
      assert.equal(refs.yamlLoading.value, false);
      assert.equal(refs.serverError.value, false);
      assert.deepEqual(messages, []);
    },
  },
];

await runGoldenCases("Yaml Client", " Yaml client golden case", cases);
