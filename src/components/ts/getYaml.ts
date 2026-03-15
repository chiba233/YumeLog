import yaml from "js-yaml";
import { ref } from "vue";
import pLimit from "p-limit";
import { $message } from "@/components/ts/msgUtils.ts";
import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/components/ts/setupLang.ts";
import { BaseMetadata, YamlUrlConfig } from "@/components/ts/d.ts";

const limit = pLimit(6);

let memoizedConfig: Promise<YamlUrlConfig> | undefined;
let cacheTime = 0;
const TTL = 600000;

const getFetchUrl = (path: string) => {
  if (!import.meta.env.SSR) {
    return path;
  }
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const base = import.meta.env.SSR ? import.meta.env.VITE_SITE_URL : window.location.origin;

  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
};

type I18nMap = Record<string, string>;
const configLoadFailed = commonI18n.configLoadFailed as I18nMap;
const pathEntry = commonI18n.configPathFetchFailed as I18nMap;
const configTypeError = commonI18n.configTypeError as I18nMap;
const yamlLoadFailed = commonI18n.yamlLoadFailed as I18nMap;

export const getYamlConfig = (): Promise<YamlUrlConfig> => {
  const now = Date.now();
  if (!memoizedConfig || now - cacheTime > TTL) {
    cacheTime = now;
    memoizedConfig = fetch(getFetchUrl("/data/config/yamlUrl.json"))
      .then((res) => {
        if (!res.ok)
          $message.error(configLoadFailed[lang.value] ?? configLoadFailed["en"], true, 3000);
        return res.json();
      })
      .then((data) => data as YamlUrlConfig)
      .catch((err) => {
        const pathMsg = (pathEntry[lang.value] || pathEntry.en).replace("{err}", String(err));
        $message.error(pathMsg, true, 3000);
        memoizedConfig = undefined;
        throw err;
      });
  }

  return memoizedConfig;
};

export const yamlLoading = ref<boolean>(false);
export const yamlRetrying = ref<boolean>(false);
export const faultTimes = ref<number>(0);
export const changeSpareUrl = ref<boolean>(false);
export const serverError = ref<boolean>(false);
export const loadError = ref<boolean>(false);
export const listPrimaryError = ref<boolean>(false);
export const listSpareError = ref<boolean>(false);
export const yamlLoadingFault = ref<boolean>(false);

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const fetchWithRetry = async (
  url: string,
  options?: RequestInit,
  retry = 3,
  delay = 800,
): Promise<Response | null> => {
  try {
    const res = await fetch(url, options);
    if (res.status === 404) return res;
    if (!res.ok) {
      if (retry <= 0) return res;
      yamlRetrying.value = true;
      faultTimes.value = retry;
      await sleep(delay);
      return fetchWithRetry(url, options, retry - 1, delay * 2);
    }
    yamlRetrying.value = false;
    return res;
  } catch {
    if (retry <= 0) return null;
    yamlRetrying.value = true;
    faultTimes.value = retry;
    await sleep(delay);
    return fetchWithRetry(url, options, retry - 1, delay * 2);
  }
};

