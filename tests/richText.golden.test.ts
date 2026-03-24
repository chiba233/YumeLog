// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import dayjs from "dayjs";
import { parseRichText, stripRichText } from "../src/shared/lib/dsl/BlogRichText/blogFormat.ts";
import type { TextToken } from "../src/shared/lib/dsl/BlogRichText/types.ts";
import { runGoldenCases } from "./testHarness";
import { loadTestJsonFixture } from "./testFixtures.ts";

type CapturedMessage = {
  content: string;
  closable: boolean;
  duration: number;
};

type CapturedMessageState = {
  errors: CapturedMessage[];
  warnings: CapturedMessage[];
  successes: CapturedMessage[];
  infos: CapturedMessage[];
  loadings: CapturedMessage[];
};

declare global {
  var __codexTestMessageState: CapturedMessageState | undefined;
}

const getCapturedMessageState = (): CapturedMessageState => {
  const state = globalThis.__codexTestMessageState;
  if (!state) {
    throw new Error("Captured message state is not initialized");
  }

  return state;
};

const resetCapturedMessages = () => {
  const state = getCapturedMessageState();
  state.errors.length = 0;
  state.warnings.length = 0;
  state.successes.length = 0;
  state.infos.length = 0;
  state.loadings.length = 0;
};

const normalizeTokens = (tokens: TextToken[]): unknown[] => {
  return tokens.map((token) => {
    const { temp_id: _tempId, value, ...rest } = token;

    return {
      ...rest,
      value: typeof value === "string" ? value : normalizeTokens(value),
    };
  });
};

const createDeterministicDirtyText = (
  seed: number,
  parts: readonly string[],
  length: number,
): string => {
  let state = seed >>> 0;
  let output = "";

  for (let i = 0; i < length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    output += parts[state % parts.length];
  }

  return output;
};

const createDeterministicNumbers = (
  seed: number,
  count: number,
  minInclusive: number,
  maxInclusive: number,
): number[] => {
  let state = seed >>> 0;
  const values: number[] = [];
  const span = maxInclusive - minInclusive + 1;

  for (let i = 0; i < count; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    values.push(minInclusive + (state % span));
  }

  return values;
};

const formatIsoDay = (base: string, offsetDays: number): string =>
  dayjs(base).add(offsetDays, "day").format("YYYY-MM-DD");

const formatIsoInstant = (base: string, offsetDays: number): string =>
  dayjs(base).add(offsetDays, "day").toISOString();

interface RichTextCommonFixture {
  commonCases: Array<{
    name: string;
    mode: "parse" | "strip";
    input: string;
    depth?: number;
    richTextEnabled?: boolean;
    expectedTokens?: unknown[];
    expectedText?: string;
  }>;
  pipeCases: Array<{
    input: string;
    expectedTitle: string;
    expectedValue: unknown[];
  }>;
}

const commonFixture = await loadTestJsonFixture<RichTextCommonFixture>("richText.common.json");

interface RichTextInlineFixture {
  inlineCases: Array<{
    name: string;
    mode: "parse" | "strip";
    input: string;
    expectedTokens?: unknown[];
    expectedText?: string;
  }>;
}

const inlineFixture = await loadTestJsonFixture<RichTextInlineFixture>("richText.inline.json");

interface RichTextRawBlockFixture {
  cases: Array<{
    name: string;
    mode: "parse" | "strip";
    input: string;
    expectedTokens?: unknown[];
    expectedText?: string;
  }>;
}

const rawBlockFixture =
  await loadTestJsonFixture<RichTextRawBlockFixture>("richText.rawBlock.json");

const commonCases = commonFixture.commonCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    if (testCase.mode === "strip") {
      assert.equal(stripRichText(testCase.input), testCase.expectedText);
      return;
    }

    const tokens = parseRichText(
      testCase.input,
      testCase.depth ?? 50,
      testCase.richTextEnabled ?? true,
    );
    assert.deepEqual(normalizeTokens(tokens), testCase.expectedTokens);
  },
}));

const inlineFixtureCases = inlineFixture.inlineCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    if (testCase.mode === "strip") {
      assert.equal(stripRichText(testCase.input), testCase.expectedText);
      return;
    }

    const tokens = parseRichText(testCase.input, 50, true);
    assert.deepEqual(normalizeTokens(tokens), testCase.expectedTokens);
  },
}));

