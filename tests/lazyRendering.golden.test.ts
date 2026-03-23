// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import { resolveLazyBlockInitialState } from "../src/features/blog/lib/lazyBlockCore.ts";
import { getDescriptionTextWithStripper } from "../src/shared/lib/app/useGlobalState.ts";
import type { PostBlock, TextPostBlock } from "../src/shared/types/blog.ts";
import type { TextToken } from "../src/shared/lib/dsl/BlogRichText/types.ts";
import { runGoldenCases } from "./testHarness";

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
        makeTextBlock("**hello**", "block-1"),
        false,
        [],
        () => {
          parseCalls++;
          return [{ type: "text", value: "hello", temp_id: "token-1" }] as TextToken[];
        },
      );

      assert.deepEqual(state, {
        tokens: [],
        parsed: false,
      });
      assert.equal(parseCalls, 0);
    },
  },
  {
    name: "[Summary/Limit] 文本摘要提取 -> 达到目标长度后应当停止消费后续块以优化性能",
    run: () => {
      const calls: string[] = [];
      const blocks: PostBlock[] = [
        makeTextBlock("first block", "block-1"),
        makeTextBlock("second block", "block-2"),
        makeTextBlock("third block should not be touched", "block-3"),
      ];

      const summary = getDescriptionTextWithStripper(blocks, 12, (content) => {
        calls.push(content);
        return content;
      });

      assert.equal(summary, "first block...");
      assert.deepEqual(calls, ["first block", "second block"]);
    },
  },
];

await runGoldenCases("Lazy Rendering", " Lazy rendering golden case", cases);
