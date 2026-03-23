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
import { runGoldenCases } from "./testHarness";
import { loadTestJsonFixture } from "./testFixtures.ts";

interface AppModulesUnitFixture {
  langPreference: {
    options: string[];
    fallbackOptions: string[];
    cases: Array<{
      currentLang: string;
      rawLang: string;
      expected: string;
    }>;
    fallbackCase: {
      currentLang: string;
      rawLang: string;
      expected: string;
    };
  };
  formatting: {
    unknownLang: string;
    sampleDate: string;
    relativeTimePattern: string;
    thaiYearPattern: string;
  };
  postCache: {
    type: string;
    initialNow: number;
    ttlAdvance: number;
    expectedTitles: string[];
    expectedCalls: number;
  };
  singleCache: {
    postType: string;
    resource: {
      type: string;
      fileName: string;
    };
    initialNow: number;
    ttlAdvance: number;
    loadedPost: {
      time: string;
      title: string;
    };
    expectedPostCalls: number;
    expectedSingleSeqs: number[];
  };
  router: {
    expectedRoutes: Array<{
      path: string;
      name: string | null;
      redirect: { path: string; query: Record<string, string> } | null;
    }>;
    paths: {
      home: string;
      blog: string;
      missing: string;
    };
    expectedBlogParams: Record<string, string>;
    expectedMissingMatchedPaths: string[];
  };
}

const fixture = await loadTestJsonFixture<AppModulesUnitFixture>("appModules.unit.json");

const langOptions = (values: string[]): SelectOption[] =>
  values.map((value) => ({ label: value, value }));

const normalizeRoute = (route: (typeof routes)[number]) => ({
  path: route.path,
  name: route.name ?? null,
  redirect: route.redirect ?? null,
});

const cases: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: "[Lang/Preference] 语言协商逻辑 -> 应当优先保留合法当前语言，并按 raw/en 顺序处理回退",
    run: () => {
      for (const testCase of fixture.langPreference.cases) {
        assert.equal(
          resolvePreferredLang(
            langOptions(fixture.langPreference.options),
            testCase.currentLang,
            testCase.rawLang,
          ),
          testCase.expected,
        );
      }

      assert.equal(
        resolvePreferredLang(
          langOptions(fixture.langPreference.fallbackOptions),
          fixture.langPreference.fallbackCase.currentLang,
          fixture.langPreference.fallbackCase.rawLang,
        ),
        fixture.langPreference.fallbackCase.expected,
      );
    },
  },
  {
    name: "[Lang/Format] 日期时间格式化 -> 应当在未知语言时回退英文，并能正确处理泰语佛历年份",
    run: () => {
      assert.equal(resolveLocale(fixture.formatting.unknownLang), "en-au");
      assert.equal(formatTimeByLang("en", undefined), "error");
      assert.equal(formatDateByLang("en", undefined), "error");
      assert.match(
        formatTimeByLang("en", fixture.formatting.sampleDate),
        new RegExp(fixture.formatting.relativeTimePattern),
      );
      assert.match(
        formatDateByLang("th", fixture.formatting.sampleDate),
        new RegExp(fixture.formatting.thaiYearPattern),
      );
    },
  },
  {
    name: "[Cache/Posts] 博客列表缓存 -> 应当在 TTL 内命中缓存，并在过期或 force 时触发重新拉取",
    run: async () => {
      let now = fixture.postCache.initialNow;
      let calls = 0;
      const store = createContentStore({
        now: () => now,
        loadAllPosts: async (type) => {
          calls++;
          return [{ time: String(calls), title: `${type}-${calls}` }];
        },
        loadSingleYaml: async () => null,
      });

      const first = await store.getPosts<{ time: string; title: string }>(fixture.postCache.type);
      const second = await store.getPosts<{ time: string; title: string }>(fixture.postCache.type);
      now += fixture.postCache.ttlAdvance;
      const third = await store.getPosts<{ time: string; title: string }>(fixture.postCache.type);
      const forced = await store.getPosts<{ time: string; title: string }>(
        fixture.postCache.type,
        true,
      );

      assert.deepEqual(
        [first[0]?.title, second[0]?.title, third[0]?.title, forced[0]?.title],
        fixture.postCache.expectedTitles,
      );
      assert.equal(calls, fixture.postCache.expectedCalls);
    },
  },
  {
    name: "[Cache/Single] 单文件与空数据缓存 -> 不应当缓存空列表，并应当正确缓存非空单文件解析结果",
    run: async () => {
      let now = fixture.singleCache.initialNow;
      let postCalls = 0;
      let singleCalls = 0;
      const store = createContentStore({
        now: () => now,
        loadAllPosts: async () => {
          postCalls++;
          return postCalls === 1 ? [] : [fixture.singleCache.loadedPost];
        },
        loadSingleYaml: async (type, fileName) => {
          singleCalls++;
          return { type, fileName, seq: singleCalls };
        },
      });

      const empty = await store.getPosts<{ time: string; title: string }>(
        fixture.singleCache.postType,
      );
      const loaded = await store.getPosts<{ time: string; title: string }>(
        fixture.singleCache.postType,
      );
      const singleA = await store.getSingle<{ seq: number }>(
        fixture.singleCache.resource.type,
        fixture.singleCache.resource.fileName,
      );
      const singleB = await store.getSingle<{ seq: number }>(
        fixture.singleCache.resource.type,
        fixture.singleCache.resource.fileName,
      );
      now += fixture.singleCache.ttlAdvance;
      const singleC = await store.getSingle<{ seq: number }>(
        fixture.singleCache.resource.type,
        fixture.singleCache.resource.fileName,
      );

      assert.deepEqual(empty, []);
      assert.equal(loaded[0]?.title, fixture.singleCache.loadedPost.title);
      assert.equal(postCalls, fixture.singleCache.expectedPostCalls);
      assert.deepEqual(
        [singleA?.seq, singleB?.seq, singleC?.seq],
        fixture.singleCache.expectedSingleSeqs,
      );
    },
  },
  {
    name: "[Router/Resolve] 路由解析稳定性 -> 应当确保路由表定义正确，且 memory router 能准确识别路径",
    run: () => {
      assert.deepEqual(routes.map(normalizeRoute), fixture.router.expectedRoutes);

      const router = createAppRouter(true);
      const home = router.resolve(fixture.router.paths.home);
      const blog = router.resolve(fixture.router.paths.blog);
      const miss = router.resolve(fixture.router.paths.missing);

      assert.equal(home.name, "home");
      assert.equal(blog.name, "blog");
      assert.deepEqual(blog.params, fixture.router.expectedBlogParams);
      assert.deepEqual(
        miss.matched.map((record) => record.path),
        fixture.router.expectedMissingMatchedPaths,
      );
    },
  },
];

await runGoldenCases("App Modules Unit", " App module unit case", cases);
