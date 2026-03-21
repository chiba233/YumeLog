// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import { createContentStore } from "../src/components/ts/global/contentStore.ts";
import {
  formatDateByLang,
  formatTimeByLang,
  resolveLocale,
  resolvePreferredLang,
} from "../src/components/ts/global/langCore.ts";
import { createAppRouter, routes } from "../src/router/index.ts";
import type { SelectOption } from "../src/components/ts/d.ts";

const langOptions = (values: string[]): SelectOption[] =>
  values.map((value) => ({ label: value, value }));

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "语言选择会保留当前合法语言并按 raw en first 顺序回退",
    run: () => {
      assert.equal(resolvePreferredLang(langOptions(["en", "ja"]), "ja", "zh"), "ja");
      assert.equal(resolvePreferredLang(langOptions(["en", "ja"]), "zh", "ja"), "ja");
      assert.equal(resolvePreferredLang(langOptions(["en", "ja"]), "zh", "ko"), "en");
      assert.equal(resolvePreferredLang(langOptions(["th", "ja"]), "zh", "ko"), "th");
    },
  },
  {
    name: "语言格式化会在未知语言时回退英文并处理泰语佛历",
    run: () => {
      assert.equal(resolveLocale("unknown"), "en-au");
      assert.equal(formatTimeByLang("en", undefined), "error");
      assert.equal(formatDateByLang("en", undefined), "error");
      assert.match(formatTimeByLang("en", "2024-01-01"), /\byear|\bmonth|\bday/);
      assert.match(formatDateByLang("th", "2024-01-01"), /2567/);
    },
  },
  {
    name: "内容缓存会命中 TTL 并在过期或 force 时重新拉取 posts",
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
    name: "内容缓存不会缓存空 posts 且会缓存非空 single 结果",
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
      const singleA = await store.getSingle<{ seq: number }>("main", "title.dsl");
      const singleB = await store.getSingle<{ seq: number }>("main", "title.dsl");
      now += 601_000;
      const singleC = await store.getSingle<{ seq: number }>("main", "title.dsl");

      assert.deepEqual(empty, []);
      assert.equal(loaded[0]?.title, "loaded");
      assert.equal(postCalls, 2);
      assert.equal(singleA?.seq, 1);
      assert.equal(singleB?.seq, 1);
      assert.equal(singleC?.seq, 2);
    },
  },
  {
    name: "路由表和 memory router resolve 结果稳定",
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
  console.log(`PASS ${cases.length} 个 App module golden case`);
}
