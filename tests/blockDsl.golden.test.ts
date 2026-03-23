// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import type { DSLTree } from "../src/shared/lib/dsl/extractAtBlocks/parseDSL.ts";
import { parseDSL } from "../src/shared/lib/dsl/extractAtBlocks/parseDSL.ts";
import { astToPost } from "../src/shared/lib/dsl/extractAtBlocks/astToPost.ts";
import { parseTypedDashObjectList } from "../src/shared/lib/dsl/extractAtBlocks/parseDashList.ts";
import { SINGLE_RESOURCE_DSL_PARSERS } from "../src/shared/lib/yaml/singleResourceDSL.ts";
import type { DSLError } from "../src/shared/lib/dsl/extractAtBlocks/dslError.ts";
import { runGoldenCases } from "./testHarness";
import { loadTestJsonFixture } from "./testFixtures.ts";

const stripTempIds = <T>(value: T): T => {
  const parsed: unknown = JSON.parse(
    JSON.stringify(value, (key, currentValue: unknown) =>
      key === "temp_id" ? undefined : currentValue,
    ),
  );

  return parsed as T;
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

interface BlockDslParserFixture {
  parserCases: Array<{
    name: string;
    input: string;
    syntax: {
      blockNames: string[];
      maxDepth: number;
      nestableBlocks: string[];
    };
    expectedAst: unknown[];
  }>;
}

const parserFixture = await loadTestJsonFixture<BlockDslParserFixture>("blockDsl.parser.json");

interface BlockDslSingleResourceFixture {
  mappingCases: Array<{
    name: string;
    parserKey: keyof typeof SINGLE_RESOURCE_DSL_PARSERS;
    input: string;
    expected: unknown;
  }>;
  errorCases: Array<{
    name: string;
    parserKey: keyof typeof SINGLE_RESOURCE_DSL_PARSERS;
    input: string;
    expected: unknown;
    errors: DSLError[];
  }>;
}

const singleResourceFixture = await loadTestJsonFixture<BlockDslSingleResourceFixture>(
  "blockDsl.singleResource.json",
);

interface BlockDslTransformFixture {
  dashListCases: Array<{
    name: string;
    input: string;
    expected: unknown;
  }>;
  dashListErrorCase: {
    name: string;
    input: string;
    expected: unknown;
    errors: DSLError[];
  };
  postCases: Array<{
    name: string;
    input: string;
    syntax: {
      blockNames: string[];
      maxDepth: number;
      nestableBlocks: string[];
    };
    expected: unknown;
  }>;
}

const transformFixture =
  await loadTestJsonFixture<BlockDslTransformFixture>("blockDsl.transform.json");

const parserCases = parserFixture.parserCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    const ast = parseDSL(testCase.input, testCase.syntax);
    assert.deepEqual(stripTempIds(ast), testCase.expectedAst);
  },
}));

const getRuntimeSingleResourceParser = (
  parserKey: keyof typeof SINGLE_RESOURCE_DSL_PARSERS,
): {
  syntax: Parameters<typeof parseDSL>[1];
  parse: (ast: DSLTree, onError?: (error: DSLError) => void) => unknown;
} => {
  return SINGLE_RESOURCE_DSL_PARSERS[parserKey] as unknown as {
    syntax: Parameters<typeof parseDSL>[1];
    parse: (ast: DSLTree, onError?: (error: DSLError) => void) => unknown;
  };
};

const singleResourceMappingCases = singleResourceFixture.mappingCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    const parser = getRuntimeSingleResourceParser(testCase.parserKey);
    const ast = parseDSL(testCase.input, parser.syntax);
    assert.deepEqual(stripTempIds(parser.parse(ast)), testCase.expected);
  },
}));

const singleResourceErrorCases = singleResourceFixture.errorCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    const parser = getRuntimeSingleResourceParser(testCase.parserKey);
    const errors = collectErrors((bucket) => {
      const ast = parseDSL(testCase.input, {
        ...parser.syntax,
        onError: (error) => bucket.push(error),
      });

      assert.deepEqual(
        stripTempIds(parser.parse(ast, (error) => bucket.push(error))),
        testCase.expected,
      );
    });

    assert.deepEqual(errors, testCase.errors);
  },
}));

const dashListCases = transformFixture.dashListCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    const result = parseTypedDashObjectList<
      Record<string, string | undefined> & { temp_id: string }
    >(testCase.input);

    assert.deepEqual(stripTempIds(result), testCase.expected);
  },
}));

const postTransformCases = transformFixture.postCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    const ast = parseDSL(testCase.input, testCase.syntax);
    assert.deepEqual(stripTempIds(astToPost(ast)), testCase.expected);
  },
}));

const cases: Array<{ name: string; run: () => void }> = [
  // --- [Parser/Block] 块级 DSL 核心解析器 ---
  ...parserCases,
  {
    name: "[Parser/Block] 嵌套允许模式 -> 应当正确构建树状 AST 结构",
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
    name: "[Parser/Block] 非法嵌套块 -> 应当将内层块退化为文本并上报错误",
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
    name: "[Parser/Block] 深度溢出处理 -> 应当在达到 maxDepth 后将子块退化为文本",
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
    name: "[Parser/Block] 多余结束符 -> 应当直接忽略孤立的 @end 并上报意外结束错误",
    run: () => {
      const errors = collectErrors((bucket) => {
        const ast = parseDSL("@end", { onError: (error) => bucket.push(error) });
        assert.deepEqual(ast, []);
      });

      assert.deepEqual(errors, [{ code: "dslUnexpectedBlockEnd", params: { line: "1" } }]);
    },
  },
  {
    name: "[Parser/Block] 未闭合块处理 -> 应当在文件结束时自动补全闭合并上报缺失错误",
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
    name: "[Parser/Block] 环境兼容性 -> 应当支持包含 BOM 头及 CRLF 换行的原始输入",
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
    name: "[Parser/Block] 深度隔离 -> 深度限制触发后后续应当仍能正确解析 sibling 块",
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

  // --- [Parser/DashList] 列表解析器 ---
  ...dashListCases,
  {
    name: "[Parser/DashList] 错误恢复 -> 应当识别孤立属性、未知行及非法列表格式",
    run: () => {
      const errors = collectErrors((bucket) => {
        const result = parseTypedDashObjectList<{ temp_id: string; key?: string }>(
          transformFixture.dashListErrorCase.input,
          { onError: (error) => bucket.push(error) },
        );

        assert.deepEqual(result, transformFixture.dashListErrorCase.expected);
      });

      assert.deepEqual(errors, transformFixture.dashListErrorCase.errors);
    },
  },

  // --- [Post] 博客文章转换逻辑 ---
  ...postTransformCases,
  {
    name: "[Post/Meta] 重复 Key 处理 -> 应当使用后出现的值进行覆盖并上报告警",
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
    name: "[Post/Meta] 保留 Key 冲突 -> 应当忽略 meta 块中名为 blocks 的非法 Key",
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

  // --- [SingleResource] 业务单文件 DSL 映射 ---
  ...singleResourceMappingCases,
  {
    name: "[SingleResource/Title] 根块校验 -> 在根块名称不匹配 title 时应当直接抛出异常",
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
  ...singleResourceErrorCases,

  // --- [Common] 鲁棒性与压力测试 ---
  {
    name: "[Common/Robustness] 随机脏输入压力测试 -> 块级 DSL 解析链路应当永不崩溃并输出稳定",
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

await runGoldenCases("Block DSL", "块级 DSL golden case", cases);
