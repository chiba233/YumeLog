// noinspection DuplicatedCode

import fs from "node:fs/promises";
import path from "node:path";
import { createYamlApi } from "./getYaml.core";
import { ref } from "vue";

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

export const { getYamlConfig, loadAllPosts, loadSingleYaml } = createYamlApi(readTextResource);

export * from "./getYaml.core";
