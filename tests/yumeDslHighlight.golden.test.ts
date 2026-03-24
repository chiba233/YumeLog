// noinspection ES6PreferShortImport

import assert from "node:assert/strict";
import { tokenizeYumeDsl } from "../src/shared/lib/external/yumeDslHighlight.ts";
import { splitTextLines } from "../src/shared/lib/dsl/extractAtBlocks/textLines.ts";
import { runGoldenCases } from "./testHarness";
import { loadTestJsonFixture } from "./testFixtures.ts";

interface HighlightFixtureCase {
  name: string;
  source: string;
}

interface HighlightFixtureRandomCase {
  name: string;
  seed: number;
  lines: number;
  parts: string[];
  prefixLines?: string[];
  suffixLines?: string[];
}

interface HighlightFixture {
  cases: HighlightFixtureCase[];
  randomCases: HighlightFixtureRandomCase[];
}

const fixture = await loadTestJsonFixture<HighlightFixture>("yumeDslHighlight.golden.json");

const normalizeSource = (text: string): string => text.replace(/\t/g, "  ");

const renderTokenLines = (code: string): string[] => {
  return tokenizeYumeDsl(code).map((line) => line.map((token) => token.content).join(""));
};

const assertRenderedLinesMatchSource = (source: string): void => {
  const normalizedSource = normalizeSource(source);
  const sourceLines = splitTextLines(normalizedSource);
  const renderedLines = renderTokenLines(source);

  assert.equal(renderedLines.length, sourceLines.length);
  assert.deepEqual(renderedLines, sourceLines);
};

const createDeterministicDirtyText = (
  seed: number,
  parts: readonly string[],
  lineCount: number,
): string => {
  let state = seed >>> 0;
  const lines: string[] = [];

  for (let i = 0; i < lineCount; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    lines.push(parts[state % parts.length]);
  }

  return lines.join("\n");
};

const cases = [
  ...fixture.cases.map((testCase) => ({
    name: testCase.name,
    run: () => {
      assertRenderedLinesMatchSource(testCase.source);
    },
  })),
  ...fixture.randomCases.map((testCase) => ({
    name: testCase.name,
    run: () => {
      const randomBody = createDeterministicDirtyText(
        testCase.seed,
        testCase.parts,
        testCase.lines,
      );
      const source = [
        ...(testCase.prefixLines ?? []),
        randomBody,
        ...(testCase.suffixLines ?? []),
      ].join("\n");

      assertRenderedLinesMatchSource(source);
    },
  })),
];

await runGoldenCases("Yume DSL Highlight", " 高亮 golden case", cases);
