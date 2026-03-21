import assert from "node:assert/strict";
import { parseRichText, stripRichText } from "../src/shared/lib/dsl/BlogRichText/blogFormat.ts";
import type { TextToken } from "../src/shared/lib/dsl/BlogRichText/types.ts";

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

const cases: Array<{ name: string; run: () => void }> = [
  {
    name: "基础 inline 富文本结构稳定",
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
    name: "未知 inline 标签会去壳并保留内部内容",
    run: () => {
      assert.equal(stripRichText("$$unknown(hello world)$$"), "hello world");
    },
  },
  {
    name: "link 缺少标签文本时回退为 URL 本身",
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
    name: "标题类 inline 块只有正文时会回退默认标题",
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
    name: "raw-code 会保留原始正文并归一化语言别名",
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
    name: "支持的 block 标签可以正常解析 block 语法",
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
    name: "转义的分隔符和闭合符会按普通文本显示",
    run: () => {
      assert.equal(
        stripRichText("$$warning(标题里有 \\| 竖线 | 正文里有右括号 \\) 和反斜杠 \\\\)$$"),
        "竖线 正文里有右括号 ) 和反斜杠 \\",
      );
    },
  },
  {
    name: "不支持的 block 语法会退化回普通文本",
    run: () => {
      assert.equal(
        stripRichText("$$center(hello)*\nworld\n*end$$"),
        "$$center(hello)*\nworld\n*end$$",
      );
    },
  },
  {
    name: "未闭合的 inline 标签会退化为普通文本",
    run: () => {
      assert.equal(stripRichText("$$bold(hello"), "$$bold(hello");
    },
  },
  {
    name: "未闭合的 raw 标签会退化为普通文本",
    run: () => {
      assert.equal(stripRichText("$$raw-code(ts)%\nconst a = 1"), "$$raw-code(ts)%\nconst a = 1");
    },
  },
  {
    name: "未闭合的 block 标签会退化为普通文本",
    run: () => {
      assert.equal(stripRichText("$$collapse(Title)*\nhello"), "$$collapse(Title)*\nhello");
    },
  },
  {
    name: "标题类 inline 标签的多余参数会并入正文",
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
    name: "link 的多余参数会并入标签文本",
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
    name: "center 目前仍是 inline-only 但 inline 解析正常",
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
    name: "转义的 raw 闭合符会保留在 raw-code 内容中",
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
    name: "转义的 block 闭合符会保留在 block 内容中",
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
    name: "warning 可以保留空正文",
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
    name: "没有合法 raw 段的空 raw-code 会保持普通文本",
    run: () => {
      assert.equal(stripRichText("$$raw-code()%%end$$"), "$$raw-code()%%end$$");
    },
  },
  {
    name: "深度限制会把过深的 inline 标签保留为父节点内的纯文本",
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
    name: "深度限制也会把过深的复杂标签保留为父块中的纯文本",
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
    name: "未知 block 语法会退化为普通文本",
    run: () => {
      assert.equal(
        stripRichText("$$unknown(title)*\nhello\n*end$$"),
        "$$unknown(title)*\nhello\n*end$$",
      );
    },
  },
  {
    name: "未知 raw 语法会退化为普通文本",
    run: () => {
      assert.equal(
        stripRichText("$$unknown(title)%\nhello\n%end$$"),
        "$$unknown(title)%\nhello\n%end$$",
      );
    },
  },
  {
    name: "普通文本包裹 inline 富文本时结构不会塌掉",
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
    name: "多层 inline 嵌套会保留文本与子节点顺序",
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
  {
    name: "link 的标签文本里可以继续嵌套 known 标签",
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
    name: "未知 inline 去壳时仍会保留内部 known 标签结构",
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
    name: "普通文本中混入未知 block 语法时会保持单段纯文本",
    run: () => {
      assert.equal(
        stripRichText("before $$unknown(x)*\nhello\n*end$$ after"),
        "before $$unknown(x)*\nhello\n*end$$ after",
      );
    },
  },
  {
    name: "info 的 raw 形态会生成带标题的富文本块",
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
    name: "warning 的 raw 形态会生成带标题的富文本块",
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
    name: "collapse 的 raw 形态会生成带标题的富文本块",
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
    name: "不支持 raw 的 known 标签在 raw 语法下会退化为普通文本",
    run: () => {
      assert.equal(stripRichText("$$center(标题)%\n正文\n%end$$"), "$$center(标题)%\n正文\n%end$$");
    },
  },
  {
    name: "thin underline strike code 这些 inline 标签都会生成对应 token",
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
    name: "空 bold 标签会生成空内容 token",
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
    name: "空 collapse block 会回退到默认标题并保留空内容",
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
  {
    name: "孤立的结束符不会被当作合法标签",
    run: () => {
      assert.equal(stripRichText(")$"), ")$");
    },
  },
  {
    name: "link 允许显式传入空标签文本",
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
    name: "一个坏标签后面跟一个好标签时后续结构仍能恢复",
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
    name: "转义字符和闭合符混用时不会吞掉后续合法标签",
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
    name: "未闭合标签前缀后面跟合法 sibling 时仍能继续解析",
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
    name: "raw block inline 混合边界下仍能保持顺序和结构",
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
    name: "随机脏输入不会让 rich text 解析器崩溃",
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
];

let failed = false;

for (const testCase of cases) {
  try {
    testCase.run();
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
  console.log(`PASS ${cases.length} 个 Rich Text golden case`);
}
