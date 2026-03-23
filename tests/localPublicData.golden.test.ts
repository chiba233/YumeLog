// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import { createYamlApi, createYamlApiState } from "../src/shared/lib/yaml/getYaml.core.ts";
import type { YamlUrlConfig } from "../src/shared/types/yaml.ts";
import { loadPublicJson, loadPublicText } from "../src/shared/lib/app/publicData.ts";
import { SINGLE_RESOURCE_DSL_PARSERS } from "../src/shared/lib/yaml/singleResourceDSL.ts";
import { isMainResourceFileName, MAIN_RESOURCE_ASSERTIONS } from "./mainResourceAssertions.ts";
import { runGoldenCases } from "./testHarness";

const isHttpUrl = (value: string): boolean => /^https?:\/\//.test(value);
const hasValue = (value?: string): value is string => Boolean(value && value.trim().length > 0);
type LocalBlogPost = {
  title: string;
  time: string;
  pin?: string;
  blocks: unknown[];
};
const MAIN_SINGLE_RESOURCE_FILES = Object.keys(SINGLE_RESOURCE_DSL_PARSERS)
  .filter((key): key is keyof typeof SINGLE_RESOURCE_DSL_PARSERS => key.startsWith("main:"))
  .map((key) => key.slice("main:".length))
  .filter(isMainResourceFileName)
  .sort();

const tryReadPublicText = async (resourcePath: string): Promise<string | null> => {
  try {
    return await loadPublicText(resourcePath);
  } catch {
    return null;
  }
};

const assertLocalResourceExists = async (resourcePath: string): Promise<void> => {
  assert.ok(resourcePath.startsWith("/"), `Expected local resource path, got: ${resourcePath}`);
  await assert.doesNotReject(() => loadPublicText(resourcePath));
};

const readPublicYamlText = async (resourcePath: string): Promise<string> => {
  return await loadPublicText(resourcePath);
};

const api = createYamlApi(readPublicYamlText, {
  state: createYamlApiState(),
});

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "[Config/Validation] YAML 路由配置规则 -> 应当确保主源必填，且备用源与主源成对出现",
    run: async () => {
      const yamlUrl = await loadPublicJson<YamlUrlConfig>("data/config/yamlUrl.json");
      assert.ok(yamlUrl);

      for (const [type, item] of Object.entries(yamlUrl)) {
        assert.ok(hasValue(item.url), `${type}.url must exist`);

        if (hasValue(item.spareUrl)) {
          assert.ok(hasValue(item.url), `${type}.spareUrl requires ${type}.url`);
        }

        if (hasValue(item.spareListUrl)) {
          assert.ok(hasValue(item.listUrl), `${type}.spareListUrl requires ${type}.listUrl`);
        }
      }

      assert.ok(isHttpUrl(yamlUrl.blog.url));
      assert.ok(isHttpUrl(yamlUrl.blog.listUrl));
      assert.equal(yamlUrl.main.url, "/data/main/");
    },
  },
  {
    name: "[Data/BlogSpare] 博客本地备用源 -> 若配置存在，应当验证所有本地 DSL 文件均可解析且结构正确",
    run: async () => {
      const yamlUrl = await loadPublicJson<YamlUrlConfig>("data/config/yamlUrl.json");
      assert.ok(yamlUrl);
      const spareListPath = yamlUrl.blog.spareListUrl;
      const spareBasePath = yamlUrl.blog.spareUrl;

      if (!hasValue(spareListPath) || !hasValue(spareBasePath)) {
        console.warn(
          "[Test Warning] blog spare source is not configured; skip local spare validation.",
        );
        return;
      }

      const spareListText = await tryReadPublicText(spareListPath);
      if (!spareListText) {
        console.warn(`[Test Warning] blog spare list is unavailable: ${spareListPath}`);
        return;
      }

      const fileNames = JSON.parse(spareListText) as string[];
      assert.ok(fileNames.length > 0);

      for (const fileName of fileNames) {
        const resourcePath = `${spareBasePath}${fileName}`;
        const text = await tryReadPublicText(resourcePath);
        if (!text) {
          console.warn(`[Test Warning] blog spare post is unavailable: ${resourcePath}`);
          return;
        }
      }

      const posts = await api.loadAllPosts<LocalBlogPost>("blog");

      assert.equal(posts.length, fileNames.length);
      for (const post of posts) {
        assert.equal(typeof post.title, "string");
        assert.equal(typeof post.time, "string");
        assert.ok(Array.isArray(post.blocks));
        assert.ok(post.blocks.length > 0);
      }
    },
  },
  {
    name: "[Data/MainDSL] Main 本地资源完整性 -> 应当确保所有单文件 DSL 真实存在且能成功解析",
    run: async () => {
      const yamlUrl = await loadPublicJson<YamlUrlConfig>("data/config/yamlUrl.json");
      assert.ok(yamlUrl);
      const mainBasePath = yamlUrl.main.url;

      await Promise.all(
        MAIN_SINGLE_RESOURCE_FILES.map(async (fileName) =>
          assertLocalResourceExists(`${mainBasePath}${fileName}`),
        ),
      );

      await Promise.all(
        MAIN_SINGLE_RESOURCE_FILES.map(async (fileName) => {
          const result = await api.loadSingleYaml("main", fileName);
          MAIN_RESOURCE_ASSERTIONS[fileName](result);
        }),
      );
    },
  },
  {
    name: "[Data/JSON] 静态 JSON 配置 -> 应当验证 webTitle/socialLinks/person/colorData 等文件真实存在且非空",
    run: async () => {
      const [webTitle, socialLinks, person, colorData] = await Promise.all([
        loadPublicJson<Record<string, Record<string, string>>>("data/main/webTitle.json"),
        loadPublicJson<Record<string, unknown>>("data/config/socialLinks.json"),
        loadPublicJson<Record<string, unknown>>("data/main/person.json"),
        loadPublicJson<Record<string, unknown>>("data/config/colorData.json"),
      ]);

      assert.ok(webTitle);
      assert.ok(socialLinks);
      assert.ok(person);
      assert.ok(colorData);
      assert.ok(Object.keys(webTitle).length > 0);
      assert.ok(Object.keys(socialLinks).length > 0);
      assert.ok(Object.keys(person).length > 0);
      assert.ok(Object.keys(colorData).length > 0);
    },
  },
];

await runGoldenCases("Local Public Data", "本地资源 golden case", cases);
