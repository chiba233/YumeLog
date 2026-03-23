// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import { createContentStore } from "../src/shared/lib/app/contentStore.ts";
import { MAIN_CONTENT_RESOURCES } from "../src/shared/lib/app/mainContentResources.ts";
import { createYamlApi, createYamlApiState } from "../src/shared/lib/yaml/getYaml.core.ts";
import { MAIN_RESOURCE_ASSERTIONS } from "./mainResourceAssertions.ts";
import { runGoldenCases } from "./testHarness";
import { loadTestJsonFixture } from "./testFixtures.ts";

interface AppModulesSmokeFixture {
  yamlConfig: {
    main: {
      url: string;
    };
    blog: {
      listUrl: string;
      url: string;
    };
  };
  mainResources: Record<string, string>;
  mainResourceLengths: Record<string, number>;
  blog: {
    listPath: string;
    fileNames: string[];
    files: Record<string, string>;
    expectedTitles: string[];
  };
}

const fixture = await loadTestJsonFixture<AppModulesSmokeFixture>("appModules.smoke.json");

const getCollectionLength = (value: unknown): number => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Expected parsed resource object");
  }

  const collection = Object.values(value as Record<string, unknown>)[0];
  if (!Array.isArray(collection)) {
    throw new Error("Expected parsed resource to expose a collection");
  }

  return collection.length;
};

const createInjectedYamlApi = () => {
  const requests: string[] = [];
  const files = new Map<string, string>([
    ["/data/config/yamlUrl.json", JSON.stringify(fixture.yamlConfig)],
    [fixture.blog.listPath, JSON.stringify(fixture.blog.fileNames)],
    ...Object.entries(fixture.mainResources).map(([fileName, content]) => [
      `${fixture.yamlConfig.main.url}/${fileName}`.replace(/\/+/g, "/"),
      content,
    ]),
    ...Object.entries(fixture.blog.files).map(([fileName, content]) => [
      `${fixture.yamlConfig.blog.url}/${fileName}`.replace(/\/+/g, "/"),
      content,
    ]),
  ]);

  const api = createYamlApi(
    async (resourcePath) => {
      requests.push(resourcePath);
      const text = files.get(resourcePath);

      if (!text) {
        throw new Error(`ENOENT ${resourcePath}`);
      }

      return text;
    },
    {
      state: createYamlApiState(),
    },
  );

  return { api, requests };
};

const titleResource = MAIN_CONTENT_RESOURCES.title;

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "[Smoke/MainData] 依赖注入主资源 -> 应当使用伪造 DSL 数据完成 main 资源解析与结构校验",
    run: async () => {
      const { api, requests } = createInjectedYamlApi();

      await Promise.all(
        Object.entries(MAIN_RESOURCE_ASSERTIONS).map(async ([fileName, assertResource]) => {
          const result = await api.loadSingleYaml("main", fileName);
          assertResource(result);
          assert.equal(getCollectionLength(result), fixture.mainResourceLengths[fileName]);
        }),
      );

      assert.ok(requests.every((resourcePath) => resourcePath.startsWith("/")));
      assert.ok(
        requests.includes("/data/config/yamlUrl.json"),
        "smoke test should resolve config from injected source",
      );
    },
  },
  {
    name: "[Smoke/StoreDI] 注入式内容存储 -> 应当消费伪造博客与单文件数据，而不是依赖 public 真实文件",
    run: async () => {
      const { api, requests } = createInjectedYamlApi();
      const store = createContentStore({
        loadAllPosts: api.loadAllPosts,
        loadSingleYaml: api.loadSingleYaml,
      });

      const posts = await store.getPosts<{ title: string }>("blog");
      const titleData = await store.getSingle<Record<string, unknown>>(
        titleResource.type,
        titleResource.fileName,
      );

      assert.deepEqual(
        posts.map((post) => post.title),
        fixture.blog.expectedTitles,
      );
      assert.ok(titleData);
      assert.equal(
        getCollectionLength(titleData),
        fixture.mainResourceLengths[titleResource.fileName],
      );
      assert.ok(
        requests.every((resourcePath) => resourcePath !== "/public/data/main/title.dsl"),
        "smoke test should stay on injected resource paths",
      );
    },
  },
];

await runGoldenCases("App Modules Smoke", " App module smoke/data validation case", cases);
