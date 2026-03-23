// noinspection ES6PreferShortImport,DuplicatedCode

import assert from "node:assert/strict";
import { ref } from "vue";
import { createYamlClientBindings } from "../src/shared/lib/yaml/getYaml.client.ts";
import { createYamlApiState } from "../src/shared/lib/yaml/getYaml.core.ts";
import { MAIN_CONTENT_RESOURCES } from "../src/shared/lib/app/mainContentResources.ts";
import { runGoldenCases } from "./testHarness";
import { loadTestJsonFixture } from "./testFixtures.ts";

interface ClientMessage {
  level: "error" | "warning";
  content: string;
}

interface GetYamlClientFixture {
  configLoadFailed: {
    expectedMessages: ClientMessage[];
  };
  missingType: {
    yamlConfig: Record<string, unknown>;
    type: string;
    expectedMessages: ClientMessage[];
  };
  listDualFail: {
    yamlConfig: Record<string, unknown>;
  };
  singleDualFail: {
    yamlConfig: Record<string, unknown>;
    expectedMessages: ClientMessage[];
  };
  singleSpareSuccess: {
    yamlConfig: Record<string, unknown>;
    spareTitleDsl: string;
    expectedMessages: ClientMessage[];
  };
  singleZhFallback: {
    yamlConfig: Record<string, unknown>;
    currentLang: string;
    spareTitleDsl: string;
    expectedMessages: ClientMessage[];
  };
  singleZhFailure: {
    yamlConfig: Record<string, unknown>;
    currentLang: string;
    expectedMessages: ClientMessage[];
  };
  dslWarning: {
    yamlConfig: Record<string, unknown>;
    listFileNames: string[];
    badDsl: string;
    expectedTitles: string[];
    expectedMessages: ClientMessage[];
  };
  unsupportedResource: {
    yamlConfig: Record<string, unknown>;
    fileName: string;
    content: string;
    expectedMessages: ClientMessage[];
  };
  singleNetworkFailure: {
    yamlConfig: Record<string, unknown>;
    expectedMessages: ClientMessage[];
  };
  loadingState: {
    yamlConfig: Record<string, unknown>;
    listPayload: string;
    postDsl: string;
  };
  retry: {
    yamlConfig: Record<string, unknown>;
    listPayload: string;
    postDsl: string;
    expectedMessages: ClientMessage[];
  };
}

const fixture = await loadTestJsonFixture<GetYamlClientFixture>("getYamlClient.golden.json");

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
  const messages: ClientMessage[] = [];
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

