import yaml from "js-yaml";
import pLimit from "p-limit";
import type { BaseMetadata, YamlUrlConfig } from "../d";
import { parseDSL } from "../dsl/extractAtBlocks/parseDSL";
import { astToPost } from "../dsl/extractAtBlocks/astToPost";
import type { DSLError } from "../dsl/extractAtBlocks/dslError.ts";

export interface YamlApiHooks {
  onConfigLoadFailed?: (payload: { err: string }) => void;
  onConfigTypeError?: (payload: { type: string }) => void;
  onYamlLoadFailed?: (payload: { err: string }) => void;
  onDslError?: (error: DSLError) => void;
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
}

export interface YamlApiHooks {
  onConfigLoadFailed?: (payload: { err: string }) => void;
  onConfigTypeError?: (payload: { type: string }) => void;
  onYamlLoadFailed?: (payload: { err: string }) => void;
  state?: YamlApiState;
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
});

export const createYamlApi = (
  readTextResource: (resourcePath: string) => Promise<string>,
  hooks: YamlApiHooks = {},
): YamlApi => {
  let memoizedConfig: Promise<YamlUrlConfig> | undefined;
  let cacheTime = 0;

  const state = hooks.state ?? createInitialState();

  const readJsonResource = async <T>(resourcePath: string): Promise<T> => {
    const text = await readTextResource(resourcePath);
    return JSON.parse(text) as T;
  };

  const getYamlConfig = (): Promise<YamlUrlConfig> => {
    const now = Date.now();

    if (!memoizedConfig || now - cacheTime > TTL) {
      cacheTime = now;
      memoizedConfig = readJsonResource<YamlUrlConfig>("/data/config/yamlUrl.json").catch((err) => {
        hooks.onConfigLoadFailed?.({ err: String(err) });
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
      return { ok: true, text };
    } catch (error: unknown) {
      const normalizedError = normalizeReadError(error);

      if (normalizedError.reason === "not-found") {
        state.yamlRetrying = false;
        return normalizedError;
      }

      if (retry <= 0) {
        state.yamlRetrying = false;
        return normalizedError;
      }

      state.yamlRetrying = true;
      state.faultTimes = retry;
      await sleep(delay);
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

    let listResult = await readTextWithRetry(listUrl, 2, 500);

    if (!listResult.ok && spareListUrl) {
      state.listPrimaryError = true;
      state.changeSpareUrl = true;
      listResult = await readTextWithRetry(spareListUrl, 3, 800);

      if (!listResult.ok) {
        state.listSpareError = true;
      }
    }

    if (!listResult.ok) {
      if (listResult.reason === "not-found") {
        state.notFoundError = true;
      } else {
        state.serverError = true;
      }

      state.yamlLoading = false;
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
              return null;
            }

            const ast = parseDSL(textResult.text, {
              onError: hooks.onDslError,
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
      return sorted;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      hooks.onYamlLoadFailed?.({ err: errMsg });
      state.serverError = true;
      state.yamlLoading = false;
      return [];
    }
  };

  const loadSingleYaml = async <T extends object>(
    type: string,
    fileName: string,
  ): Promise<T | null> => {
    state.changeSpareUrl = false;
    state.notFoundError = false;

    const config = await getYamlConfig();
    const configItem = config[type];

    if (!configItem) {
      hooks.onConfigTypeError?.({ type: String(type) });
      return null;
    }

    const { url: baseUrl, spareUrl } = configItem;

    let textResult = await readTextWithRetry(joinResourcePath(baseUrl, fileName), 2, 500);

    if (!textResult.ok && spareUrl) {
      state.changeSpareUrl = true;
      textResult = await readTextWithRetry(joinResourcePath(spareUrl, fileName), 2, 500);
    }

    if (!textResult.ok) {
      if (textResult.reason === "not-found") {
        state.notFoundError = true;
      }
      return null;
    }

    try {
      const parsed: unknown = yaml.load(textResult.text, { schema: yaml.FAILSAFE_SCHEMA });

      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }

      return parsed as T;
    } catch (e: unknown) {
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