export const loadAllPosts = async <T extends BaseMetadata>(type: string): Promise<T[]> => {
  const config = await getYamlConfig();
  const configItem = config[type];
  if (!configItem) {
    const pathMsg = (configTypeError[lang.value] || configTypeError.en).replace(
      "{type}",
      String(type),
    );
    $message.error(pathMsg, true, 3000);
    return [] as T[];
  }
  const { listUrl, url: baseUrl, spareListUrl, spareUrl } = configItem;
  yamlLoading.value = true;
  serverError.value = false;
  loadError.value = false;
  listPrimaryError.value = false;
  listSpareError.value = false;
  yamlLoadingFault.value = false;
  changeSpareUrl.value = false;
  faultTimes.value = 0;
  let listRes: Response | null = await fetchWithRetry(getFetchUrl(listUrl), undefined, 2, 500);
  if ((!listRes || !listRes.ok) && spareListUrl) {
    listPrimaryError.value = true;
    changeSpareUrl.value = true;
    listRes = await fetchWithRetry(spareListUrl, undefined, 3, 800);
    if (!listRes || !listRes.ok) {
      listSpareError.value = true;
    }
  }

  if (!listRes || !listRes.ok) {
    if (listRes?.status === 404) {
      loadError.value = true;
    } else {
      serverError.value = true;
    }
    return [] as T[];
  }
  try {
    const data: unknown = await listRes.json();
    const postData = data as string[];

    const promises = postData.map((name: string) =>
      limit(async (): Promise<T | null> => {
        let res = await fetchWithRetry(`${baseUrl}${name}`, undefined, 1, 300);
        if ((!res || !res.ok) && spareUrl) {
          changeSpareUrl.value = true;
          res = await fetchWithRetry(`${spareUrl}${name}`, undefined, 1, 300);
        }
        if (res && res.ok) {
          const text = await res.text();
          const parsed: unknown = yaml.load(text, { schema: yaml.FAILSAFE_SCHEMA });
          if (parsed === null || typeof parsed !== "object") {
            return null;
          }
          return parsed as T;
        } else {
          yamlLoadingFault.value = true;
          return null;
        }
      }),
    );
    const results = await Promise.all(promises);
    const validData = results.filter((p): p is NonNullable<typeof p> => p !== null);
    const parseTime = (t?: string) => {
      if (!t) return 0;
      if (/^\d{8}$/.test(t)) {
        const iso = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
        return Date.parse(iso);
      }
      return Date.parse(t) || 0;
    };
    validData.forEach((p) => {
      (p as unknown as T & { _ts: number })._ts = parseTime(p.time);
    });
    validData.sort((a, b) => {
      const isPinA = a.pin === true || (a.pin as unknown) === "true";
      const isPinB = b.pin === true || (b.pin as unknown) === "true";
      if (isPinA && !isPinB) return -1;
      if (!isPinA && isPinB) return 1;
      const timeA = (a as unknown as { _ts: number })._ts;
      const timeB = (b as unknown as { _ts: number })._ts;
      return timeB - timeA;
    });
    yamlLoading.value = false;
    return validData;
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const pathMsg = (yamlLoadFailed[lang.value] || yamlLoadFailed.en).replace(
      "{err}",
      String(errMsg),
    );
    $message.error(pathMsg, true, 3000);
    serverError.value = true;
    return [] as T[];
  }
};

export const loadSingleYaml = async <T extends object>(
  type: string,
  fileName: string,
): Promise<T | null> => {
  changeSpareUrl.value = false;
  const config = await getYamlConfig();
  const configItem = config[type];
  if (!configItem) {
    const pathMsg = (configTypeError[lang.value] || configTypeError.en).replace(
      "{type}",
      String(type),
    );
    $message.error(pathMsg, true, 3000);
    return null;
  }
  const { url: baseUrl, spareUrl } = configItem;
  const fullUrl = `${baseUrl.endsWith("/") ? baseUrl : baseUrl + "/"}${fileName}`;
  let res = await fetchWithRetry(getFetchUrl(fullUrl), undefined, 2, 500);
  if ((!res || !res.ok) && spareUrl) {
    changeSpareUrl.value = true;
    const spareFullUrl = `${spareUrl.endsWith("/") ? spareUrl : spareUrl + "/"}${fileName}`;
    res = await fetchWithRetry(getFetchUrl(spareFullUrl), undefined, 2, 500);
  }
  if (res && res.ok) {
    try {
      const text = await res.text();
      const parsed = yaml.load(text, { schema: yaml.FAILSAFE_SCHEMA });
      if (parsed === null || typeof parsed !== "object") {
        return null;
      }
      return parsed as T;
    } catch (e: unknown) {
      const pathMsg = (yamlLoadFailed[lang.value] || yamlLoadFailed.en).replace("{err}", String(e));
      $message.error(pathMsg, true, 3000);
      return null;
    }
  }
  return null;
};
