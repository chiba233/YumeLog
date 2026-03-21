// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import type { DSLTree } from "../src/shared/lib/dsl/extractAtBlocks/parseDSL.ts";
import { parseDSL } from "../src/shared/lib/dsl/extractAtBlocks/parseDSL.ts";
import { astToPost } from "../src/shared/lib/dsl/extractAtBlocks/astToPost.ts";
import { parseTypedDashObjectList } from "../src/shared/lib/dsl/extractAtBlocks/parseDashList.ts";
import { SINGLE_RESOURCE_DSL_PARSERS } from "../src/shared/lib/yaml/singleResourceDSL.ts";
import type { DSLError } from "../src/shared/lib/dsl/extractAtBlocks/dslError.ts";

const stripTempIds = <T>(value: T): T => {
  return JSON.parse(
    JSON.stringify(value, (key, currentValue) => (key === "temp_id" ? undefined : currentValue)),
  ) as T;
};

const collectErrors = (run: (errors: DSLError[]) => void): DSLError[] => {
  const errors: DSLError[] = [];
  run(errors);
  return errors;
};

const createDeterministicDirtyText = (
  seed: number,
  parts: readonly string[],
  length: number,
): string => {
  let state = seed >>> 0;
  let output = "";

  for (let i = 0; i < length; i++) {
    state = (state * 1103515245 + 12345) >>> 0;
    output += parts[state % parts.length];
  }

  return output;
};

const withSilencedConsoleError = (run: () => void): void => {
  const original = console.error;
  console.error = () => {};

  try {
    run();
  } finally {
    console.error = original;
  }
};

const captureConsoleError = (run: () => void): string[] => {
  const original = console.error;
  const messages: string[] = [];
  console.error = (...args: unknown[]) => {
    messages.push(args.map((arg) => String(arg)).join(" "));
  };

  try {
    run();
  } finally {
    console.error = original;
  }

  return messages;
};

