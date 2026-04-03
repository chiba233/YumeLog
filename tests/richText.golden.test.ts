// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import { parseRichText, stripRichText } from "../src/shared/lib/dsl/BlogRichText/blogFormat.ts";
import type { TextToken } from "../src/shared/lib/dsl/BlogRichText/types.ts";
import { runGoldenCases } from "./testHarness";

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
    const { temp_id: _tempId, id: _id, value, ...rest } = token;

    return {
      ...rest,
      value: typeof value === "string" ? value : normalizeTokens(value),
    };
  });
};

const cases: Array<{ name: string; run: () => void }> = [
  // --- [Tag] 标签处理器行为 ---
  {
    name: "[Tag/Basic] bold 标签 -> 应当生成正确的嵌套 token 结构",
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
  {
    name: "[Tag/Variety] 多种 inline 标签并存 -> 应当生成对应的各类型 token",
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
    name: "[Tag/Pipe] 管道符周围空格消费行为 -> 应当吞掉右侧空格并由处理器 trim 左侧",
    run: () => {
      const cases = [
        {
          input: "$$info(title| content)$$",
          expectedTitle: "title",
          expectedValue: [{ type: "text", value: "content" }],
        },
        {
          input: "$$info( title | content )$$",
          expectedTitle: "title",
          expectedValue: [{ type: "text", value: "content " }],
        },
      ];

      cases.forEach((pipeCase) => {
        const [token] = parseRichText(pipeCase.input, 50, true);
        assert.equal(token.title, pipeCase.expectedTitle);
        if (!Array.isArray(token.value)) throw new Error("value should be array");
        assert.deepEqual(normalizeTokens(token.value), pipeCase.expectedValue);
      });
    },
  },
  {
    name: "[Tag/Hybrid] raw/block/inline 混合边界 -> 应当严格保持声明顺序与树状结构",
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
              value: "const a = 1",
            },
            {
              type: "bold",
              value: [{ type: "text", value: "x" }],
            },
          ],
        },
      ]);
    },
  },
  {
    name: "[Tag/Date] date 标签自定义格式与语言 -> 应当保留运行时渲染所需参数",
    run: () => {
      const tokens = parseRichText("$$date(2024-01-02|YYYY/MM/DD|en)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        { type: "date", date: "2024-01-02", format: "YYYY/MM/DD", timeLang: "en", value: "" },
      ]);
    },
  },
  {
    name: "[Tag/FromNow] fromNow 标签带语言参数 -> 应当保留运行时相对时间参数",
    run: () => {
      const tokens = parseRichText("$$fromNow(2026-03-23T00:00:00.000Z|en)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        { type: "fromNow", date: "2026-03-23T00:00:00.000Z", timeLang: "en", value: "" },
      ]);
    },
  },
  {
    name: "[Tag/RawCode] 基础 raw-code -> 应当保留正文原始格式并归一化语言别名",
    run: () => {
      const tokens = parseRichText("$$raw-code(js | demo)%\nconst a = 1\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "raw-code",
          codeLang: "typescript",
          title: "demo",
          label: "",
          value: "const a = 1",
        },
      ]);
    },
  },
  {
    name: "[Tag/RawCode] raw-code 带转义闭合符 -> 应当保留闭合符并继续解析到末尾",
    run: () => {
      const tokens = parseRichText("$$raw-code(ts | Demo | Label)%\na\\%end$$\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "raw-code",
          codeLang: "typescript",
          title: "Demo",
          label: "Label",
          value: "a%end$$",
        },
      ]);
    },
  },
  {
    name: "[Tag/Morph] info 的 raw 形态 -> 应当生成带对应标题的富文本块 token",
    run: () => {
      const tokens = parseRichText("$$info(标题)%\n正文\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "info",
          title: "标题",
          value: [{ type: "text", value: "正文" }],
        },
      ]);
    },
  },
  {
    name: "[Tag/Morph] warning 的 raw 形态 -> 应当生成带对应标题的富文本块 token",
    run: () => {
      const tokens = parseRichText("$$warning(标题)%\n正文\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "warning",
          title: "标题",
          value: [{ type: "text", value: "正文" }],
        },
      ]);
    },
  },
  {
    name: "[Tag/Morph] collapse 的 raw 形态 -> 应当生成带对应标题的富文本块 token",
    run: () => {
      const tokens = parseRichText("$$collapse(标题)%\n正文\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "collapse",
          title: "标题",
          value: [{ type: "text", value: "正文" }],
        },
      ]);
    },
  },

  // --- [Error] 错误报告 ---
  {
    name: "[Error/Inline] 未闭合 inline 标签 -> 应当上报 inline 错误并带上下文",
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
    name: "[Error/Raw] close 行格式错误 -> 应当 fallback 并上报独立 malformed close 错误",
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
    name: "[Error/Block] close 行格式错误 -> 应当 fallback 并上报独立 malformed close 错误",
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
