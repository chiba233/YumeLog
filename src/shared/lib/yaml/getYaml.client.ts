// noinspection DuplicatedCode

import { ref } from "vue";
import commonI18n from "../../../data/I18N/commonI18n.json";
import { lang } from "@/shared/lib/app/setupLang.ts";
import { $message } from "@/shared/lib/app/msgUtils.ts";
import { createYamlApi, createYamlApiState, type YamlApiState } from "./getYaml.core";

type I18nMap = Record<string, string>;

const configLoadFailed = commonI18n.configLoadFailed as I18nMap;
const configTypeError = commonI18n.configTypeError as I18nMap;
const yamlLoadFailed = commonI18n.yamlLoadFailed as I18nMap;
const singleYamlFallback = commonI18n.singleYamlFallback as I18nMap;
const singleYamlReadFailed = commonI18n.singleYamlReadFailed as I18nMap;

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

const wrapAsync = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  syncStateToRefs: () => void,
) => {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await fn(...args);
    } finally {
      syncStateToRefs();
    }
  };
};

export interface YamlClientMessageLike {
  error: (content: string, closable: boolean, duration: number) => unknown;
  warning: (content: string, closable: boolean, duration: number) => unknown;
}

export interface YamlClientBindings {
  state: YamlApiState;
  syncStateToRefs: () => void;
  getYamlConfig: () => Promise<unknown>;
  loadAllPosts: <T extends object>(type: string) => Promise<T[]>;
  loadSingleYaml: <T extends object>(type: string, fileName: string) => Promise<T | null>;
}

const createNotify =
  (
    currentLang: { value: string },
    messageApi: YamlClientMessageLike,
    template: I18nMap,
    level: "error" | "warning" = "error",
  ) =>
  (payload: Record<string, string>): void => {
    let message = template[currentLang.value] || template.en;

    for (const [key, value] of Object.entries(payload)) {
      message = message.replace(`{${key}}`, value);
    }

    messageApi[level](message, true, 3000);
  };

const createDslNotifier = (currentLang: { value: string }, messageApi: YamlClientMessageLike) => {
  return (error: { code: string; params?: Record<string, string> }): void => {
    const map = commonI18n[error.code as keyof typeof commonI18n] as I18nMap | undefined;
    let message = map?.[currentLang.value] || map?.en || error.code;

    for (const [key, value] of Object.entries(error.params ?? {})) {
      message = message.replace(`{${key}}`, value);
    }

    messageApi.error(message, true, 3000);
  };
};

export const createYamlClientBindings = (
  readTextResource: (resourcePath: string) => Promise<string>,
  deps: {
    stateRefs?: Partial<{
      yamlLoading: typeof yamlLoading;
      yamlRetrying: typeof yamlRetrying;
      faultTimes: typeof faultTimes;
      changeSpareUrl: typeof changeSpareUrl;
      serverError: typeof serverError;
      notFoundError: typeof notFoundError;
      listPrimaryError: typeof listPrimaryError;
      listSpareError: typeof listSpareError;
      yamlLoadingFault: typeof yamlLoadingFault;
      singleChangeSpareUrl: typeof singleChangeSpareUrl;
      singleServerError: typeof singleServerError;
      singleNotFoundError: typeof singleNotFoundError;
      singleYamlLoadFailed: typeof singleYamlLoadFailed;
    }>;
    currentLang?: { value: string };
    messageApi?: YamlClientMessageLike;
    state?: YamlApiState;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): YamlClientBindings => {
  const state = deps.state ?? createYamlApiState();
  const currentLang = deps.currentLang ?? lang;
  const messageApi = deps.messageApi ?? $message;
  const refs = {
    yamlLoading,
    yamlRetrying,
    faultTimes,
    changeSpareUrl,
    serverError,
    notFoundError,
    listPrimaryError,
    listSpareError,
    yamlLoadingFault,
    singleChangeSpareUrl,
    singleServerError,
    singleNotFoundError,
    singleYamlLoadFailed,
    ...deps.stateRefs,
  };

  const syncStateToRefs = (): void => {
    refs.yamlLoading.value = state.yamlLoading;
    refs.yamlRetrying.value = state.yamlRetrying;
    refs.faultTimes.value = state.faultTimes;
    refs.changeSpareUrl.value = state.changeSpareUrl;
    refs.serverError.value = state.serverError;
    refs.notFoundError.value = state.notFoundError;
    refs.listPrimaryError.value = state.listPrimaryError;
    refs.listSpareError.value = state.listSpareError;
    refs.yamlLoadingFault.value = state.yamlLoadingFault;
    refs.singleChangeSpareUrl.value = state.singleChangeSpareUrl;
    refs.singleServerError.value = state.singleServerError;
    refs.singleNotFoundError.value = state.singleNotFoundError;
    refs.singleYamlLoadFailed.value = state.singleYamlLoadFailed;
  };

  const api = createYamlApi(readTextResource, {
    state,
    onConfigLoadFailed(payload) {
      syncStateToRefs();
      createNotify(currentLang, messageApi, configLoadFailed)(payload);
    },
    onConfigTypeError(payload) {
      syncStateToRefs();
      createNotify(currentLang, messageApi, configTypeError)(payload);
    },
    onYamlLoadFailed(payload) {
      syncStateToRefs();
      createNotify(currentLang, messageApi, yamlLoadFailed)(payload);
    },
    onSingleYamlFallback(payload) {
      syncStateToRefs();
      createNotify(currentLang, messageApi, singleYamlFallback, "warning")(payload);
    },
    onSingleYamlReadFailed(payload) {
      syncStateToRefs();
      createNotify(currentLang, messageApi, singleYamlReadFailed)(payload);
    },
    onDslError(error) {
      syncStateToRefs();
      createDslNotifier(currentLang, messageApi)(error);
    },
    onStateChange() {
      syncStateToRefs();
    },
    sleep: deps.sleep,
  });

  return {
    state,
    syncStateToRefs,
    getYamlConfig: wrapAsync(api.getYamlConfig, syncStateToRefs),
    loadAllPosts: wrapAsync(
      api.loadAllPosts,
      syncStateToRefs,
    ) as YamlClientBindings["loadAllPosts"],
    loadSingleYaml: wrapAsync(
      api.loadSingleYaml,
      syncStateToRefs,
    ) as YamlClientBindings["loadSingleYaml"],
  };
};

const clientBindings = createYamlClientBindings(async (resourcePath: string): Promise<string> => {
  const res = await fetch(resourcePath);

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${resourcePath} (${res.status})`);
  }

  return await res.text();
});

export const getYamlConfig = clientBindings.getYamlConfig;
export const loadAllPosts = clientBindings.loadAllPosts;
export const loadSingleYaml = clientBindings.loadSingleYaml;

export * from "./getYaml.core";