const cases: Array<{ name: string; run: () => void }> = [
  {
    name: "parseDSL 能保留扁平博客块并裁掉块尾空行",
    run: () => {
      const ast = parseDSL("@meta\ntime: 2024-01-01\n@end\n@text\nhello\nworld\n\n@end\n", {
        blockNames: ["meta", "text", "image", "divider"],
        maxDepth: 1,
        nestableBlocks: [],
      });

      assert.deepEqual(stripTempIds(ast), [
        {
          name: "meta",
          content: "time: 2024-01-01",
          children: [],
          chunks: [{ type: "text", value: "time: 2024-01-01" }],
          depth: 0,
          lineStart: 1,
          lineEnd: 3,
        },
        {
          name: "text",
          content: "hello\nworld",
          children: [],
          chunks: [{ type: "text", value: "hello\nworld" }],
          depth: 0,
          lineStart: 4,
          lineEnd: 8,
        },
      ]);
    },
  },
  {
    name: "parseDSL 会把被转义的指令行当作普通文本",
    run: () => {
      const ast = parseDSL("@text\n\\@image\n@end", {
        blockNames: ["meta", "text", "image", "divider"],
        maxDepth: 1,
        nestableBlocks: [],
      });

      assert.deepEqual(stripTempIds(ast), [
        {
          name: "text",
          content: "@image",
          children: [],
          chunks: [{ type: "text", value: "@image" }],
          depth: 0,
          lineStart: 1,
          lineEnd: 3,
        },
      ]);
    },
  },
  {
    name: "parseDSL 会把未知但像指令的行保留为普通文本",
    run: () => {
      const ast = parseDSL("@text\n@unknown\n@end", {
        blockNames: ["meta", "text", "image", "divider"],
        maxDepth: 1,
        nestableBlocks: [],
      });

      assert.deepEqual(stripTempIds(ast), [
        {
          name: "text",
          content: "@unknown",
          children: [],
          chunks: [{ type: "text", value: "@unknown" }],
          depth: 0,
          lineStart: 1,
          lineEnd: 3,
        },
      ]);
    },
  },
  {
    name: "显式允许嵌套时 parseDSL 会构建树结构",
    run: () => {
      const ast = parseDSL(
        "@fromNow\n@event\ntime: 20200101\n@names\n- type: en\n  content: test\n@end\n@end\n@end",
        {
          blockNames: ["fromNow", "event", "names"],
          maxDepth: 3,
          nestableBlocks: ["fromNow", "event"],
        },
      );

      assert.deepEqual(stripTempIds(ast), [
        {
          name: "fromNow",
          content: "",
          children: [
            {
              name: "event",
              content: "time: 20200101",
              children: [
                {
                  name: "names",
                  content: "- type: en\n  content: test",
                  children: [],
                  chunks: [{ type: "text", value: "- type: en\n  content: test" }],
                  depth: 2,
                  lineStart: 4,
                  lineEnd: 7,
                },
              ],
              chunks: [
                { type: "text", value: "time: 20200101" },
                {
                  type: "child",
                  node: {
                    name: "names",
                    content: "- type: en\n  content: test",
                    children: [],
                    chunks: [{ type: "text", value: "- type: en\n  content: test" }],
                    depth: 2,
                    lineStart: 4,
                    lineEnd: 7,
                  },
                },
              ],
              depth: 1,
              lineStart: 2,
              lineEnd: 8,
            },
          ],
          chunks: [
            {
              type: "child",
              node: {
                name: "event",
                content: "time: 20200101",
                children: [
                  {
                    name: "names",
                    content: "- type: en\n  content: test",
                    children: [],
                    chunks: [{ type: "text", value: "- type: en\n  content: test" }],
                    depth: 2,
                    lineStart: 4,
                    lineEnd: 7,
                  },
                ],
                chunks: [
                  { type: "text", value: "time: 20200101" },
                  {
                    type: "child",
                    node: {
                      name: "names",
                      content: "- type: en\n  content: test",
                      children: [],
                      chunks: [{ type: "text", value: "- type: en\n  content: test" }],
                      depth: 2,
                      lineStart: 4,
                      lineEnd: 7,
                    },
                  },
                ],
                depth: 1,
                lineStart: 2,
                lineEnd: 8,
              },
            },
          ],
          depth: 0,
          lineStart: 1,
          lineEnd: 9,
        },
      ]);
    },
  },
  {
    name: "不允许的嵌套块会退化为文本并上报错误",
    run: () => {
      const errors = collectErrors((bucket) => {
        const ast = parseDSL("@text\n@image\n- src: /a.webp\n@end\n@end", {
          blockNames: ["meta", "text", "image", "divider"],
          maxDepth: 1,
          nestableBlocks: [],
          onError: (error) => bucket.push(error),
        });

        assert.deepEqual(stripTempIds(ast), [
          {
            name: "text",
            content: "@image\n- src: /a.webp",
            children: [],
            chunks: [{ type: "text", value: "@image\n- src: /a.webp" }],
            depth: 0,
            lineStart: 1,
            lineEnd: 4,
          },
        ]);
      });

      assert.deepEqual(errors, [
        {
          code: "dslNestedBlockNotAllowed",
          params: { parent: "text", name: "image", line: "2" },
        },
        {
          code: "dslUnexpectedBlockEnd",
          params: { line: "5" },
        },
      ]);
    },
  },
  {
    name: "超过最大深度时会退化为文本并上报错误",
    run: () => {
      const errors = collectErrors((bucket) => {
        const ast = parseDSL("@fromNow\n@event\n@event\n@end\n@end\n@end", {
          blockNames: ["fromNow", "event"],
          maxDepth: 2,
          nestableBlocks: ["fromNow", "event"],
          onError: (error) => bucket.push(error),
        });

        assert.deepEqual(stripTempIds(ast), [
          {
            name: "fromNow",
            content: "",
            children: [
              {
                name: "event",
                content: "@event",
                children: [],
                chunks: [{ type: "text", value: "@event" }],
                depth: 1,
                lineStart: 2,
                lineEnd: 4,
              },
            ],
            chunks: [
              {
                type: "child",
                node: {
                  name: "event",
                  content: "@event",
                  children: [],
                  chunks: [{ type: "text", value: "@event" }],
                  depth: 1,
                  lineStart: 2,
                  lineEnd: 4,
                },
              },
            ],
            depth: 0,
            lineStart: 1,
            lineEnd: 5,
          },
        ]);
      });

      assert.deepEqual(errors, [
        {
          code: "dslMaxDepthExceeded",
          params: { maxDepth: "2", name: "event", line: "3" },
        },
        {
          code: "dslUnexpectedBlockEnd",
          params: { line: "6" },
        },
      ]);
    },
  },
  {
    name: "多余的块结束符会被恢复并上报错误",
    run: () => {
      const errors = collectErrors((bucket) => {
        const ast = parseDSL("@end", { onError: (error) => bucket.push(error) });
        assert.deepEqual(ast, []);
      });

      assert.deepEqual(errors, [{ code: "dslUnexpectedBlockEnd", params: { line: "1" } }]);
    },
  },
  {
    name: "文件结尾未闭合的块会自动补闭合并上报错误",
    run: () => {
      const errors = collectErrors((bucket) => {
        const ast = parseDSL("@text\nhello", { onError: (error) => bucket.push(error) });

        assert.deepEqual(stripTempIds(ast), [
          {
            name: "text",
            content: "hello",
            children: [],
            chunks: [{ type: "text", value: "hello" }],
            depth: 0,
            lineStart: 1,
            lineEnd: 2,
          },
        ]);
      });

      assert.deepEqual(errors, [
        { code: "dslBlockNotClosed", params: { name: "text", line: "1" } },
      ]);
    },
  },
  {
    name: "parseDashList 能解析引号和多行字面量",
    run: () => {
      const result = parseTypedDashObjectList<{
        temp_id: string;
        title: string;
        body?: string;
        desc?: string;
      }>("- title: \"Hello\"\n  body: |\n    line1\n      line2\n\n- title: 'World'\n  desc: done");

      assert.deepEqual(stripTempIds(result), [
        { title: "Hello", body: "line1\n  line2" },
        { title: "World", desc: "done" },
      ]);
    },
  },
  {
    name: "parseDashList 会报告孤立属性和格式错误",
    run: () => {
      const errors = collectErrors((bucket) => {
        const result = parseTypedDashObjectList<{ temp_id: string; key?: string }>(
          "  key: value\nabc\n- broken",
          { onError: (error) => bucket.push(error) },
        );

        assert.deepEqual(result, []);
      });

      assert.deepEqual(errors, [
        { code: "dslIsolatedProperty", params: { raw: "  key: value" } },
        { code: "dslUnrecognizedLine", params: { raw: "abc" } },
        { code: "dslFormatError", params: { raw: "- broken" } },
      ]);
    },
  },
  {
    name: "astToPost 能把元数据和博客块映射成最终文章结构",
    run: () => {
      const ast = parseDSL(
        "@meta\ntime: 2024-01-01\ntitle: hi\n@end\n@text\nhello\n@end\n@image\n- src: /a.webp\n  desc: wow\n@end\n@divider\n@end",
        {
          blockNames: ["meta", "text", "image", "divider"],
          maxDepth: 1,
          nestableBlocks: [],
        },
      );

      assert.deepEqual(stripTempIds(astToPost(ast)), {
        blocks: [
          { type: "text", content: "hello" },
          { type: "image", content: [{ src: "/a.webp", desc: "wow" }] },
          { type: "divider", content: "" },
        ],
        time: "2024-01-01",
        title: "hi",
      });
    },
  },
  {
    name: "astToPost 在 chunked text 场景会按顺序拆分块",
    run: () => {
      const ast = parseDSL("@text\nhello\n@divider\n@end\nworld\n@end", {
        blockNames: ["meta", "text", "image", "divider"],
        maxDepth: 2,
        nestableBlocks: ["text"],
      });

      assert.deepEqual(stripTempIds(astToPost(ast)), {
        blocks: [
          { type: "text", content: "hello" },
          { type: "divider", content: "" },
          { type: "text", content: "world" },
        ],
      });
    },
  },
  {
    name: "astToPost 的 meta 重复 key 会以后值覆盖并上报告警",
    run: () => {
      const ast = parseDSL("@meta\ntitle: first\ntitle: second\n@end", {
        blockNames: ["meta"],
        maxDepth: 1,
        nestableBlocks: [],
      });

      const warnings = captureConsoleError(() => {
        assert.deepEqual(stripTempIds(astToPost(ast)), {
          blocks: [],
          title: "second",
        });
      });

      assert.deepEqual(warnings, ["[DSL Warning] Duplicate key: title"]);
    },
  },
  {
    name: "astToPost 的保留 meta key 会被忽略并上报告警",
    run: () => {
      const ast = parseDSL("@meta\nblocks: hacked\ntitle: ok\n@end", {
        blockNames: ["meta"],
        maxDepth: 1,
        nestableBlocks: [],
      });

      const warnings = captureConsoleError(() => {
        assert.deepEqual(stripTempIds(astToPost(ast)), {
          blocks: [],
          title: "ok",
        });
      });

      assert.deepEqual(warnings, ["[DSL Warning] Reserved key: blocks"]);
    },
  },
  {
    name: "单文件 title 解释器能映射 i18n 列表",
    run: () => {
      const parser = SINGLE_RESOURCE_DSL_PARSERS["main:title.dsl"];
      const ast = parseDSL("@title\n- type: en\n  content: Hello\n@end", parser.syntax);

      assert.deepEqual(stripTempIds(parser.parse(ast)), {
        title: [{ type: "en", content: "Hello" }],
      });
    },
  },
  {
    name: "单文件 introduction 解释器能映射 i18n 列表",
    run: () => {
      const parser = SINGLE_RESOURCE_DSL_PARSERS["main:introduction.dsl"];
      const ast = parseDSL("@introduction\n- type: en\n  content: Intro\n@end", parser.syntax);

      assert.deepEqual(stripTempIds(parser.parse(ast)), {
        introduction: [{ type: "en", content: "Intro" }],
      });
    },
  },
  {
    name: "单文件 friends 解释器能映射 dash-list 记录",
    run: () => {
      const parser = SINGLE_RESOURCE_DSL_PARSERS["main:friends.dsl"];
      const ast = parseDSL(
        "@friends\n- name: A\n  alias: Bee\n  url: https://a.com\n  icon: cat\n@end",
        parser.syntax,
      );

      assert.deepEqual(stripTempIds(parser.parse(ast)), {
        friends: [{ name: "A", alias: "Bee", url: "https://a.com", icon: "cat" }],
      });
    },
  },
  {
    name: "单文件 neko 解释器能映射图片记录",
    run: () => {
      const parser = SINGLE_RESOURCE_DSL_PARSERS["main:neko.dsl"];
      const ast = parseDSL(
        "@img\n- imgError: err\n  img: /a.webp\n  imgName: cat\n@end",
        parser.syntax,
      );

      assert.deepEqual(stripTempIds(parser.parse(ast)), {
        img: [{ imgError: "err", img: "/a.webp", imgName: "cat" }],
      });
    },
  },
  {
    name: "单文件 fromNow 解释器能映射嵌套 event 和 names",
    run: () => {
      const parser = SINGLE_RESOURCE_DSL_PARSERS["main:fromNow.dsl"];
      const ast = parseDSL(
        "@fromNow\n@event\ntime: 20200101\nphoto: /a.webp\n@names\n- type: en\n  content: Test\n@end\n@end\n@end",
        parser.syntax,
      );

      assert.deepEqual(stripTempIds(parser.parse(ast)), {
        fromNow: [
          {
            time: "20200101",
            photo: "/a.webp",
            names: [{ type: "en", content: "Test" }],
          },
        ],
      });
    },
  },
  {
    name: "parseDSL 能处理 BOM 和 CRLF 换行",
    run: () => {
      const ast = parseDSL("\uFEFF@text\r\nhello\r\n@end\r\n");

      assert.deepEqual(stripTempIds(ast), [
        {
          name: "text",
          content: "hello",
          children: [],
          chunks: [{ type: "text", value: "hello" }],
          depth: 0,
          lineStart: 1,
          lineEnd: 3,
        },
      ]);
    },
  },
  {
    name: "parseDashList 能解析双引号转义但会保留单引号反斜杠",
    run: () => {
      const result = parseTypedDashObjectList<{ temp_id: string; title: string; desc: string }>(
        "- title: \"a\\\"b\"\n  desc: 'c\\'d'",
      );

      assert.deepEqual(stripTempIds(result), [{ title: 'a"b', desc: "c\\'d" }]);
    },
  },
  {
    name: "fromNow 单文件在局部 key-value 脏数据下会尽量恢复剩余内容",
    run: () => {
      const parser = SINGLE_RESOURCE_DSL_PARSERS["main:fromNow.dsl"];
      const errors = collectErrors((bucket) => {
        const ast = parseDSL(
          "@fromNow\n@event\ntime 20200101\n@names\n- type: en\n  content: Test\n@end\n@end\n@end",
          {
            ...parser.syntax,
            onError: (error) => bucket.push(error),
          },
        );

        assert.deepEqual(stripTempIds(parser.parse(ast, (error) => bucket.push(error))), {
          fromNow: [
            {
              time: "",
              photo: "",
              names: [{ type: "en", content: "Test" }],
            },
          ],
        });
      });

      assert.deepEqual(errors, [
        {
          code: "dslUnrecognizedLine",
          params: { raw: "time 20200101" },
        },
      ]);
    },
  },
  {
    name: "fromNow 单文件在一个坏 event 后仍能恢复后续正常 event",
    run: () => {
      const parser = SINGLE_RESOURCE_DSL_PARSERS["main:fromNow.dsl"];
      const errors = collectErrors((bucket) => {
        const ast = parseDSL(
          "@fromNow\n@event\ntime bad\n@names\n- type: en\n  content: broken\n@end\n@end\n@event\ntime: 20240101\n@names\n- type: en\n  content: good\n@end\n@end\n@end",
          {
            ...parser.syntax,
            onError: (error) => bucket.push(error),
          },
        );

        assert.deepEqual(stripTempIds(parser.parse(ast, (error) => bucket.push(error))), {
          fromNow: [
            {
              time: "",
              photo: "",
              names: [{ type: "en", content: "broken" }],
            },
            {
              time: "20240101",
              photo: "",
              names: [{ type: "en", content: "good" }],
            },
          ],
        });
      });

      assert.deepEqual(errors, [
        {
          code: "dslUnrecognizedLine",
          params: { raw: "time bad" },
        },
      ]);
    },
  },
  {
    name: "坏 block 后面跟正常文本和正常 inline 时块顺序仍能恢复",
    run: () => {
      const ast = parseDSL(
        "@text\n@image\n- src: /a.webp\n@end\nhello $$bold(ok)$$\n@divider\n@end\nworld\n@end",
        {
          blockNames: ["meta", "text", "image", "divider"],
          maxDepth: 2,
          nestableBlocks: ["text"],
        },
      );

      assert.deepEqual(stripTempIds(astToPost(ast)), {
        blocks: [
          { type: "image", content: [{ src: "/a.webp" }] },
          { type: "text", content: "hello $$bold(ok)$$" },
          { type: "divider", content: "" },
          { type: "text", content: "world" },
        ],
      });
    },
  },
  {
    name: "深度限制触发后后续仍能正确解析 sibling 块",
    run: () => {
      const errors = collectErrors((bucket) => {
        const ast = parseDSL(
          "@fromNow\n@event\n@event\n@end\nafter\n@end\n@event\nok\n@end\n@end",
          {
            blockNames: ["fromNow", "event"],
            maxDepth: 2,
            nestableBlocks: ["fromNow", "event"],
            onError: (error) => bucket.push(error),
          },
        );

        assert.deepEqual(stripTempIds(ast), [
          {
            name: "fromNow",
            content: "after",
            children: [
              {
                name: "event",
                content: "@event",
                children: [],
                chunks: [{ type: "text", value: "@event" }],
                depth: 1,
                lineStart: 2,
                lineEnd: 4,
              },
            ],
            chunks: [
              {
                type: "child",
                node: {
                  name: "event",
                  content: "@event",
                  children: [],
                  chunks: [{ type: "text", value: "@event" }],
                  depth: 1,
                  lineStart: 2,
                  lineEnd: 4,
                },
              },
              { type: "text", value: "after" },
            ],
            depth: 0,
            lineStart: 1,
            lineEnd: 6,
          },
          {
            name: "event",
            content: "ok",
            children: [],
            chunks: [{ type: "text", value: "ok" }],
            depth: 0,
            lineStart: 7,
            lineEnd: 9,
          },
        ]);
      });

      assert.deepEqual(errors, [
        {
          code: "dslMaxDepthExceeded",
          params: { maxDepth: "2", name: "event", line: "3" },
        },
        {
          code: "dslUnexpectedBlockEnd",
          params: { line: "10" },
        },
      ]);
    },
  },
  {
    name: "单文件解释器在根块不匹配时会直接抛错",
    run: () => {
      const parser = SINGLE_RESOURCE_DSL_PARSERS["main:title.dsl"];
      const parseAsRuntime = parser.parse as (ast: DSLTree) => unknown;
      const wrongAst = parseDSL("@friends\n- type: en\n  content: Hello\n@end", {
        blockNames: ["friends"],
        maxDepth: 1,
        nestableBlocks: [],
      });

      assert.throws(() => parseAsRuntime(wrongAst), {
        message: "Unsupported DSL resource root: expected title, got friends",
      });
    },
  },
  {
    name: "随机脏输入不会让块级 DSL 解析链路崩溃",
    run: () => {
      const parts = [
        "@text\n",
        "@meta\n",
        "@image\n",
        "@divider\n",
        "@unknown\n",
        "@end\n",
        "\\@text\n",
        "title: demo\n",
        "time 20200101\n",
        "- src: /a.webp\n",
        "hello $$bold(x)$$\n",
        "world\n",
        "\n",
      ] as const;

      for (let seed = 1; seed <= 80; seed++) {
        const source = createDeterministicDirtyText(seed, parts, 20);

        withSilencedConsoleError(() => {
          assert.doesNotThrow(() => {
            const ast = parseDSL(source, {
              blockNames: ["meta", "text", "image", "divider"],
              maxDepth: 2,
              nestableBlocks: ["text"],
            });

            assert.ok(Array.isArray(ast));
            assert.doesNotThrow(() => astToPost(ast));
            assert.doesNotThrow(() => parseTypedDashObjectList(source));
          });
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
  console.log(`PASS ${cases.length} 个块级 DSL golden case`);
}
