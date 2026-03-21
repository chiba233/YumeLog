import type {
  CommonI18nBlock,
  Friend,
  FriendsYamlResponse,
  FromNowYamlResponse,
  NekoYamlResponse,
  YamlNekoBlock,
  YamlTimeBlock,
} from "../d";
import type { DSLError, DSLErrorCode } from "../dsl/extractAtBlocks/dslError.ts";
import { parseTypedDashObjectList } from "../dsl/extractAtBlocks/parseDashList.ts";
import type { ParseDSLOptions } from "../dsl/extractAtBlocks/parseDSL.ts";
import type { DSLNode } from "../dsl/extractAtBlocks/types.ts";
import { splitTextLines } from "../dsl/extractAtBlocks/textLines.ts";

export type SingleResourceData =
  | Record<string, CommonI18nBlock<string>[]>
  | FriendsYamlResponse
  | FromNowYamlResponse
  | NekoYamlResponse;

type ErrorReporter = (error: DSLError) => void;

export interface SingleResourceParser<
  Names extends string = string,
  T extends SingleResourceData = SingleResourceData,
> {
  syntax: ParseDSLOptions<Names>;
  parse: (ast: DSLNode<Names>[], onError?: ErrorReporter) => T;
}

type MainResourceKey =
  | "main:title.dsl"
  | "main:introduction.dsl"
  | "main:friends.dsl"
  | "main:neko.dsl"
  | "main:fromNow.dsl";

const createSingleResourceParser = <Name extends string, T extends SingleResourceData>(config: {
  syntax: ParseDSLOptions<Name>;
  parse: (ast: DSLNode<Name>[], onError?: ErrorReporter) => T;
}): SingleResourceParser<Name, T> => config;

const emitError = (
  onError: ErrorReporter | undefined,
  code: DSLErrorCode,
  params?: Record<string, string>,
): void => {
  onError?.({ code, params });
};

const stripQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;

  const first = trimmed[0];
  if ((first === '"' || first === "'") && trimmed[trimmed.length - 1] === first) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const parseKeyValueObject = (content: string, onError?: ErrorReporter): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const raw of splitTextLines(content)) {
    const line = raw.trim();
    if (!line) continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      emitError(onError, "dslUnrecognizedLine", { raw });
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    result[key] = stripQuotes(line.slice(separatorIndex + 1));
  }

  return result;
};

const findChildren = <Name extends string>(node: DSLNode<Name>, name: Name): DSLNode<Name>[] => {
  return node.children.filter((child) => child.name === name);
};

const getRequiredRoot = <Name extends string>(
  ast: DSLNode<Name>[],
  expectedName: Name,
): DSLNode<Name> => {
  const root = ast[0];

  if (!root) {
    throw new Error("Unsupported DSL resource: empty content");
  }

  if (root.name !== expectedName) {
    throw new Error(`Unsupported DSL resource root: expected ${expectedName}, got ${root.name}`);
  }

  return root;
};

const parseI18nBlocks = (content: string, onError?: ErrorReporter): CommonI18nBlock<string>[] => {
  return parseTypedDashObjectList<CommonI18nBlock<string>>(content, { onError });
};

const parseFromNowEvent = (
  node: DSLNode<"fromNow" | "event" | "names">,
  onError?: ErrorReporter,
): YamlTimeBlock => {
  const data = parseKeyValueObject(node.content, onError);
  const namesBlock = findChildren(node, "names")[0];

  return {
    temp_id: node.temp_id,
    time: data.time ?? "",
    photo: data.photo ?? "",
    names: namesBlock ? parseI18nBlocks(namesBlock.content, onError) : [],
  };
};

export const SINGLE_RESOURCE_DSL_PARSERS = {
  "main:title.dsl": createSingleResourceParser<"title", { title: CommonI18nBlock<string>[] }>({
    syntax: {
      blockNames: ["title"] as const,
      maxDepth: 1,
      nestableBlocks: [] as const,
    },
    parse: (ast, onError) => {
      const root = getRequiredRoot(ast, "title");
      return { title: parseI18nBlocks(root.content, onError) };
    },
  }),
  "main:introduction.dsl": createSingleResourceParser<
    "introduction",
    { introduction: CommonI18nBlock<string>[] }
  >({
    syntax: {
      blockNames: ["introduction"] as const,
      maxDepth: 1,
      nestableBlocks: [] as const,
    },
    parse: (ast, onError) => {
      const root = getRequiredRoot(ast, "introduction");
      return { introduction: parseI18nBlocks(root.content, onError) };
    },
  }),
  "main:friends.dsl": createSingleResourceParser<"friends", FriendsYamlResponse>({
    syntax: {
      blockNames: ["friends"] as const,
      maxDepth: 1,
      nestableBlocks: [] as const,
    },
    parse: (ast, onError) => {
      const root = getRequiredRoot(ast, "friends");
      return { friends: parseTypedDashObjectList<Friend>(root.content, { onError }) };
    },
  }),
  "main:neko.dsl": createSingleResourceParser<"img", NekoYamlResponse>({
    syntax: {
      blockNames: ["img"] as const,
      maxDepth: 1,
      nestableBlocks: [] as const,
    },
    parse: (ast, onError) => {
      const root = getRequiredRoot(ast, "img");
      return { img: parseTypedDashObjectList<YamlNekoBlock>(root.content, { onError }) };
    },
  }),
  "main:fromNow.dsl": createSingleResourceParser<
    "fromNow" | "event" | "names",
    FromNowYamlResponse
  >({
    syntax: {
      blockNames: ["fromNow", "event", "names"] as const,
      maxDepth: 3,
      nestableBlocks: ["fromNow", "event"] as const,
    },
    parse: (ast, onError) => {
      const root = getRequiredRoot(ast, "fromNow");
      return {
        fromNow: findChildren(root, "event").map((node) => parseFromNowEvent(node, onError)),
      };
    },
  }),
} satisfies Record<MainResourceKey, unknown>;
