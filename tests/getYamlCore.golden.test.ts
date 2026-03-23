// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import { createYamlApi, createYamlApiState } from "../src/shared/lib/yaml/getYaml.core.ts";
import type { DSLError } from "../src/shared/lib/dsl/extractAtBlocks/dslError.ts";
import { assertFromNowShape, MAIN_RESOURCE_ASSERTIONS } from "./mainResourceAssertions.ts";
import { runGoldenCases } from "./testHarness";
import { loadTestJsonFixture } from "./testFixtures.ts";

interface FakeApiContext {
  api: ReturnType<typeof createYamlApi>;
  state: ReturnType<typeof createYamlApiState>;
  dslErrors: DSLError[];
  yamlLoadFailed: string[];
  configTypeErrors: string[];
}

interface GetYamlCoreFixture {
  listCase: {
    yamlConfig: Record<string, unknown>;
    listFileNames: string[];
    files: Record<string, string>;
    expectedPosts: Array<{
      title: string;
      time: string;
      pin?: string;
    }>;
  };
  singleFallback: {
    yamlConfig: Record<string, unknown>;
    spareFileName: string;
    spareContent: string;
    expectedDslErrors: DSLError[];
    expectedLength: number;
    expectedFirstNamesLength: number;
  };
  mainResources: {
    yamlConfig: Record<string, unknown>;
    files: Record<keyof typeof MAIN_RESOURCE_ASSERTIONS, string>;
  };
  missingList: {
    yamlConfig: Record<string, unknown>;
  };
  unsupportedResource: {
    yamlConfig: Record<string, unknown>;
    fileName: string;
    content: string;
    expectedError: string;
  };
}

const fixture = await loadTestJsonFixture<GetYamlCoreFixture>("getYamlCore.golden.json");

const normalizePostExpectation = (post: { title: string; time: string; pin?: string }) => {
  const normalized: { title: string; time: string; pin?: string } = {
    title: post.title,
    time: post.time,
  };

  if (post.pin !== undefined) {
    normalized.pin = post.pin;
  }

  return normalized;
};

const createFakeApi = (
  files: Record<string, string>,
  options: {
    failOncePaths?: string[];
  } = {},
): FakeApiContext => {
  const fileMap = new Map(Object.entries(files));
  const failOncePaths = new Set(options.failOncePaths ?? []);
  const state = createYamlApiState();
  const dslErrors: DSLError[] = [];
  const yamlLoadFailed: string[] = [];
  const configTypeErrors: string[] = [];

  const api = createYamlApi(
    async (resourcePath) => {
      if (failOncePaths.has(resourcePath)) {
        failOncePaths.delete(resourcePath);
        throw new Error(`network fail once: ${resourcePath}`);
      }

      if (!fileMap.has(resourcePath)) {
        throw new Error(`ENOENT ${resourcePath}`);
      }

      return fileMap.get(resourcePath)!;
    },
    {
      state,
      onDslError: (error) => dslErrors.push(error),
      onYamlLoadFailed: ({ err }) => yamlLoadFailed.push(err),
      onConfigTypeError: ({ type }) => configTypeErrors.push(type),
    },
  );

  return {
    api,
    state,
    dslErrors,
    yamlLoadFailed,
    configTypeErrors,
  };
};

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "[Core/List] 博客列表获取 -> 应当按 pin 优先及时间倒序排序并在部分失效时切换备用源",
    run: async () => {
      const { api, state, dslErrors } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.listCase.yamlConfig),
        "/blog/list.json": JSON.stringify(fixture.listCase.listFileNames),
        ...fixture.listCase.files,
      });

      const posts = await api.loadAllPosts<{ title: string; time: string; pin?: string }>("blog");

      assert.deepEqual(posts.map(normalizePostExpectation), fixture.listCase.expectedPosts);
      assert.equal(state.changeSpareUrl, true);
      assert.equal(state.yamlLoadingFault, false);
      assert.deepEqual(dslErrors, []);
    },
  },
  {
    name: "[Core/Single] 备用源容错机制 -> 主地址缺失时应当自动切备用源并保留 DSL 错误恢复结果",
    run: async () => {
      const { api, state, dslErrors } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.singleFallback.yamlConfig),
        [`/spare-main/${fixture.singleFallback.spareFileName}`]:
          fixture.singleFallback.spareContent,
      });

      const data = await api.loadSingleYaml<{
        fromNow: Array<{
          temp_id: string;
          time: string;
          photo: string;
          names: Array<{
            temp_id: string;
            type: string;
            content?: string;
          }>;
        }>;
      }>("main", "fromNow.dsl");

      assert.ok(data);
      assertFromNowShape(data.fromNow);
      assert.equal(data.fromNow.length, fixture.singleFallback.expectedLength);
      assert.equal(data.fromNow[0]?.names.length, fixture.singleFallback.expectedFirstNamesLength);
      assert.equal(state.changeSpareUrl, false);
      assert.equal(state.singleChangeSpareUrl, true);
      assert.equal(state.singleYamlLoadFailed, false);
      assert.deepEqual(dslErrors, fixture.singleFallback.expectedDslErrors);
    },
  },
  {
    name: "[Core/Main] 单文件映射完整性 -> 应当能正确读取并解析 main 目录下所有预定义 DSL 为数据树",
    run: async () => {
      const { api, dslErrors } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.mainResources.yamlConfig),
        ...Object.fromEntries(
          Object.entries(fixture.mainResources.files).map(([fileName, content]) => [
            `/main/${fileName}`,
            content,
          ]),
        ),
      });

      await Promise.all(
        Object.entries(MAIN_RESOURCE_ASSERTIONS).map(async ([fileName, assertResource]) => {
          const result = await api.loadSingleYaml("main", fileName);
          assertResource(result);
        }),
      );

      assert.deepEqual(dslErrors, []);
    },
  },
  {
    name: "[Core/Error] 列表资源缺失 -> 应当在请求 404 或 ENOENT 时置位 notFoundError 并返回空列表",
    run: async () => {
      const { api, state } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.missingList.yamlConfig),
      });

      const posts = await api.loadAllPosts("blog");

      assert.deepEqual(posts, []);
      assert.equal(state.notFoundError, true);
      assert.equal(state.serverError, false);
      assert.equal(state.yamlLoading, false);
    },
  },
  {
    name: "[Core/Error] 格式/资源不受支持 -> 解析不受支持的 DSL 根块时应当触发 onYamlLoadFailed 回调",
    run: async () => {
      const { api, yamlLoadFailed } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify(fixture.unsupportedResource.yamlConfig),
        [`/main/${fixture.unsupportedResource.fileName}`]: fixture.unsupportedResource.content,
      });

      const result = await api.loadSingleYaml("main", fixture.unsupportedResource.fileName);

      assert.equal(result, null);
      assert.deepEqual(yamlLoadFailed, [fixture.unsupportedResource.expectedError]);
    },
  },
  {
    name: "[Core/Config] 配置校验 -> 当请求未在 yamlUrl.json 中定义的类型时应当触发 onConfigTypeError",
    run: async () => {
      const { api, configTypeErrors } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify({}),
      });

      const result = await api.loadSingleYaml("missing", "title.dsl");

      assert.equal(result, null);
      assert.deepEqual(configTypeErrors, ["missing"]);
    },
  },
];

await runGoldenCases("Yaml API DSL", " Yaml API golden case", cases);
