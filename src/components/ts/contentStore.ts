import { reactive } from "vue";
import { loadAllPosts, loadSingleYaml } from "./getYaml.ts";
import { BaseMetadata, CacheEntry } from "@/components/ts/d.ts";

const postsCache = reactive<Record<string, CacheEntry<BaseMetadata[]>>>({});
const singleCache = reactive<Record<string, CacheEntry<unknown>>>({});

const CACHE_TIMEOUT = 10 * 60 * 1000;

export const useContentStore = () => {
  const getPosts = async <T extends BaseMetadata>(type: string, force = false): Promise<T[]> => {
    const now = Date.now();
    const cached = postsCache[type];

    if (!force && cached && now - cached.lastFetch < CACHE_TIMEOUT) {
      return cached.data as T[];
    }

    const data = await loadAllPosts<T>(type);

    if (data && data.length > 0) {
      postsCache[type] = {
        data: data as BaseMetadata[],
        lastFetch: now,
      };
    }

    return (postsCache[type]?.data as T[]) || [];
  };

  const getSingle = async <T extends object>(
    type: string,
    fileName: string,
    force = false,
  ): Promise<T | null> => {
    const cacheKey = `${type}_${fileName}`;
    const now = Date.now();
    const cached = singleCache[cacheKey];

    if (!force && cached && now - cached.lastFetch < CACHE_TIMEOUT) {
      return cached.data as T;
    }

    const data = await loadSingleYaml<T>(type, fileName);

    if (data !== null) {
      singleCache[cacheKey] = {
        data: data as unknown,
        lastFetch: now,
      };
    }

    return (singleCache[cacheKey]?.data as T) || null;
  };
  return {
    getPosts,
    getSingle,
  };
};
