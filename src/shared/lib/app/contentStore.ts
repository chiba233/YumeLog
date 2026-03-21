import { reactive } from "vue";
import { loadAllPosts, loadSingleYaml } from "@/shared/lib/yaml";
import type { BaseMetadata, CacheEntry } from "@/shared/types/common.ts";

const CACHE_TIMEOUT = 10 * 60 * 1000;

export interface ContentStoreDeps {
  loadAllPosts: (type: string) => Promise<BaseMetadata[]>;
  loadSingleYaml: (type: string, fileName: string) => Promise<object | null>;
  now?: () => number;
}

export const createContentStore = (deps: ContentStoreDeps) => {
  const postsCache = reactive<Record<string, CacheEntry<BaseMetadata[]>>>({});
  const singleCache = reactive<Record<string, CacheEntry<unknown>>>({});
  const getNow = deps.now ?? Date.now;

  const getPosts = async <T extends BaseMetadata>(type: string, force = false): Promise<T[]> => {
    const now = getNow();
    const cached = postsCache[type];

    if (!force && cached && now - cached.lastFetch < CACHE_TIMEOUT) {
      return cached.data as T[];
    }

    const data = (await deps.loadAllPosts(type)) as T[];

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
    const now = getNow();
    const cached = singleCache[cacheKey];

    if (!force && cached && now - cached.lastFetch < CACHE_TIMEOUT) {
      return cached.data as T;
    }

    const data = (await deps.loadSingleYaml(type, fileName)) as T | null;

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

export const useContentStore = () =>
  createContentStore({
    loadAllPosts,
    loadSingleYaml,
  });