const assertMessagesLike = (
  actual: ClientMessage[],
  expected: Array<{
    level: ClientMessage["level"];
    includes?: string[];
  }>,
): void => {
  assert.equal(actual.length, expected.length);

  expected.forEach((message, index) => {
    const current = actual[index];
    assert.ok(current, `Missing message at index ${index}`);
    assert.equal(current.level, message.level);

    for (const fragment of message.includes ?? []) {
      assert.match(current.content, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });
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
    name: "[Config/Init] 配置文件读取失败 -> 应当同步错误状态并输出 configLoadFailed 错误消息",
    run: async () => {
      const { client, refs, messages } = createClientHarness({});

      await assert.rejects(() => client.getYamlConfig());

      assertMessagesLike(messages, [
        {
          level: "error",
          includes: ["/data/config/yamlUrl.json"],
        },
      ]);
      assert.equal(refs.yamlLoading.value, false);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.notFoundError.value, false);
    },
  },
  {
    name: "[Config/Init] 配置项类型缺失 -> 应当输出 configTypeError 错误且不污染全局错误状态",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.missingType.yamlConfig),
      });

      const result = await client.loadSingleYaml(fixture.missingType.type, titleResource.fileName);

      assert.equal(result, null);
      assertMessagesLike(messages, [
        {
          level: "error",
          includes: [fixture.missingType.type],
        },
      ]);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.notFoundError.value, false);
      assert.equal(refs.changeSpareUrl.value, false);
    },
  },
  {
    name: "[State/List] 列表双源均失效 -> 应当置位主/备源错误标志及 notFoundError",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.listDualFail.yamlConfig),
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
    name: "[State/Single] 单篇资源双源均缺失 -> 应当进入独立 single 错误状态并输出 fallback 失败消息",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.singleDualFail.yamlConfig),
      });

      const result = await client.loadSingleYaml(titleResource.type, titleResource.fileName);

      assert.equal(result, null);
      assertMessagesLike(messages, [
        {
          level: "warning",
          includes: [`${titleResource.type}/${titleResource.fileName}`],
        },
        {
          level: "error",
          includes: [`${titleResource.type}/${titleResource.fileName}`],
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
    name: "[State/Single] 单篇主源失败备用源成功 -> 应当仅提示切换备用源并成功返回数据",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.singleSpareSuccess.yamlConfig),
        [`/spare-main/${titleResource.fileName}`]: fixture.singleSpareSuccess.spareTitleDsl,
      });

      const result = await client.loadSingleYaml(titleResource.type, titleResource.fileName);

      getSingleI18nList(result, "title", 1);
      assertMessagesLike(messages, [
        {
          level: "warning",
          includes: [`${titleResource.type}/${titleResource.fileName}`],
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
    name: "[State/Single] I18n 兼容性 (Fallback) -> 应当按当前语言输出警告并替换路径参数",
    run: async () => {
      const { client, messages, refs } = createClientHarness(
        {
          "/data/config/yamlUrl.json": JSON.stringify(fixture.singleZhFallback.yamlConfig),
          [`/spare-main/${titleResource.fileName}`]: fixture.singleZhFallback.spareTitleDsl,
        },
        {
          currentLang: fixture.singleZhFallback.currentLang,
        },
      );

      await client.loadSingleYaml(titleResource.type, titleResource.fileName);

      assertMessagesLike(messages, [
        {
          level: "warning",
          includes: [`${titleResource.type}/${titleResource.fileName}`],
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
    name: "[State/Single] I18n 兼容性 (Failure) -> 应当按当前语言输出彻底失败的错误文案",
    run: async () => {
      const { client, messages, refs } = createClientHarness(
        {
          "/data/config/yamlUrl.json": JSON.stringify(fixture.singleZhFailure.yamlConfig),
        },
        {
          currentLang: fixture.singleZhFailure.currentLang,
        },
      );

      const result = await client.loadSingleYaml(friendsResource.type, friendsResource.fileName);

      assert.equal(result, null);
      assertMessagesLike(messages, [
        {
          level: "warning",
          includes: [`${friendsResource.type}/${friendsResource.fileName}`],
        },
        {
          level: "error",
          includes: [`${friendsResource.type}/${friendsResource.fileName}`],
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
    name: "[DSL/Compatibility] 局部解析错误 -> 应当输出 DSL 警告并在部分资源失效时标记 yamlLoadingFault",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.dslWarning.yamlConfig),
        "/blog/list.json": JSON.stringify(fixture.dslWarning.listFileNames),
        "/blog/bad.dsl": fixture.dslWarning.badDsl,
      });

      const posts = await client.loadAllPosts<{ title: string }>("blog");

      assert.deepEqual(
        posts.map((post) => post.title),
        fixture.dslWarning.expectedTitles,
      );
      assertMessagesLike(messages, [
        {
          level: "error",
          includes: ["oops"],
        },
      ]);
      assert.equal(refs.yamlLoadingFault.value, true);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.notFoundError.value, false);
    },
  },
  {
    name: "[DSL/Compatibility] 不受支持的资源 -> 应当直接提示 yamlLoadFailed 而非 DSL 内部解析错误",
    run: async () => {
      const { client, refs, messages } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.unsupportedResource.yamlConfig),
        [`/main/${fixture.unsupportedResource.fileName}`]: fixture.unsupportedResource.content,
      });

      const result = await client.loadSingleYaml("main", fixture.unsupportedResource.fileName);

      assert.equal(result, null);
      assertMessagesLike(messages, [
        {
          level: "error",
          includes: ["Unsupported DSL resource", `main:${fixture.unsupportedResource.fileName}`],
        },
      ]);
      assert.equal(refs.notFoundError.value, false);
      assert.equal(refs.serverError.value, false);
      assert.equal(refs.singleYamlLoadFailed.value, true);
    },
  },
  {
    name: "[State/Single] 错误隔离 -> 单篇网络错误应当仅置位 singleServerError 而不污染列表全局状态",
    run: async () => {
      const refs = createStateRefs();
      const messages: ClientMessage[] = [];
      const client = createYamlClientBindings(
        async (resourcePath) => {
          if (resourcePath === "/data/config/yamlUrl.json") {
            return JSON.stringify(fixture.singleNetworkFailure.yamlConfig);
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
      assertMessagesLike(messages, [
        {
          level: "error",
          includes: [`${friendsResource.type}/${friendsResource.fileName}`],
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
    name: "[Runtime/Loading] 加载状态同步 -> 在异步加载期间 yamlLoading 应当为 true 并在结束时恢复",
    run: async () => {
      const listDeferred = createDeferred<string>();
      const { refs } = createClientHarness({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.loadingState.yamlConfig),
        "/blog/a.dsl": fixture.loadingState.postDsl,
      });

      const delayedClient = createYamlClientBindings(
        async (resourcePath) => {
          if (resourcePath === "/data/config/yamlUrl.json") {
            return JSON.stringify(fixture.loadingState.yamlConfig);
          }
          if (resourcePath === "/blog/list.json") {
            return listDeferred.promise;
          }
          if (resourcePath === "/blog/a.dsl") {
            return fixture.loadingState.postDsl;
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

      listDeferred.resolve(fixture.loadingState.listPayload);
      await pending;

      assert.equal(refs.yamlLoading.value, false);
    },
  },
  {
    name: "[Runtime/Network] 自动重试机制 -> 在网络抖动时应当同步 yamlRetrying 并累计 faultTimes",
    run: async () => {
      const sleepDeferred = createDeferred<void>();
      let attempts = 0;
      const { refs, messages } = createClientHarness(
        {
          "/data/config/yamlUrl.json": JSON.stringify(fixture.retry.yamlConfig),
          "/blog/list.json": fixture.retry.listPayload,
          "/blog/ok.dsl": fixture.retry.postDsl,
        },
        {
          sleep: async () => sleepDeferred.promise,
        },
      );

      const retryingClient = createYamlClientBindings(
        async (resourcePath) => {
          if (resourcePath === "/data/config/yamlUrl.json") {
            return JSON.stringify(fixture.retry.yamlConfig);
          }
          if (resourcePath === "/blog/list.json") {
            attempts++;
            if (attempts === 1) {
              throw new Error("network fail");
            }
            return fixture.retry.listPayload;
          }
          if (resourcePath === "/blog/ok.dsl") {
            return fixture.retry.postDsl;
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
      assertMessagesLike(messages, []);
    },
  },
];

await runGoldenCases("Yaml Client", " Yaml client golden case", cases);
