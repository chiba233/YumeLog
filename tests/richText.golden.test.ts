// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import dayjs from "dayjs";
import { parseRichText, stripRichText } from "../src/shared/lib/dsl/BlogRichText/blogFormat.ts";
import type { TextToken } from "../src/shared/lib/dsl/BlogRichText/types.ts";
import { formatDateByLang } from "../src/shared/lib/app/langCore.ts";
import { runGoldenCases } from "./testHarness";

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

const cases: Array<{ name: string; run: () => void }> = [
  // --- [Common] 核心与通用逻辑 ---
  {
    name: "[Common/Structure] 普通文本与 inline 混合 -> 应当保持相邻文本不塌陷",
    run: () => {
      const tokens = parseRichText("before $$bold(mid)$$ after", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        { type: "text", value: "before " },
        {
          type: "bold",
          value: [{ type: "text", value: "mid" }],
        },
        { type: "text", value: " after" },
      ]);
    },
  },
  {
    name: "[Common/Depth] 超过嵌套深度限制 (Inline) -> 应当将深层标签保留为纯文本",
    run: () => {
      const tokens = parseRichText("$$bold($$bold($$bold(hi)$$)$$)$$", 2, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "bold",
          value: [
            {
              type: "bold",
              value: [{ type: "text", value: "$$bold(hi)$$" }],
            },
          ],
        },
      ]);
    },
  },
  {
    name: "[Common/Depth] 超过嵌套深度限制 (Complex) -> 应当将深层块保留为纯文本",
    run: () => {
      const tokens = parseRichText(
        "$$collapse(A)*\n$$collapse(B)*\n$$collapse(C)*\nhello\n*end$$\n*end$$\n*end$$",
        2,
        true,
      );

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "collapse",
          title: "A",
          value: [
            {
              type: "collapse",
              title: "B",
              value: [{ type: "text", value: "$$collapse(C)*\nhello\n*end$$\n" }],
            },
          ],
        },
      ]);
    },
  },
  {
    name: "[Common/Escape] 转义分隔符与闭合符 -> 应当被视为普通文本处理",
    run: () => {
      assert.equal(
        stripRichText("$$warning(标题里有 \\| 竖线 | 正文里有右括号 \\) 和反斜杠 \\\\)$$"),
        "竖线 正文里有右括号 ) 和反斜杠 \\",
      );
    },
  },
  {
    name: "[Common/Escape] 转义字符与闭合符混用 -> 应当正确解析文本而不截断后续标签",
    run: () => {
      const tokens = parseRichText("$$bold(a \\)$$ b)$$ $$thin(ok)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "bold",
          value: [{ type: "text", value: "a )$$ b" }],
        },
        { type: "text", value: " " },
        {
          type: "thin",
          value: [{ type: "text", value: "ok" }],
        },
      ]);
    },
  },
  {
    name: "[Common/Pipe] 管道符周围空格消费行为 -> 应当吞掉右侧空格并由处理器 trim 左侧",
    run: () => {
      // 1. 无空格: title="A", value="B"
      const t1 = parseRichText("$$info(A|B)$$ ", 50, true);
      const token1 = t1[0];
      assert.equal(token1.title, "A");
      if (!Array.isArray(token1.value)) throw new Error("value should be array");
      assert.deepEqual(normalizeTokens(token1.value), [{ type: "text", value: "B" }]);

      // 2. 右侧有空格 (应吞掉): title="A", value="B"
      const t2 = parseRichText("$$info(A|  B)$$ ", 50, true);
      const token2 = t2[0];
      assert.equal(token2.title, "A");
      if (!Array.isArray(token2.value)) throw new Error("value should be array");
      assert.deepEqual(normalizeTokens(token2.value), [{ type: "text", value: "B" }]);

      // 3. 左侧有空格 (由处理器 trim): title="A", value="B"
      const t3 = parseRichText("$$info(A  |B)$$ ", 50, true);
      const token3 = t3[0];
      assert.equal(token3.title, "A");
      if (!Array.isArray(token3.value)) throw new Error("value should be array");
      assert.deepEqual(normalizeTokens(token3.value), [{ type: "text", value: "B" }]);

      // 4. 左右都有空格: title="A", value="B"
      const t4 = parseRichText("$$info(A | B)$$ ", 50, true);
      const token4 = t4[0];
      assert.equal(token4.title, "A");
      if (!Array.isArray(token4.value)) throw new Error("value should be array");
      assert.deepEqual(normalizeTokens(token4.value), [{ type: "text", value: "B" }]);

      // 5. 正文末尾空格 (不应吞掉，除非处理器 trim，但 info 的 value 不 trim): title="A", value="B  "
      const t5 = parseRichText("$$info(A | B  )$$ ", 50, true);
      const token5 = t5[0];
      assert.equal(token5.title, "A");
      if (!Array.isArray(token5.value)) throw new Error("value should be array");
      assert.deepEqual(normalizeTokens(token5.value), [{ type: "text", value: "B  " }]);
    },
  },
  {
    name: "[Common/Boundary] 孤立闭合符 -> 应当直接作为普通文本保留",
    run: () => {
      assert.equal(stripRichText(")$"), ")$");
    },
  },
  {
    name: "[Common/Recovery] 坏标签后接好标签 -> 应当能跳过损坏部分并恢复解析",
    run: () => {
      const tokens = parseRichText("$$bold(bad) $$$$thin(good)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        { type: "text", value: "$$bold(bad) $$" },
        {
          type: "thin",
          value: [{ type: "text", value: "good" }],
        },
      ]);
    },
  },
  {
    name: "[Common/Recovery] 未闭合前缀后接合法标签 -> 应当能正确识别并解析后续 token",
    run: () => {
      const tokens = parseRichText("$$bold(unclosed $$thin(ok)$$ $$underline(good)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        { type: "text", value: "$$bold(unclosed " },
        {
          type: "thin",
          value: [{ type: "text", value: "ok" }],
        },
        { type: "text", value: " " },
        {
          type: "underline",
          value: [{ type: "text", value: "good" }],
        },
      ]);
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
              value: "const a = 1",
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
    name: "[Inline/Date] date 标签自定义格式与语言 -> 应当产出格式化后的纯文本 token",
    run: () => {
      const tokens = parseRichText("$$date(2024-01-02|YYYY/MM/DD|en)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [{ type: "date", value: "2024/01/02" }]);
    },
  },
  {
    name: "[Inline/Date] date 标签省略 format -> 应当走按语言默认日期格式",
    run: () => {
      const offsets = createDeterministicNumbers(42, 24, 0, 3650);

      offsets.forEach((offset) => {
        const date = formatIsoDay("2020-01-01", offset);
        const tokens = parseRichText(`$$date(${date}||th)$$`, 50, true);
        const expected = dayjs(date).locale("th").format("D MMMM BBBB - dddd");

        assert.deepEqual(normalizeTokens(tokens), [{ type: "date", value: expected }]);
        assert.equal(formatDateByLang("th", date), expected);
      });
    },
  },
  {
    name: "[Inline/Time] fromNow 标签带语言参数 -> 应当基于当前时间输出相对时间文本",
    run: () => {
      const realDateNow = Date.now;
      const baseNow = "2026-03-23T00:00:00.000Z";
      Date.now = () => new Date(baseNow).valueOf();

      try {
        const offsets = createDeterministicNumbers(7, 20, -400, 400);

        offsets.forEach((offset) => {
          const date = formatIsoInstant(baseNow, offset);
          const tokens = parseRichText(`$$fromNow(${date}|en)$$`, 50, true);
          const expected = dayjs(date).locale("en-au").from(dayjs(baseNow));

          assert.deepEqual(normalizeTokens(tokens), [{ type: "fromNow", value: expected }]);
        });
      } finally {
        Date.now = realDateNow;
      }
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
    name: "[Inline/Bold] 空 bold 标签 -> 应当生成空内容的 bold token",
    run: () => {
      const tokens = parseRichText("$$bold()$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "bold",
          value: [],
        },
      ]);
    },
  },
  {
    name: "[Inline/Bold] bold 含空格 -> 应当完整保留内部空格内容",
    run: () => {
      const tokens = parseRichText("$$bold( )$$ ", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "bold",
          value: [{ type: "text", value: " " }],
        },
        {
          type: "text",
          value: " ",
        },
      ]);
    },
  },
  {
    name: "[Inline/Bold] bold 含引号 -> 应当按普通文本保留引号",
    run: () => {
      const tokens = parseRichText('$$bold("")$$', 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "bold",
          value: [{ type: "text", value: '""' }],
        },
      ]);
    },
  },
  {
    name: "[Inline/Bold] bold 管道符在开头 -> 应当作为内容的一部分保留",
    run: () => {
      const tokens = parseRichText("$$bold(| 1)$$ ", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "bold",
          value: [{ type: "text", value: "| 1" }],
        },
        {
          type: "text",
          value: " ",
        },
      ]);
    },
  },
  {
    name: "[Inline/Bold] bold 管道符在中间 -> 应当作为内容的一部分保留",
    run: () => {
      const tokens = parseRichText("$$bold(1 |1)$$ ", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "bold",
          value: [{ type: "text", value: "1 |1" }],
        },
        {
          type: "text",
          value: " ",
        },
      ]);
    },
  },
  {
    name: "[Inline/Bold] bold 管道符且含空格 -> 应当保留管道符及所有空格",
    run: () => {
      const tokens = parseRichText("$$bold(1  |  1)$$ ", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "bold",
          value: [{ type: "text", value: "1  |  1" }],
        },
        {
          type: "text",
          value: " ",
        },
      ]);
    },
  },
  {
    name: "[Inline/Link] 缺少显示文本 -> 应当自动回退 URL 为标签内容",
    run: () => {
      const tokens = parseRichText("$$link(https://example.com)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "link",
          url: "https://example.com",
          value: [{ type: "text", value: "https://example.com" }],
        },
      ]);
    },
  },
  {
    name: "[Inline/Link] link 带多余参数 -> 应当将多余部分并入标签文本",
    run: () => {
      const tokens = parseRichText("$$link(https://a.com | hello | extra)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "link",
          url: "https://a.com",
          value: [
            { type: "text", value: "hello " },
            { type: "text", value: "extra" },
          ],
        },
      ]);
    },
  },
  {
    name: "[Inline/Link] link 标签文本嵌套 -> 应当支持在显示文本中嵌套其它 known 标签",
    run: () => {
      const tokens = parseRichText("$$link(https://a.com | hello $$bold(world)$$)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "link",
          url: "https://a.com",
          value: [
            { type: "text", value: "hello " },
            {
              type: "bold",
              value: [{ type: "text", value: "world" }],
            },
          ],
        },
      ]);
    },
  },
  {
    name: "[Inline/Link] 显式空标签文本 -> 应当允许并生成空 value",
    run: () => {
      const tokens = parseRichText("$$link(https://a.com | )$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "link",
          url: "https://a.com",
          value: [],
        },
      ]);
    },
  },
  {
    name: "[Inline/Titled] 标题类标签只有单参数 -> 应当使用默认标题并解析内容",
    run: () => {
      const tokens = parseRichText("$$info(hello world)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "info",
          title: "Info",
          value: [{ type: "text", value: "hello world" }],
        },
      ]);
    },
  },
  {
    name: "[Inline/Params] 标题类标签带多余参数 -> 应当将后续参数并入正文解析",
    run: () => {
      const tokens = parseRichText("$$info(title | content | extra)$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "info",
          title: "title",
          value: [
            { type: "text", value: "content " },
            { type: "text", value: "extra" },
          ],
        },
      ]);
    },
  },
  {
    name: "[Inline/Boundary] 显式传递空正文 -> 应当保留标题并生成空 value",
    run: () => {
      const tokens = parseRichText("$$warning(only title | )$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "warning",
          title: "only title",
          value: [],
        },
      ]);
    },
  },
  {
    name: "[Inline/Boundary] 未闭合 inline 标签 -> 应当退化为普通文本",
    run: () => {
      assert.equal(stripRichText("$$bold(hello"), "$$bold(hello");
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
          value: "const a = 1",
        },
      ]);
    },
  },
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
          value: "a%end$$",
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
    name: "[Raw/Pipe] raw 块参数包含管道符 -> 应当支持拆分为 lang/title/label",
    run: () => {
      const tokens = parseRichText("$$raw-code(ts | 标题 | 标签)%\n代码\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "raw-code",
          codeLang: "typescript",
          title: "标题",
          label: "标签",
          value: "代码",
        },
      ]);
    },
  },
  {
    name: "[Raw/Pipe] raw 块内容包含管道符 -> 应当直接保留为普通文本",
    run: () => {
      const tokens = parseRichText("$$raw-code(ts)%\nA | B\n%end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "raw-code",
          codeLang: "typescript",
          title: "Code:",
          label: "",
          value: "A | B",
        },
      ]);
    },
  },

  // --- [Block] Block 块级语法相关 ---
  {
    name: "[Block/Basic] 基础 block 标签 -> 应当正常解析块级语法并包含内容",
    run: () => {
      const tokens = parseRichText("$$collapse(点我展开)*\nhello\n*end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "collapse",
          title: "点我展开",
          value: [{ type: "text", value: "hello\n" }],
        },
      ]);
    },
  },
  {
    name: "[Block/Degrade] 不支持 block 语法的标签 -> 应当退化为普通文本",
    run: () => {
      assert.equal(
        stripRichText("$$center(hello)*\nworld\n*end$$"),
        "$$center(hello)*\nworld\n*end$$",
      );
    },
  },
  {
    name: "[Block/Boundary] 未闭合 block 标签 -> 应当退化为普通文本",
    run: () => {
      assert.equal(stripRichText("$$collapse(Title)*\nhello"), "$$collapse(Title)*\nhello");
    },
  },
  {
    name: "[Block/Escape] 内容中包含转义闭合符 -> 应当保留该符号并直到遇到真实闭合",
    run: () => {
      const tokens = parseRichText("$$collapse(Title)*\na\\*end$$\n*end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "collapse",
          title: "Title",
          value: [{ type: "text", value: "a*end$$\n" }],
        },
      ]);
    },
  },
  {
    name: "[Block/Unknown] 未知 block 语法 -> 应当整体退化为普通文本",
    run: () => {
      assert.equal(
        stripRichText("$$unknown(title)*\nhello\n*end$$"),
        "$$unknown(title)*\nhello\n*end$$",
      );
    },
  },
  {
    name: "[Block/Unknown] 文本混入未知 block -> 应当视为单一文本段而不进行块解析",
    run: () => {
      assert.equal(
        stripRichText("before $$unknown(x)*\nhello\n*end$$ after"),
        "before $$unknown(x)*\nhello\n*end$$ after",
      );
    },
  },
  {
    name: "[Block/Pipe] block 标题包含管道符 -> 应当不进行拆分 (与 inline 逻辑不同)",
    run: () => {
      const tokens = parseRichText("$$info(标题 | 正文)*\n内容\n*end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "info",
          title: "标题 | 正文",
          value: [{ type: "text", value: "内容\n" }],
        },
      ]);
    },
  },
  {
    name: "[Block/Pipe] block 内容包含管道符 -> 应当直接保留为普通文本",
    run: () => {
      const tokens = parseRichText("$$info(标题)*\nA | B\n*end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "info",
          title: "标题",
          value: [{ type: "text", value: "A | B\n" }],
        },
      ]);
    },
  },
  {
    name: "[Block/Boundary] 空 collapse block -> 应当回退默认标题并保留空内容列表",
    run: () => {
      const tokens = parseRichText("$$collapse()*\n*end$$", 50, true);

      assert.deepEqual(normalizeTokens(tokens), [
        {
          type: "collapse",
          title: "Click to expand content",
          value: [],
        },
      ]);
    },
  },
];

await runGoldenCases("Rich Text DSL", " Rich Text golden case", cases);
