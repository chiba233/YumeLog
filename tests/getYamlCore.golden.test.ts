// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createYamlApi, createYamlApiState } from "../src/shared/lib/yaml/getYaml.core.ts";
import type { DSLError } from "../src/shared/lib/dsl/extractAtBlocks/dslError.ts";

interface FakeApiContext {
  api: ReturnType<typeof createYamlApi>;
  state: ReturnType<typeof createYamlApiState>;
  dslErrors: DSLError[];
  yamlLoadFailed: string[];
  configTypeErrors: string[];
}

const assertTempId = (value: unknown): void => {
  assert.equal(typeof value, "string");
  assert.notEqual(value, "");
};

const getArrayShape = (value: unknown): unknown[] => {
  assert.ok(Array.isArray(value));
  return value;
};

const assertI18nListShape = (value: unknown): void => {
  const list = getArrayShape(value);
  assert.ok(list.length > 0);

  for (const entry of list) {
    assert.equal(typeof entry, "object");
    assert.ok(entry);
    assert.equal(typeof (entry as { type?: unknown }).type, "string");
    assert.equal(typeof (entry as { content?: unknown }).content, "string");
    assertTempId((entry as { temp_id?: unknown }).temp_id);
  }
};

const assertFriendListShape = (value: unknown): void => {
  const list = getArrayShape(value);
  assert.ok(list.length > 0);

  for (const entry of list) {
    assert.equal(typeof entry, "object");
    assert.ok(entry);
    assert.equal(typeof (entry as { name?: unknown }).name, "string");
    assert.equal(typeof (entry as { alias?: unknown }).alias, "string");
    assert.equal(typeof (entry as { url?: unknown }).url, "string");
    assert.equal(typeof (entry as { icon?: unknown }).icon, "string");
    assert.equal(typeof (entry as { spare?: unknown }).spare, "string");
    assertTempId((entry as { temp_id?: unknown }).temp_id);
  }
};

const assertNekoListShape = (value: unknown): void => {
  const list = getArrayShape(value);
  assert.ok(list.length > 0);

  for (const entry of list) {
    assert.equal(typeof entry, "object");
    assert.ok(entry);
    assert.equal(typeof (entry as { imgError?: unknown }).imgError, "string");
    assert.equal(typeof (entry as { img?: unknown }).img, "string");
    assert.equal(typeof (entry as { imgName?: unknown }).imgName, "string");
    assertTempId((entry as { temp_id?: unknown }).temp_id);
  }
};

const assertFromNowShape = (value: unknown): void => {
  const list = getArrayShape(value);
  assert.ok(list.length > 0);

  for (const entry of list) {
    assert.equal(typeof entry, "object");
    assert.ok(entry);
    assert.equal(typeof (entry as { time?: unknown }).time, "string");
    assert.equal(typeof (entry as { photo?: unknown }).photo, "string");
    assertTempId((entry as { temp_id?: unknown }).temp_id);
    assertI18nListShape((entry as { names?: unknown }).names);
  }
};

const loadMainFixture = async (fileName: string): Promise<string> => {
  const filePath = path.resolve(process.cwd(), "public", "data", "main", fileName);
  return await fs.readFile(filePath, "utf-8");
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

      assert.ok(data);
      assertFromNowShape(data.fromNow);
      assert.equal(data.fromNow.length, 2);
      assert.equal(data.fromNow[0]?.names.length, 1);
      assert.equal(state.changeSpareUrl, false);
      assert.equal(state.singleChangeSpareUrl, true);
      assert.equal(state.singleYamlLoadFailed, false);
      assert.deepEqual(dslErrors, [
        {
          code: "dslUnrecognizedLine",
          params: { raw: "time bad" },
        },
      ]);
    },
  },
  {
    name: "loadSingleYaml 会正确读取 main 下各个单文件并生成对应数据树",
    run: async () => {
      const [titleDsl, introductionDsl, friendsDsl, nekoDsl, fromNowDsl] = await Promise.all([
        loadMainFixture("title.dsl"),
        loadMainFixture("introduction.dsl"),
        loadMainFixture("friends.dsl"),
        loadMainFixture("neko.dsl"),
        loadMainFixture("fromNow.dsl"),
      ]);

      const { api, dslErrors } = createFakeApi({
        "/data/config/yamlUrl.json": JSON.stringify({
          main: {
            url: "/main",
          },
        }),
        "/main/title.dsl": titleDsl,
        "/main/introduction.dsl": introductionDsl,
        "/main/friends.dsl": friendsDsl,
        "/main/neko.dsl": nekoDsl,
        "/main/fromNow.dsl": fromNowDsl,
      });

      const [title, introduction, friends, neko, fromNow] = await Promise.all([
        api.loadSingleYaml("main", "title.dsl"),
        api.loadSingleYaml("main", "introduction.dsl"),
        api.loadSingleYaml("main", "friends.dsl"),
        api.loadSingleYaml("main", "neko.dsl"),
        api.loadSingleYaml("main", "fromNow.dsl"),
      ]);

      assert.ok(title && "title" in title);
      assertI18nListShape(title.title);

      assert.ok(introduction && "introduction" in introduction);
      assertI18nListShape(introduction.introduction);

      assert.ok(friends && "friends" in friends);
      assertFriendListShape(friends.friends);

      assert.ok(neko && "img" in neko);
      assertNekoListShape(neko.img);

      assert.ok(fromNow && "fromNow" in fromNow);
      assertFromNowShape(fromNow.fromNow);
      assert.deepEqual(dslErrors, []);
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
