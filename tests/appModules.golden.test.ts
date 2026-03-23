// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import { createContentStore } from "../src/shared/lib/app/contentStore.ts";
import {
  formatDateByLang,
  formatTimeByLang,
  resolveLocale,
  resolvePreferredLang,
} from "../src/shared/lib/app/langCore.ts";
import { createAppRouter, routes } from "../src/app/router/index.ts";
import type { SelectOption } from "../src/shared/types/common.ts";
import { MAIN_CONTENT_RESOURCES } from "../src/shared/lib/app/mainContentResources.ts";
import { runGoldenCases } from "./testHarness";

const langOptions = (values: string[]): SelectOption[] =>
  values.map((value) => ({ label: value, value }));
const titleResource = MAIN_CONTENT_RESOURCES.title;

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "[Lang/Preference] 语言协商逻辑 -> 应当优先保留合法当前语言，并按 raw/en 顺序处理回退",
    run: () => {
      assert.equal(resolvePreferredLang(langOptions(["en", "ja"]), "ja", "zh"), "ja");
      assert.equal(resolvePreferredLang(langOptions(["en", "ja"]), "zh", "ja"), "ja");
      assert.equal(resolvePreferredLang(langOptions(["en", "ja"]), "zh", "ko"), "en");
      assert.equal(resolvePreferredLang(langOptions(["th", "ja"]), "zh", "ko"), "th");
    },
  },
  {
    name: "[Lang/Format] 日期时间格式化 -> 应当在未知语言时回退英文，并能正确处理泰语佛历年份",
    run: () => {
      assert.equal(resolveLocale("unknown"), "en-au");
      assert.equal(formatTimeByLang("en", undefined), "error");
      assert.equal(formatDateByLang("en", undefined), "error");
      assert.match(formatTimeByLang("en", "2024-01-01"), /\byear|\bmonth|\bday/);
      assert.match(formatDateByLang("th", "2024-01-01"), /2567/);
    },
  },
  {
    name: "[Cache/Posts] 博客列表缓存 -> 应当在 TTL 内命中缓存，并在过期或 force 时触发重新拉取",
    run: async () => {
      let now = 1_000;
      let calls = 0;
      const store = createContentStore({
        now: () => now,
        loadAllPosts: async (type) => {
          calls++;
          return [{ time: String(calls), title: `${type}-${calls}` }];
        },
        loadSingleYaml: async () => null,
      });

      const first = await store.getPosts<{ time: string; title: string }>("blog");
      const second = await store.getPosts<{ time: string; title: string }>("blog");
      now += 601_000;
      const third = await store.getPosts<{ time: string; title: string }>("blog");
      const forced = await store.getPosts<{ time: string; title: string }>("blog", true);

      assert.deepEqual(
        [first[0]?.title, second[0]?.title, third[0]?.title, forced[0]?.title],
        ["blog-1", "blog-1", "blog-2", "blog-3"],
      );
      assert.equal(calls, 3);
    },
  },
  {
    name: "[Cache/Single] 单文件与空数据缓存 -> 不应当缓存空列表，并应当正确缓存非空单文件解析结果",
    run: async () => {
      let now = 1_000;
      let postCalls = 0;
      let singleCalls = 0;
      const store = createContentStore({
        now: () => now,
        loadAllPosts: async () => {
          postCalls++;
          return postCalls === 1 ? [] : [{ time: "20240101", title: "loaded" }];
        },
        loadSingleYaml: async (type, fileName) => {
          singleCalls++;
          return { type, fileName, seq: singleCalls };
        },
      });

      const empty = await store.getPosts<{ time: string; title: string }>("blog");
      const loaded = await store.getPosts<{ time: string; title: string }>("blog");
      const singleA = await store.getSingle<{ seq: number }>(
        titleResource.type,
        titleResource.fileName,
      );
      const singleB = await store.getSingle<{ seq: number }>(
        titleResource.type,
        titleResource.fileName,
      );
      now += 601_000;
      const singleC = await store.getSingle<{ seq: number }>(
        titleResource.type,
        titleResource.fileName,
      );

      assert.deepEqual(empty, []);
      assert.equal(loaded[0]?.title, "loaded");
      assert.equal(postCalls, 2);
      assert.equal(singleA?.seq, 1);
      assert.equal(singleB?.seq, 1);
      assert.equal(singleC?.seq, 2);
    },
  },
  {
    name: "[Router/Resolve] 路由解析稳定性 -> 应当确保路由表定义正确，且 memory router 能准确识别路径",
    run: () => {
      assert.deepEqual(
        routes.map((route) => ({
          path: route.path,
          name: route.name,
          redirect: route.redirect,
        })),
        [
          { path: "/", name: "home", redirect: undefined },
          { path: "/blog/:id?", name: "blog", redirect: undefined },
          {
            path: "/:pathMatch(.*)*",
            name: undefined,
            redirect: { path: "/", query: { invalid: "1" } },
          },
        ],
      );

      const router = createAppRouter(true);
      const home = router.resolve("/");
      const blog = router.resolve("/blog/abc");
      const miss = router.resolve("/missing");

      assert.equal(home.name, "home");
      assert.equal(blog.name, "blog");
      assert.deepEqual(blog.params, { id: "abc" });
      assert.deepEqual(
        miss.matched.map((record) => record.path),
        ["/:pathMatch(.*)*"],
      );
    },
  },
];

await runGoldenCases("App Modules", " App module golden case", cases);
