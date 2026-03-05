import yaml from "js-yaml";
import { ref } from "vue";
import yamlUrl from "../../../public/data/config/yamlUrl.json";
import axios from "axios";

interface BaseContent {
  time?: string;

  [key: string]: any;
}

interface YamlConfigItem {
  listUrl: string;
  url: string;
  spareUrl?: string;
  spareListUrl?: string;
}
export interface Post {
  time?: string;
  title?: string;
  content?: string;

  [key: string]: any;
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
export const serverError = ref<boolean>(false);
export const faultTimes = ref<number>(0);
export const loadError = ref<boolean>(false);
export const yamlLoadingFault = ref<boolean>(false);
export const yamlLoading = ref<boolean>(false);
export const yamlRetrying = ref<boolean>(false);
export const changeSpareUrl = ref<boolean>(false);

const fetchWithRetry = async (url: string, options?: RequestInit, retry = 3, delay = 800) => {
  loadError.value = false;
  try {
    yamlRetrying.value = false;
    const res = await fetch(url, options);
    if (!res.ok) {
      yamlRetrying.value = false;
      serverError.value = true;
    }
    return res;
  } catch (err) {
    if (retry <= 0) {
      yamlRetrying.value = false;
      loadError.value = true;
      throw err;
    }
    yamlRetrying.value = true;
    faultTimes.value = retry;
    await sleep(delay);
    return fetchWithRetry(url, options, retry - 1, delay * 2);
  }
}

const typedYamlUrl = yamlUrl as Record<string, YamlConfigItem>;

export const loadAllPosts = async <T extends BaseContent>(type: keyof typeof yamlUrl) => {

  const { spareUrl, spareListUrl } = typedYamlUrl[type];
  let { listUrl, url: baseUrl } = typedYamlUrl[type];
  yamlLoading.value = true;
  yamlLoadingFault.value = false;
  faultTimes.value = 0;
  try {
    await axios.get(listUrl);
  } catch {
    if (spareListUrl && spareUrl) {
      listUrl = spareListUrl;
      baseUrl = spareUrl;
      changeSpareUrl.value = true;
    }
  }
  const listRes = await fetchWithRetry(listUrl, undefined, 3, 800);
  const postData = (await listRes.json()) as string[];
  const promises = postData.map(async (name: string) => {
    const url = `${baseUrl}${name}`;

    try {
      const response = await fetchWithRetry(url, undefined, 3, 800);
      const yamlText = await response.text();
      return yaml.load(yamlText) as T;
    } catch {
      yamlLoadingFault.value = true;
      return null;
    }
  });

  const results = await Promise.all(promises);
  const validData = results.filter((p): p is NonNullable<typeof p> => p !== null);
  validData.sort((a, b) => {
    const timeA = (a as BaseContent).time;
    const timeB = (b as BaseContent).time;

    if (timeA && timeB) {
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    }
    return 0;
  });

  yamlLoading.value = false;
  return validData;
};

export const loadSingleYaml = async <T>(type: keyof typeof yamlUrl, fileName: string) => {
  const { spareUrl } = typedYamlUrl[type];
  let { url: baseUrl } = typedYamlUrl[type];
  let targetUrl = `${baseUrl}${fileName}`;

  try {
    await axios.head(targetUrl);
  } catch {
    if (spareUrl) {
      baseUrl = spareUrl;
      targetUrl = `${baseUrl}${fileName}`;
    }
  }

  try {
    const response = await fetchWithRetry(targetUrl, undefined, 3, 800);
    const yamlText = await response.text();
    return yaml.load(yamlText) as T;
  } catch {
    return null;
  }
  ;
};