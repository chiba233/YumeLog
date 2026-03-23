// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import { resolveLazyBlockInitialState } from "../src/features/blog/lib/lazyBlockCore.ts";
import { getDescriptionTextWithStripper } from "../src/shared/lib/app/useGlobalState.ts";
import type { PostBlock, TextPostBlock } from "../src/shared/types/blog.ts";
import type { TextToken } from "../src/shared/lib/dsl/BlogRichText/types.ts";
import { runGoldenCases } from "./testHarness";
import { loadTestJsonFixture } from "./testFixtures.ts";

interface LazyRenderingFixture {
  initial: {
    block: {
      content: string;
      temp_id: string;
    };
    parsedTokens: TextToken[];
    expectedState: {
      tokens: [];
      parsed: boolean;
    };
    expectedParseCalls: number;
  };
  summary: {
    blocks: Array<{
      content: string;
      temp_id: string;
    }>;
    limit: number;
    expectedSummary: string;
    expectedCalls: string[];
  };
}

const fixture = await loadTestJsonFixture<LazyRenderingFixture>("lazyRendering.golden.json");

const makeTextBlock = (content: string, temp_id: string, tokens?: TextToken[]): TextPostBlock => ({
  type: "text",
  content,
  temp_id,
  tokens,
});

const cases: Array<{ name: string; run: () => void }> = [
  {
    name: "[Lazy/Initial] 客户端初次渲染 -> 非 SSR 且无缓存时应当返回空 tokens 占位并标记未解析",
    run: () => {
      let parseCalls = 0;
      const state = resolveLazyBlockInitialState(
        makeTextBlock(fixture.initial.block.content, fixture.initial.block.temp_id),
        false,
        [],
        () => {
          parseCalls++;
          return fixture.initial.parsedTokens;
        },
      );

      assert.deepEqual(state, fixture.initial.expectedState);
      assert.equal(parseCalls, fixture.initial.expectedParseCalls);
    },
  },
  {
    name: "[Summary/Limit] 文本摘要提取 -> 达到目标长度后应当停止消费后续块以优化性能",
    run: () => {
      const calls: string[] = [];
      const blocks: PostBlock[] = fixture.summary.blocks.map((block) =>
        makeTextBlock(block.content, block.temp_id),
      );

      const summary = getDescriptionTextWithStripper(blocks, fixture.summary.limit, (content) => {
        calls.push(content);
        return content;
      });

      assert.equal(summary, fixture.summary.expectedSummary);
      assert.deepEqual(calls, fixture.summary.expectedCalls);
    },
  },
];

await runGoldenCases("Lazy Rendering", " Lazy rendering golden case", cases);
