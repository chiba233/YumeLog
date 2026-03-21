// noinspection DuplicatedCode

import { ref } from "vue";
import commonI18n from "../../../data/I18N/commonI18n.json";
import { lang } from "../global/setupLang.ts";
import { $message } from "../global/msgUtils.ts";
import { createYamlApi, createYamlApiState, type YamlApiState } from "./getYaml.core";

type I18nMap = Record<string, string>;

const configLoadFailed = commonI18n.configLoadFailed as I18nMap;
const configTypeError = commonI18n.configTypeError as I18nMap;
const yamlLoadFailed = commonI18n.yamlLoadFailed as I18nMap;

export const yamlLoading = ref(false);
export const yamlRetrying = ref(false);
export const faultTimes = ref(0);
export const changeSpareUrl = ref(false);
export const serverError = ref(false);
export const notFoundError = ref(false);
export const listPrimaryError = ref(false);
export const listSpareError = ref(false);
export const yamlLoadingFault = ref(false);

const state: YamlApiState = createYamlApiState();

const syncStateToRefs = (): void => {
  yamlLoading.value = state.yamlLoading;
  yamlRetrying.value = state.yamlRetrying;
  faultTimes.value = state.faultTimes;
  changeSpareUrl.value = state.changeSpareUrl;
  serverError.value = state.serverError;
  notFoundError.value = state.notFoundError;
  listPrimaryError.value = state.listPrimaryError;
  listSpareError.value = state.listSpareError;
  yamlLoadingFault.value = state.yamlLoadingFault;
};

const notifyDslError = (error: { code: string; params?: Record<string, string> }): void => {
  const map = commonI18n[error.code as keyof typeof commonI18n] as I18nMap | undefined;
  let message = map?.[lang.value] || map?.en || error.code;

  for (const [key, value] of Object.entries(error.params ?? {})) {
    message = message.replace(`{${key}}`, value);
  }

  $message.error(message, true, 3000);
};

const withNotify =
  (template: I18nMap) =>
  (payload: Record<string, string>): void => {
    let message = template[lang.value] || template.en;

    for (const [key, value] of Object.entries(payload)) {
      message = message.replace(`{${key}}`, value);
    }

    $message.error(message, true, 3000);
  };

const api = createYamlApi(
  async (resourcePath: string): Promise<string> => {
    const res = await fetch(resourcePath);

    if (!res.ok) {
      throw new Error(`Failed to fetch: ${resourcePath} (${res.status})`);
    }

    return await res.text();
  },
  {
    state,
    onConfigLoadFailed(payload) {
      syncStateToRefs();
      withNotify(configLoadFailed)(payload);
    },
    onConfigTypeError(payload) {
      syncStateToRefs();
      withNotify(configTypeError)(payload);
    },
    onYamlLoadFailed(payload) {
      syncStateToRefs();
      withNotify(yamlLoadFailed)(payload);
    },
    onDslError(error) {
      syncStateToRefs();
      notifyDslError(error);
    },
  },
);

const wrapAsync = <TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>) => {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await fn(...args);
    } finally {
      syncStateToRefs();
    }
  };
};

export const getYamlConfig = wrapAsync(api.getYamlConfig);
export const loadAllPosts = wrapAsync(api.loadAllPosts);
export const loadSingleYaml = wrapAsync(api.loadSingleYaml);

export * from "./getYaml.core";
