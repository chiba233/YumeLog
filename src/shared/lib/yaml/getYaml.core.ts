// noinspection ES6PreferShortImport

import pLimit from "p-limit";
import type { BaseMetadata } from "../../types/common.ts";
import type { YamlUrlConfig } from "../../types/yaml.ts";
import type { ParseDSLOptions } from "../dsl/extractAtBlocks/parseDSL";
import { parseDSL } from "../dsl/extractAtBlocks/parseDSL";
import type { DSLNode } from "../dsl/extractAtBlocks/types.ts";
import { astToPost } from "../dsl/extractAtBlocks/astToPost";
import type { DSLError } from "../dsl/extractAtBlocks/dslError.ts";
import type { SingleResourceData, SingleResourceParser } from "./singleResourceDSL.ts";
import { SINGLE_RESOURCE_DSL_PARSERS } from "./singleResourceDSL.ts";

export interface YamlApiHooks {
  onConfigLoadFailed?: (payload: {
    err: string;
    phase: "yaml-config";
    resourcePath: string;
  }) => void;
  onConfigTypeError?: (payload: { type: string }) => void;
  onYamlLoadFailed?: (payload: { err: string }) => void;
  onListYamlReadFailed?: (payload: {
    phase: "yaml-list";
    type: string;
    reason: "not-found" | "network";
    listUrl: string;
    spareListUrl?: string;
    baseUrl: string;
    spareUrl?: string;
  }) => void;
  onSingleYamlFallback?: (payload: { type: string; fileName: string }) => void;
  onSingleYamlReadFailed?: (payload: {
    phase: "yaml-single";
    type: string;
    fileName: string;
    reason: "not-found" | "network";
    baseUrl: string;
    spareUrl?: string;
    primaryUrl: string;
    spareResourceUrl?: string;
  }) => void;
  onDslError?: (error: DSLError) => void;
  onStateChange?: (state: YamlApiState) => void;
  sleep?: (ms: number) => Promise<void>;
  state?: YamlApiState;
}

const limit = pLimit(6);
const TTL = 600000;

const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

const isHttpUrl = (value: string): boolean => /^https?:\/\//.test(value);

const isNotNull = <T>(value: T | null): value is T => value !== null;

