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
  rootValidationCase: {
    name: string;
    parserKey: keyof typeof SINGLE_RESOURCE_DSL_PARSERS;
    input: string;
    syntax: Parameters<typeof parseDSL>[1];
    expectedMessage: string;
  };
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
    errors?: DSLError[];
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

interface BlockDslRemainingFixture {
  parserCases: Array<{
    name: string;
    input: string;
    syntax: Parameters<typeof parseDSL>[1];
    expectedAst: unknown[];
  }>;
  parserErrorCases: Array<{
    name: string;
    input: string;
    syntax: Parameters<typeof parseDSL>[1];
    expectedAst: unknown[];
    errors: DSLError[];
  }>;
  postMetaCases: Array<{
    name: string;
    input: string;
    syntax: Parameters<typeof parseDSL>[1];
    expected: unknown;
    warnings: string[];
  }>;
}

const remainingFixture =
  await loadTestJsonFixture<BlockDslRemainingFixture>("blockDsl.remaining.json");

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
    if (testCase.errors) {
      const errors = collectErrors((bucket) => {
        const result = parseTypedDashObjectList<
          Record<string, string | undefined> & { temp_id: string }
        >(testCase.input, { onError: (error) => bucket.push(error) });

        assert.deepEqual(stripTempIds(result), testCase.expected);
      });

      assert.deepEqual(errors, testCase.errors);
    } else {
      const result = parseTypedDashObjectList<
        Record<string, string | undefined> & { temp_id: string }
      >(testCase.input);

      assert.deepEqual(stripTempIds(result), testCase.expected);
    }
  },
}));

const dashListErrorCase = {
  name: transformFixture.dashListErrorCase.name,
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
};

const postTransformCases = transformFixture.postCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    const ast = parseDSL(testCase.input, testCase.syntax);
    assert.deepEqual(stripTempIds(astToPost(ast)), testCase.expected);
  },
}));

const remainingParserCases = remainingFixture.parserCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    const ast = parseDSL(testCase.input, testCase.syntax);
    assert.deepEqual(stripTempIds(ast), testCase.expectedAst);
  },
}));

const remainingParserErrorCases = remainingFixture.parserErrorCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    const errors = collectErrors((bucket) => {
      const ast = parseDSL(testCase.input, {
        ...testCase.syntax,
        onError: (error) => bucket.push(error),
      });

      assert.deepEqual(stripTempIds(ast), testCase.expectedAst);
    });

    assert.deepEqual(errors, testCase.errors);
  },
}));

const postMetaCases = remainingFixture.postMetaCases.map((testCase) => ({
  name: testCase.name,
  run: () => {
    const ast = parseDSL(testCase.input, testCase.syntax);

    const warnings = captureConsoleError(() => {
      assert.deepEqual(stripTempIds(astToPost(ast)), testCase.expected);
    });

    assert.deepEqual(warnings, testCase.warnings);
  },
}));

const singleResourceRootValidationCase = {
  name: singleResourceFixture.rootValidationCase.name,
  run: () => {
    const parser = getRuntimeSingleResourceParser(
      singleResourceFixture.rootValidationCase.parserKey,
    );
    const wrongAst = parseDSL(
      singleResourceFixture.rootValidationCase.input,
      singleResourceFixture.rootValidationCase.syntax,
    );

    assert.throws(() => parser.parse(wrongAst), {
      message: singleResourceFixture.rootValidationCase.expectedMessage,
    });
  },
};

const cases: Array<{ name: string; run: () => void }> = [
  // --- [Parser/Block] 块级 DSL 核心解析器 ---
  ...parserCases,
  ...remainingParserCases,
  ...remainingParserErrorCases,

  // --- [Parser/DashList] 列表解析器 ---
  ...dashListCases,
  dashListErrorCase,

  // --- [Post] 博客文章转换逻辑 ---
  ...postTransformCases,
  ...postMetaCases,

  // --- [SingleResource] 业务单文件 DSL 映射 ---
  ...singleResourceMappingCases,
  singleResourceRootValidationCase,
  ...singleResourceErrorCases,

  // --- [Common] 鲁棒性与压力测试 ---
  {
    name: "[Common/Robustness] dash-list 随机脏数据 -> 各种缩进和 marker 组合不应崩溃",
    run: () => {
      const parts = [
        "- key: val\n",
        "-key: val\n",
        "-  key: val\n",
        "  key: val\n",
        " key: val\n",
        "   key: val\n",
        "  body: |\n",
        "    multi line\n",
        "      deep indent\n",
        "broken line\n",
        "- no-colon\n",
        "  : empty-key\n",
        "\n",
        '- title: "quoted"\n',
        "  desc: 'single'\n",
        "- k:      spaced\n",
      ] as const;

      for (let seed = 1; seed <= 100; seed++) {
        const source = createDeterministicDirtyText(seed, parts, 15);

        assert.doesNotThrow(() => {
          parseTypedDashObjectList(source);
        });
      }
    },
  },
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
