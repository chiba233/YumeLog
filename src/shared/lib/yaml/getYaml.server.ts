// noinspection DuplicatedCode,ES6PreferShortImport,PointlessBooleanExpressionJS

import fs from "node:fs/promises";
import path from "node:path";
import { createYamlApi, createYamlApiState } from "./getYaml.core";
import { ref } from "vue";
import type { BaseMetadata } from "../../types/common.ts";

export const yamlLoading = ref(false);
export const yamlRetrying = ref(false);
export const faultTimes = ref(0);
export const changeSpareUrl = ref(false);
export const serverError = ref(false);
export const notFoundError = ref(false);
export const listPrimaryError = ref(false);
export const listSpareError = ref(false);
export const yamlLoadingFault = ref(false);
export const singleChangeSpareUrl = ref(false);
export const singleServerError = ref(false);
export const singleNotFoundError = ref(false);
export const singleYamlLoadFailed = ref(false);

const isHttpUrl = (value: string): boolean => /^https?:\/\//.test(value);

const toPublicPath = (resourcePath: string): string => {
  return path.resolve(process.cwd(), "public", resourcePath.replace(/^\/+/, ""));
};

const readTextResource = async (resourcePath: string): Promise<string> => {
  if (isHttpUrl(resourcePath)) {
    const res = await fetch(resourcePath);

    if (!res.ok) {
      throw new Error(`Failed to fetch: ${resourcePath} (${res.status})`);
    }

    return await res.text();
  }

  const fullPath = toPublicPath(resourcePath);
  return await fs.readFile(fullPath, "utf-8");
};

const state = createYamlApiState();

let lastConfigLoadFailed: {
  err: string;
  phase: "yaml-config";
  resourcePath: string;
} | null = null;
let lastListReadFailed: {
  phase: "yaml-list";
  type: string;
  reason: "not-found" | "network";
  listUrl: string;
  spareListUrl?: string;
  baseUrl: string;
  spareUrl?: string;
} | null = null;
let lastSingleReadFailed: {
  phase: "yaml-single";
  type: string;
  fileName: string;
  reason: "not-found" | "network";
  baseUrl: string;
  spareUrl?: string;
  primaryUrl: string;
  spareResourceUrl?: string;
} | null = null;

const api = createYamlApi(readTextResource, {
  state,
  onConfigLoadFailed(payload) {
    lastConfigLoadFailed = payload;
  },
  onListYamlReadFailed(payload) {
    lastListReadFailed = payload;
  },
  onSingleYamlReadFailed(payload) {
    lastSingleReadFailed = payload;
  },
});

const formatConfigLoadError = (payload: NonNullable<typeof lastConfigLoadFailed>): Error =>
  new Error(`[SSR/${payload.phase}] Failed to load config ${payload.resourcePath}: ${payload.err}`);

const formatListReadError = (payload: NonNullable<typeof lastListReadFailed>): Error =>
  new Error(
    `[SSR/${payload.phase}] Failed to load list for type="${payload.type}" reason="${payload.reason}" listUrl="${payload.listUrl}" spareListUrl="${payload.spareListUrl ?? ""}" baseUrl="${payload.baseUrl}" spareUrl="${payload.spareUrl ?? ""}"`,
  );

const formatSingleReadError = (payload: NonNullable<typeof lastSingleReadFailed>): Error =>
  new Error(
    `[SSR/${payload.phase}] Failed to load resource type="${payload.type}" file="${payload.fileName}" reason="${payload.reason}" primaryUrl="${payload.primaryUrl}" spareUrl="${payload.spareResourceUrl ?? ""}" baseUrl="${payload.baseUrl}" spareBaseUrl="${payload.spareUrl ?? ""}"`,
  );

export const getYamlConfig = async () => {
  lastConfigLoadFailed = null;

  try {
    return await api.getYamlConfig();
  } catch (error) {
    if (lastConfigLoadFailed) {
      throw formatConfigLoadError(lastConfigLoadFailed);
    }

    throw error;
  }
};

export const loadAllPosts = async <T extends BaseMetadata>(type: string): Promise<T[]> => {
  lastConfigLoadFailed = null;
  lastListReadFailed = null;

  try {
    const posts = await api.loadAllPosts<T>(type);

    if (lastListReadFailed && (state.serverError || state.notFoundError)) {
      throw formatListReadError(lastListReadFailed);
    }

    return posts;
  } catch (error) {
    if (lastConfigLoadFailed) {
      throw formatConfigLoadError(lastConfigLoadFailed);
    }

    throw error;
  }
};

export const loadSingleYaml = async <T extends object>(
  type: string,
  fileName: string,
): Promise<T | null> => {
  lastConfigLoadFailed = null;
  lastSingleReadFailed = null;

  try {
    const data = await api.loadSingleYaml<T>(type, fileName);

    if (lastSingleReadFailed && state.singleYamlLoadFailed) {
      throw formatSingleReadError(lastSingleReadFailed);
    }

    return data;
  } catch (error) {
    if (lastConfigLoadFailed) {
      throw formatConfigLoadError(lastConfigLoadFailed);
    }

    throw error;
  }
};

export * from "./getYaml.core";