const rawBlockFixtureCases = rawBlockFixture.cases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    if (testCase.mode === "strip") {
      assert.equal(stripRichText(testCase.input), testCase.expectedText);
      return;
    }

    const tokens = parseRichText(testCase.input, 50, true);
    assert.deepEqual(normalizeTokens(tokens), testCase.expectedTokens);
  },
}));

const cases: Array<{ name: string; run: () => void }> = [
  // --- [Common] 核心与通用逻辑 ---
  ...commonCases,
  {
    name: "[Common/Pipe] 管道符周围空格消费行为 -> 应当吞掉右侧空格并由处理器 trim 左侧",
    run: () => {
      commonFixture.pipeCases.forEach((pipeCase) => {
        const [token] = parseRichText(pipeCase.input, 50, true);
        assert.equal(token.title, pipeCase.expectedTitle);
        if (!Array.isArray(token.value)) throw new Error("value should be array");
        assert.deepEqual(normalizeTokens(token.value), pipeCase.expectedValue);
      });
    },
  },
  {
    name: "[Common/Hybrid] raw/block/inline 混合边界 -> 应当严格保持声明顺序与树状结构",
    run: () => {
      const tokens = parseRichText(
        "$$collapse(A)*\n$$raw-code(ts)%\nconst a = 1\n%end$$\n$$bold(x)$$\n*end$$",
        50,
        true,
      );

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "collapse",
          title: "A",
          value: [
            {
              type: "raw-code",
              codeLang: "typescript",
              title: "Code:",
              label: "",
              value: "const a = 1\n",
            },
            {
              type: "bold",
              value: [{ type: "text", value: "x" }],
            },
            { type: "text", value: "\n" },
          ],
        },
      ]);
    },
  },
  {
    name: "[Common/Robustness] 随机脏输入压力测试 -> 解析器应当永不崩溃并保持输出稳定",
    run: () => {
      const parts = [
        "$$bold(",
        "$$thin(",
        "$$unknown(",
        "$$collapse(T)*\n",
        "$$raw-code(ts)%\n",
        ")$$",
        "*end$$",
        "%end$$",
        "\\)$$",
        "\\%end$$",
        "@text\n",
        "@end\n",
        "|",
        "(",
        ")",
        "\n",
        "hello",
        "世界",
        " ",
      ] as const;

      for (let seed = 1; seed <= 80; seed++) {
        const source = createDeterministicDirtyText(seed, parts, 24);

        assert.doesNotThrow(() => {
          const tokens = parseRichText(source, 4, true);
          assert.ok(Array.isArray(tokens));
          assert.equal(typeof stripRichText(source), "string");
        });
      }
    },
  },

  // --- [Inline] 行内标签相关 ---
  {
    name: "[Inline/Date] date 标签自定义格式与语言 -> 应当保留运行时渲染所需参数",
    run: () => {
      const tokens = parseRichText("$$date(2024-01-02|YYYY/MM/DD|en)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        { type: "date", date: "2024-01-02", format: "YYYY/MM/DD", timeLang: "en", value: "" },
      ]);
    },
  },
  {
    name: "[Inline/Date] date 标签省略 format -> 应当保留日期与语言，交给运行时格式化",
    run: () => {
      const offsets = createDeterministicNumbers(42, 24, 0, 3650);

      offsets.forEach((offset) => {
        const date = formatIsoDay("2020-01-01", offset);
        const tokens = parseRichText(`$$date(${date}||th)$$`, 50, true);

        assert.deepEqual(normalizeTokens(tokens), [
          { type: "date", date, format: undefined, timeLang: "th", value: "" },
        ]);
      });
    },
  },
  {
    name: "[Inline/Time] fromNow 标签带语言参数 -> 应当保留运行时相对时间参数",
    run: () => {
      const baseNow = "2026-03-23T00:00:00.000Z";
      const offsets = createDeterministicNumbers(7, 20, -400, 400);

      offsets.forEach((offset) => {
        const date = formatIsoInstant(baseNow, offset);
        const tokens = parseRichText(`$$fromNow(${date}|en)$$`, 50, true);

        assert.deepEqual(normalizeTokens(tokens), [
          { type: "fromNow", date, timeLang: "en", value: "" },
        ]);
      });
    },
  },
  {
    name: "[Inline/Basic] 基础标签 -> 应当生成正确的嵌套 token 结构",
    run: () => {
      const tokens = parseRichText("$$bold(Hello)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "bold",
          value: [{ type: "text", value: "Hello" }],
        },
      ]);
    },
  },
  ...inlineFixtureCases,
  {
    name: "[Inline/Variety] 多种 inline 标签并存 -> 应当生成对应的各类型 token",
    run: () => {
      const tokens = parseRichText(
        "$$thin(x)$$ $$underline(y)$$ $$strike(z)$$ $$code(k)$$",
        50,
        true,
      );

      assert.deepEqual(normalizeTokens(tokens), [
        { type: "thin", value: [{ type: "text", value: "x" }] },
        { type: "text", value: " " },
        { type: "underline", value: [{ type: "text", value: "y" }] },
        { type: "text", value: " " },
        { type: "strike", value: [{ type: "text", value: "z" }] },
        { type: "text", value: " " },
        { type: "code", value: [{ type: "text", value: "k" }] },
      ]);
    },
  },
  {
    name: "[Inline/Error] 未闭合 inline 标签 -> 应当上报 inline 错误并带上下文",
    run: () => {
      resetCapturedMessages();

      parseRichText("line1\n$$bold(hello", 50, false);

      const messageState = getCapturedMessageState();

      assert.equal(messageState.errors.length, 1);
      assert.equal(messageState.errors[0]?.closable, true);
      assert.equal(messageState.errors[0]?.duration, 5000);
      assert.match(messageState.errors[0]?.content ?? "", /^\(L2:C1\) Inline tag not closed:/);
      assert.match(messageState.errors[0]?.content ?? "", />>>\$\$bold\(<<< hello$/);
    },
  },
  {
    name: "[Inline/Specific] center 标签 -> 应当仅作为 inline 解析并生成正确 token",
    run: () => {
      const tokens = parseRichText("$$center(hello)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "center",
          value: [{ type: "text", value: "hello" }],
        },
      ]);
    },
  },
  {
    name: "[Inline/Unknown] 未知标签 -> stripRichText 应当去壳并保留内部纯文本",
    run: () => {
      assert.equal(stripRichText("$$unknown(hello world)$$"), "hello world");
    },
  },
  {
    name: "[Inline/Unknown] 未知标签嵌套 -> 去壳时应当递归保留内部的 known 标签",
    run: () => {
      const tokens = parseRichText("$$unknown(hello $$bold(world)$$)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        { type: "text", value: "hello " },
        {
          type: "bold",
          value: [{ type: "text", value: "world" }],
        },
      ]);
    },
  },
  {
    name: "[Inline/Unknown] 未知标签 -> 应当 fallback 但不产生 runtime 错误",
    run: () => {
      resetCapturedMessages();

      const text = stripRichText("$$unknown(hello world)$$");
      parseRichText("$$unknown(hello world)$$", 50, false);
      const messageState = getCapturedMessageState();

      assert.equal(text, "hello world");
      assert.equal(messageState.errors.length, 0);
    },
  },
  {
    name: "[Inline/Nested] 多层 inline 嵌套 -> 应当正确保持文本与子节点的相对顺序",
    run: () => {
      const tokens = parseRichText("$$bold(outer $$thin(inner)$$ tail)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "bold",
          value: [
            { type: "text", value: "outer " },
            {
              type: "thin",
              value: [{ type: "text", value: "inner" }],
            },
            { type: "text", value: " tail" },
          ],
        },
      ]);
    },
  },

  // --- [Raw] Code/Raw 语法相关 ---
  {
    name: "[Raw/Code] 基础 raw-code -> 应当保留正文原始格式并归一化语言别名",
    run: () => {
      const tokens = parseRichText("$$raw-code(js | demo)%\nconst a = 1\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "raw-code",
          codeLang: "typescript",
          title: "demo",
          label: "",
          value: "const a = 1\n",
        },
      ]);
    },
  },
  ...rawBlockFixtureCases,
  {
    name: "[Raw/Escape] 内容中包含转义闭合符 -> 应当保留闭合符并继续解析到末尾",
    run: () => {
      const tokens = parseRichText("$$raw-code(ts | Demo | Label)%\na\\%end$$\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "raw-code",
          codeLang: "typescript",
          title: "Demo",
          label: "Label",
          value: "a%end$$\n",
        },
      ]);
    },
  },
  {
    name: "[Raw/Boundary] 空 raw-code (无正文段) -> 应当退化为普通文本处理",
    run: () => {
      assert.equal(stripRichText("$$raw-code()%%end$$"), "$$raw-code()%%end$$");
    },
  },
  {
    name: "[Raw/Boundary] 未闭合 raw 标签 -> 应当退化为普通文本",
    run: () => {
      assert.equal(stripRichText("$$raw-code(ts)%\nconst a = 1"), "$$raw-code(ts)%\nconst a = 1");
    },
  },
  {
    name: "[Raw/Boundary] close 行格式错误 -> 应当 fallback 并上报独立 malformed close 错误",
    run: () => {
      resetCapturedMessages();

      parseRichText("$$raw-code(ts)%\nconst a = 1\n  %end$$", 50, false);
      const messageState = getCapturedMessageState();

      assert.equal(
        stripRichText("$$raw-code(ts)%\nconst a = 1\n  %end$$"),
        "$$raw-code(ts)%\nconst a = 1\n  %end$$",
      );
      assert.equal(messageState.errors.length, 1);
      assert.match(messageState.errors[0]?.content ?? "", /^\(L3:C3\) Malformed raw close:/);
      assert.doesNotMatch(messageState.errors[0]?.content ?? "", /Raw block not closed/);
      assert.match(messageState.errors[0]?.content ?? "", />>>%end\$\$<</);
    },
  },
  {
    name: "[Raw/Unknown] 未知 raw 语法 -> 应当整体退化为普通文本",
    run: () => {
      assert.equal(
        stripRichText("$$unknown(title)%\nhello\n%end$$"),
        "$$unknown(title)%\nhello\n%end$$",
      );
    },
  },
  {
    name: "[Raw/Morph] info 的 raw 形态 -> 应当生成带对应标题的富文本块 token",
    run: () => {
      const tokens = parseRichText("$$info(标题)%\n正文\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "info",
          title: "标题",
          value: [{ type: "text", value: "正文\n" }],
        },
      ]);
    },
  },
  {
    name: "[Raw/Morph] warning 的 raw 形态 -> 应当生成带对应标题的富文本块 token",
    run: () => {
      const tokens = parseRichText("$$warning(标题)%\n正文\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "warning",
          title: "标题",
          value: [{ type: "text", value: "正文\n" }],
        },
      ]);
    },
  },
  {
    name: "[Raw/Morph] collapse 的 raw 形态 -> 应当生成带对应标题的富文本块 token",
    run: () => {
      const tokens = parseRichText("$$collapse(标题)%\n正文\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "collapse",
          title: "标题",
          value: [{ type: "text", value: "正文\n" }],
        },
      ]);
    },
  },
  {
    name: "[Raw/Degrade] 仅支持 inline 的标签使用 raw 语法 -> 应当整体退化为文本",
    run: () => {
      assert.equal(stripRichText("$$center(标题)%\n正文\n%end$$"), "$$center(标题)%\n正文\n%end$$");
    },
  },

  {
    name: "[Block/Boundary] close 行格式错误 -> 应当 fallback 并上报独立 malformed close 错误",
    run: () => {
      resetCapturedMessages();

      parseRichText("$$collapse(Title)*\nhello\n  *end$$", 50, false);
      const messageState = getCapturedMessageState();

      assert.equal(
        stripRichText("$$collapse(Title)*\nhello\n  *end$$"),
        "$$collapse(Title)*\nhello\n  *end$$",
      );
      assert.equal(messageState.errors.length, 1);
      assert.match(messageState.errors[0]?.content ?? "", /^\(L3:C3\) Malformed block close:/);
      assert.doesNotMatch(messageState.errors[0]?.content ?? "", /Block tag not closed/);
      assert.match(messageState.errors[0]?.content ?? "", />>>\*end\$\$<</);
    },
  },
];

await runGoldenCases("Rich Text DSL", " Rich Text golden case", cases);
