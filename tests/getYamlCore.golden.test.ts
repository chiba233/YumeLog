// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import { createYamlApi, createYamlApiState } from "../src/components/ts/getYaml/getYaml.core.ts";
import type { DSLError } from "../src/components/ts/dsl/extractAtBlocks/dslError.ts";

interface FakeApiContext {
  api: ReturnType<typeof createYamlApi>;
  state: ReturnType<typeof createYamlApiState>;
  dslErrors: DSLError[];
  yamlLoadFailed: string[];
  configTypeErrors: string[];
}

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
    name: "loadAllPosts 会按 pin 优先再按时间倒序排序并在单篇失败时切换 spareUrl",
    run: async () => {
      const { api, state, dslErrors } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify({
          blog: {
            listUrl: "/blog/list.json",
            url: "/blog",
            spareUrl: "/spare-blog",
          },
        }),
        "/blog/list.json": JSON.stringify(["a.dsl", "b.dsl", "c.dsl"]),
        "/blog/a.dsl": "@meta\ntitle: A\ntime: 20240101\n@end\n@text\nA\n@end",
        "/blog/b.dsl": "@meta\ntitle: B\ntime: 20250101\npin: true\n@end\n@text\nB\n@end",
        "/spare-blog/c.dsl": "@meta\ntitle: C\ntime: 20230101\n@end\n@text\nC\n@end",
      });

      const posts = await api.loadAllPosts<{ title: string; time: string; pin?: string }>("blog");

      assert.deepEqual(
        posts.map((post) => ({ title: post.title, time: post.time, pin: post.pin })),
        [
          { title: "B", time: "20250101", pin: "true" },
          { title: "A", time: "20240101", pin: undefined },
          { title: "C", time: "20230101", pin: undefined },
        ],
      );
      assert.equal(state.changeSpareUrl, true);
      assert.equal(state.yamlLoadingFault, false);
      assert.deepEqual(dslErrors, []);
    },
  },
  {
    name: "loadSingleYaml 会在主地址缺失时切到 spare 并保留 DSL 错误恢复结果",
    run: async () => {
      const { api, state, dslErrors } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify({
          main: {
            url: "/main",
            spareUrl: "/spare-main",
          },
        }),
        "/spare-main/fromNow.dsl":
          "@fromNow\n@event\ntime bad\n@names\n- type: en\n  content: broken\n@end\n@end\n@event\ntime: 20240101\n@names\n- type: en\n  content: good\n@end\n@end\n@end",
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

      assert.deepEqual(data, {
        fromNow: [
          {
            temp_id: data?.fromNow[0]?.temp_id,
            time: "",
            photo: "",
            names: [
              {
                temp_id: data?.fromNow[0]?.names[0]?.temp_id,
                type: "en",
                content: "broken",
              },
            ],
          },
          {
            temp_id: data?.fromNow[1]?.temp_id,
            time: "20240101",
            photo: "",
            names: [
              {
                temp_id: data?.fromNow[1]?.names[0]?.temp_id,
                type: "en",
                content: "good",
              },
            ],
          },
        ],
      });
      assert.equal(state.changeSpareUrl, true);
      assert.deepEqual(dslErrors, [
        {
          code: "dslUnrecognizedLine",
          params: { raw: "time bad" },
        },
      ]);
    },
  },
  {
    name: "loadAllPosts 在列表缺失时会设置 notFoundError 并返回空数组",
    run: async () => {
      const { api, state } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify({
          blog: {
            listUrl: "/blog/list.json",
            url: "/blog",
          },
        }),
      });

      const posts = await api.loadAllPosts("blog");

      assert.deepEqual(posts, []);
      assert.equal(state.notFoundError, true);
      assert.equal(state.serverError, false);
      assert.equal(state.yamlLoading, false);
    },
  },
  {
    name: "loadSingleYaml 在不支持的 DSL 资源上会回调 onYamlLoadFailed",
    run: async () => {
      const { api, yamlLoadFailed } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify({
          main: {
            url: "/main",
          },
        }),
        "/main/unknown.dsl": "@unknown\nhello\n@end",
      });

      const result = await api.loadSingleYaml("main", "unknown.dsl");

      assert.equal(result, null);
      assert.deepEqual(yamlLoadFailed, ["Error: Unsupported DSL resource: main:unknown.dsl"]);
    },
  },
  {
    name: "loadSingleYaml 在配置类型缺失时会回调 onConfigTypeError",
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
  console.log(`PASS ${cases.length} 个 Yaml API golden case`);
}