const joinResourcePath = (base: string, fileName: string): string => {
  if (isHttpUrl(base)) {
    return new URL(fileName, base).toString();
  }

  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedFile = fileName.replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedFile}`;
};

const YAML_CONFIG_RESOURCE_PATH = "/data/config/yamlUrl.json";

const parseTime = (value?: string): number => {
  if (!value) return 0;

  if (/^\d{8}$/.test(value)) {
    const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    return Date.parse(iso);
  }

  return Date.parse(value) || 0;
};

type ReadTextResult = { ok: true; text: string } | { ok: false; reason: "not-found" | "network" };
type ReadTextError = Extract<ReadTextResult, { ok: false }>;
type SingleResourceParserKey = keyof typeof SINGLE_RESOURCE_DSL_PARSERS;
type RegisteredSingleResourceParser = (typeof SINGLE_RESOURCE_DSL_PARSERS)[SingleResourceParserKey];
type ParserName<P> = P extends SingleResourceParser<infer Name, SingleResourceData> ? Name : never;
type ParserOutput<P> = P extends SingleResourceParser<string, infer T> ? T : never;

const BLOG_POST_DSL_SYNTAX: ParseDSLOptions = {
  maxDepth: 1,
  nestableBlocks: [],
};

const isSingleResourceParserKey = (value: string): value is SingleResourceParserKey => {
  return value in SINGLE_RESOURCE_DSL_PARSERS;
};

export interface YamlApiState {
  yamlLoading: boolean;
  yamlRetrying: boolean;
  faultTimes: number;
  changeSpareUrl: boolean;
  serverError: boolean;
  notFoundError: boolean;
  listPrimaryError: boolean;
  listSpareError: boolean;
  yamlLoadingFault: boolean;
  singleChangeSpareUrl: boolean;
  singleServerError: boolean;
  singleNotFoundError: boolean;
  singleYamlLoadFailed: boolean;
}

export interface YamlApi {
  getYamlConfig: () => Promise<YamlUrlConfig>;
  loadAllPosts: <T extends BaseMetadata>(type: string) => Promise<T[]>;
  loadSingleYaml: <T extends object>(type: string, fileName: string) => Promise<T | null>;
}

const createInitialState = (): YamlApiState => ({
  yamlLoading: false,
  yamlRetrying: false,
  faultTimes: 0,
  changeSpareUrl: false,
  serverError: false,
  notFoundError: false,
  listPrimaryError: false,
  listSpareError: false,
  yamlLoadingFault: false,
  singleChangeSpareUrl: false,
  singleServerError: false,
  singleNotFoundError: false,
  singleYamlLoadFailed: false,
});

export const createYamlApi = (
  readTextResource: (resourcePath: string) => Promise<string>,
  hooks: YamlApiHooks = {},
): YamlApi => {
  let memoizedConfig: Promise<YamlUrlConfig> | undefined;
  let cacheTime = 0;

  const state = hooks.state ?? createInitialState();
  const notifyState = (): void => {
    hooks.onStateChange?.(state);
  };
  const wait = hooks.sleep ?? sleep;

  const readJsonResource = async <T>(resourcePath: string): Promise<T> => {
    const text = await readTextResource(resourcePath);
    return JSON.parse(text) as T;
  };

  const parseDslResource = <P extends RegisteredSingleResourceParser>(
    text: string,
    parser: P,
  ): ParserOutput<P> => {
    const parserBridge = parser as unknown as {
      syntax: ParseDSLOptions<ParserName<P>>;
      parse: (
        ast: DSLNode<ParserName<P>>[],
        onError?: (error: DSLError) => void,
      ) => ParserOutput<P>;
    };

    const ast = parseDSL<ParserName<P>>(text, {
      onError: hooks.onDslError,
      ...parserBridge.syntax,
    } as ParseDSLOptions<ParserName<P>>);

    return parserBridge.parse(ast, hooks.onDslError);
  };

  const parseSingleResource = <T extends object>(
    type: string,
    fileName: string,
    text: string,
  ): T => {
    if (fileName.endsWith(".json")) {
      return JSON.parse(text) as T;
    }

    if (fileName.endsWith(".dsl")) {
      const parserKey = `${type}:${fileName}`;

      if (!isSingleResourceParserKey(parserKey)) {
        throw new Error(`Unsupported DSL resource: ${parserKey}`);
      }

      const parser = SINGLE_RESOURCE_DSL_PARSERS[parserKey];

      if (!parser) {
        throw new Error(`Unsupported DSL resource: ${parserKey}`);
      }

      return parseDslResource(text, parser) as T;
    }

    throw new Error(`Unsupported resource format: ${fileName}`);
  };

  const getYamlConfig = (): Promise<YamlUrlConfig> => {
    const now = Date.now();

    if (!memoizedConfig || now - cacheTime > TTL) {
      cacheTime = now;
      memoizedConfig = readJsonResource<YamlUrlConfig>(YAML_CONFIG_RESOURCE_PATH).catch((err) => {
        hooks.onConfigLoadFailed?.({
          err: String(err),
          phase: "yaml-config",
          resourcePath: YAML_CONFIG_RESOURCE_PATH,
        });
        memoizedConfig = undefined;
        throw err;
      });
    }

    return memoizedConfig;
  };

  const normalizeReadError = (error: unknown): ReadTextError => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("404") || message.includes("not found") || message.includes("enoent")) {
        return { ok: false, reason: "not-found" };
      }
    }

    return { ok: false, reason: "network" };
  };

  const readTextWithRetry = async (
    resourcePath: string,
    retry = 3,
    delay = 800,
  ): Promise<ReadTextResult> => {
    try {
      const text = await readTextResource(resourcePath);
      state.yamlRetrying = false;
      notifyState();
      return { ok: true, text };
    } catch (error: unknown) {
      const normalizedError = normalizeReadError(error);

      if (normalizedError.reason === "not-found") {
        state.yamlRetrying = false;
        notifyState();
        return normalizedError;
      }

      if (retry <= 0) {
        state.yamlRetrying = false;
        notifyState();
        return normalizedError;
      }

      state.yamlRetrying = true;
      state.faultTimes = retry;
      notifyState();
      await wait(delay);
      return readTextWithRetry(resourcePath, retry - 1, delay * 2);
    }
  };

  const loadAllPosts = async <T extends BaseMetadata>(type: string): Promise<T[]> => {
    const config = await getYamlConfig();
    const configItem = config[type];

    if (!configItem) {
      hooks.onConfigTypeError?.({ type: String(type) });
      return [];
    }

    const { listUrl, url: baseUrl, spareListUrl, spareUrl } = configItem;

    state.yamlLoading = true;
    state.serverError = false;
    state.notFoundError = false;
    state.listPrimaryError = false;
    state.listSpareError = false;
    state.yamlLoadingFault = false;
    state.changeSpareUrl = false;
    state.faultTimes = 0;
    notifyState();

    let listResult = await readTextWithRetry(listUrl, 2, 500);

    if (!listResult.ok && spareListUrl) {
      state.listPrimaryError = true;
      state.changeSpareUrl = true;
      notifyState();
      listResult = await readTextWithRetry(spareListUrl, 3, 800);

      if (!listResult.ok) {
        state.listSpareError = true;
        notifyState();
      }
    }

    if (!listResult.ok) {
      hooks.onListYamlReadFailed?.({
        phase: "yaml-list",
        type,
        reason: listResult.reason,
        listUrl,
        spareListUrl,
        baseUrl,
        spareUrl,
      });

      if (listResult.reason === "not-found") {
        state.notFoundError = true;
      } else {
        state.serverError = true;
      }

      state.yamlLoading = false;
      notifyState();
      return [];
    }

    try {
      const data = JSON.parse(listResult.text) as string[];

      const results = await Promise.all(
        data.map((name) =>
          limit(async (): Promise<T | null> => {
            let textResult = await readTextWithRetry(joinResourcePath(baseUrl, name), 1, 300);

            if (!textResult.ok && spareUrl) {
              state.changeSpareUrl = true;
              textResult = await readTextWithRetry(joinResourcePath(spareUrl, name), 1, 300);
            }

            if (!textResult.ok) {
              state.yamlLoadingFault = true;
              notifyState();
              return null;
            }

            const ast = parseDSL(textResult.text, {
              onError: hooks.onDslError,
              ...BLOG_POST_DSL_SYNTAX,
            });

            return astToPost(ast, {
              onError: hooks.onDslError,
            }) as T;
          }),
        ),
      );

      const sorted = results.filter(isNotNull).sort((a, b) => {
        const isPinA = a.pin === "true";
        const isPinB = b.pin === "true";

        if (isPinA && !isPinB) return -1;
        if (!isPinA && isPinB) return 1;

        return parseTime(b.time) - parseTime(a.time);
      });

      state.yamlLoading = false;
      notifyState();
      return sorted;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      hooks.onYamlLoadFailed?.({ err: errMsg });
      state.serverError = true;
      state.yamlLoading = false;
      notifyState();
      return [];
    }
  };

  const loadSingleYaml = async <T extends object>(
    type: string,
    fileName: string,
  ): Promise<T | null> => {
    state.singleChangeSpareUrl = false;
    state.singleNotFoundError = false;
    state.singleServerError = false;
    state.singleYamlLoadFailed = false;
    notifyState();

    const config = await getYamlConfig();
    const configItem = config[type];

    if (!configItem) {
      hooks.onConfigTypeError?.({ type: String(type) });
      return null;
    }

    const { url: baseUrl, spareUrl } = configItem;

    const primaryUrl = joinResourcePath(baseUrl, fileName);
    const spareResourceUrl = spareUrl ? joinResourcePath(spareUrl, fileName) : undefined;
    let textResult = await readTextWithRetry(primaryUrl, 2, 500);

    if (!textResult.ok && spareUrl) {
      state.singleChangeSpareUrl = true;
      notifyState();
      hooks.onSingleYamlFallback?.({ type, fileName });
      textResult = await readTextWithRetry(spareResourceUrl ?? primaryUrl, 2, 500);
    }

    if (!textResult.ok) {
      if (textResult.reason === "not-found") {
        state.singleNotFoundError = true;
      } else {
        state.singleServerError = true;
      }
      state.singleYamlLoadFailed = true;
      notifyState();
      hooks.onSingleYamlReadFailed?.({
        phase: "yaml-single",
        type,
        fileName,
        reason: textResult.reason,
        baseUrl,
        spareUrl,
        primaryUrl,
        spareResourceUrl,
      });
      return null;
    }

    try {
      return parseSingleResource<T>(type, fileName, textResult.text);
    } catch (e: unknown) {
      state.singleYamlLoadFailed = true;
      notifyState();
      hooks.onYamlLoadFailed?.({ err: String(e) });
      return null;
    }
  };

  return {
    getYamlConfig,
    loadAllPosts,
    loadSingleYaml,
  };
};

export const createYamlApiState = createInitialState;
