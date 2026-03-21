// noinspection ES6PreferShortImport

import type { CommonI18nBlock } from "../../types/common.ts";
import type {
  FriendsYamlResponse,
  FromNowYamlResponse,
  NekoYamlResponse,
} from "../../types/yaml.ts";
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

type RootI18nSchema = {
  kind: "i18nList";
  root: string;
  outputKey: string;
};

type RootDashListSchema = {
  kind: "dashList";
  root: string;
  outputKey: string;
};

type NestedI18nChildSchema = {
  kind: "i18nList";
  block: string;
  outputKey: string;
};

type NestedKeyValueFieldSchema = {
  source: "kv";
  defaultValue: string;
};

type NestedCollectionSchema = {
  kind: "nestedCollection";
  root: string;
  child: string;
  outputKey: string;
  fields: Record<string, NestedKeyValueFieldSchema>;
  nested?: Record<string, NestedI18nChildSchema>;
};

type ResourceSchema = RootI18nSchema | RootDashListSchema | NestedCollectionSchema;

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

const parseDashList = <T extends { temp_id: string }>(
  content: string,
  onError?: ErrorReporter,
): T[] => parseTypedDashObjectList<T>(content, { onError });

const createRootSyntax = <Name extends string>(rootName: Name): ParseDSLOptions<Name> => ({
  blockNames: [rootName] as readonly Name[],
  maxDepth: 1,
  nestableBlocks: [] as const,
});

const createNestedSyntax = (schema: NestedCollectionSchema): ParseDSLOptions<string> => {
  const nestedBlocks = Object.values(schema.nested ?? {}).map((item) => item.block);
  return {
    blockNames: [schema.root, schema.child, ...nestedBlocks],
    nestableBlocks: [schema.root, schema.child],
    maxDepth: nestedBlocks.length > 0 ? 3 : 2,
  };
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

const getChildrenByName = <Name extends string>(
  node: DSLNode<Name>,
  name: string,
): DSLNode<Name>[] => node.children.filter((child) => child.name === name);

const parseI18nBlocks = (content: string, onError?: ErrorReporter): CommonI18nBlock<string>[] => {
  return parseTypedDashObjectList<CommonI18nBlock<string>>(content, { onError });
};

const parseNestedChildNode = (
  node: DSLNode<string>,
  schema: NestedCollectionSchema,
  onError?: ErrorReporter,
): Record<string, unknown> => {
  const keyValues = parseKeyValueObject(node.content, onError);
  const record: Record<string, unknown> = {
    temp_id: node.temp_id,
  };

  for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
    record[fieldName] = keyValues[fieldName] ?? fieldSchema.defaultValue;
  }

  for (const nestedSchema of Object.values(schema.nested ?? {})) {
    const nestedNode = getChildrenByName(node, nestedSchema.block)[0];
    record[nestedSchema.outputKey] = nestedNode ? parseI18nBlocks(nestedNode.content, onError) : [];
  }

  return record;
};

const createParserFromSchema = (
  schema: ResourceSchema,
): SingleResourceParser<string, SingleResourceData> => {
  if (schema.kind === "i18nList") {
    return {
      syntax: createRootSyntax(schema.root),
      parse: (ast, onError) => {
        const root = getRequiredRoot(ast, schema.root);
        return {
          [schema.outputKey]: parseI18nBlocks(root.content, onError),
        } as unknown as SingleResourceData;
      },
    };
  }

  if (schema.kind === "dashList") {
    return {
      syntax: createRootSyntax(schema.root),
      parse: (ast, onError) => {
        const root = getRequiredRoot(ast, schema.root);
        return {
          [schema.outputKey]: parseDashList(root.content, onError),
        } as unknown as SingleResourceData;
      },
    };
  }

  return {
    syntax: createNestedSyntax(schema),
    parse: (ast, onError) => {
      const root = getRequiredRoot(ast, schema.root);
      return {
        [schema.outputKey]: getChildrenByName(root, schema.child).map((node) =>
          parseNestedChildNode(node, schema, onError),
        ),
      } as unknown as SingleResourceData;
    },
  };
};

const SINGLE_RESOURCE_SCHEMAS = {
  "main:title.dsl": {
    kind: "i18nList",
    root: "title",
    outputKey: "title",
  },
  "main:introduction.dsl": {
    kind: "i18nList",
    root: "introduction",
    outputKey: "introduction",
  },
  "main:friends.dsl": {
    kind: "dashList",
    root: "friends",
    outputKey: "friends",
  },
  "main:neko.dsl": {
    kind: "dashList",
    root: "img",
    outputKey: "img",
  },
  "main:fromNow.dsl": {
    kind: "nestedCollection",
    root: "fromNow",
    child: "event",
    outputKey: "fromNow",
    fields: {
      time: {
        source: "kv",
        defaultValue: "",
      },
      photo: {
        source: "kv",
        defaultValue: "",
      },
    },
    nested: {
      names: {
        kind: "i18nList",
        block: "names",
        outputKey: "names",
      },
    },
  },
} satisfies Record<MainResourceKey, ResourceSchema>;

export const SINGLE_RESOURCE_DSL_PARSERS = Object.fromEntries(
  Object.entries(SINGLE_RESOURCE_SCHEMAS).map(([key, schema]) => [
    key,
    createParserFromSchema(schema),
  ]),
) as {
  "main:title.dsl": SingleResourceParser<"title", Record<"title", CommonI18nBlock<string>[]>>;
  "main:introduction.dsl": SingleResourceParser<
    "introduction",
    Record<"introduction", CommonI18nBlock<string>[]>
  >;
  "main:friends.dsl": SingleResourceParser<"friends", FriendsYamlResponse>;
  "main:neko.dsl": SingleResourceParser<"img", NekoYamlResponse>;
  "main:fromNow.dsl": SingleResourceParser<"fromNow" | "event" | "names", FromNowYamlResponse>;
};
