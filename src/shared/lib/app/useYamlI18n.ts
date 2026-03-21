import { computed, onServerPrefetch, ref } from "vue";
import { lang } from "@/shared/lib/app/setupLang.ts";
import { useContentStore } from "@/shared/lib/app/contentStore.ts";
import { $message } from "@/shared/lib/app/msgUtils.ts";
import type { CommonI18nBlock } from "@/shared/types/common.ts";
import commonI18n from "@/data/I18N/commonI18n.json";

type I18nMap = Record<string, string>;
const yamlLoadFailed = commonI18n.yamlLoadFailed as I18nMap;
const isSSR = Boolean(import.meta.env?.SSR);

type DynamicIntroduction = Record<string, unknown>;

export interface YamlTextResourceDeps {
  type: string;
  fileName: string;
  keyName?: string;
  getSingle: <T extends object>(
    type: string,
    fileName: string,
    force?: boolean,
  ) => Promise<T | null>;
  message: {
    error: (msg: string, closable: boolean, duration: number) => unknown;
  };
  currentLang: { value: string };
  ssr?: boolean;
  registerServerPrefetch?: boolean;
}

export const createYamlTextState = ({
  type,
  fileName,
  keyName = "blocks",
  getSingle,
  message,
  currentLang,
  ssr = isSSR,
  registerServerPrefetch = true,
}: YamlTextResourceDeps) => {
  const introData = ref<DynamicIntroduction | null>(null);
  const loadData = async () => {
    if (introData.value) return;
    try {
      const res = await getSingle<DynamicIntroduction>(type, fileName);
      if (res) introData.value = res;
    } catch (e) {
      if (!ssr) {
        const pathMsg = (yamlLoadFailed[currentLang.value] || yamlLoadFailed.en).replace(
          "{err}",
          String(e),
        );
        message.error(pathMsg, true, 3000);
      }
      console.error(`[YAML Load Error] ${type}/${fileName}:`, e);
    }
  };

  if (ssr && registerServerPrefetch) {
    onServerPrefetch(async () => {
      await loadData();
    });
  } else if (!ssr) {
    void loadData();
  }

  const text = computed(() => {
    const data = introData.value;
    if (!data || !Array.isArray(data[keyName])) return "...";
    const targetBlocks = data[keyName] as CommonI18nBlock[];
    const current = currentLang.value;
    const found =
      targetBlocks.find((b) => b.type === current) ||
      targetBlocks.find((b) => b.type === "en") ||
      targetBlocks[0];

    return found?.content ?? "";
  });

  return {
    introData,
    loadData,
    text,
  };
};

export const createYamlTextResource = (deps: YamlTextResourceDeps) => {
  return createYamlTextState(deps).text;
};

export const useYamlText = (type: string, fileName: string, keyName: string = "blocks") => {
  const { getSingle } = useContentStore();
  return createYamlTextResource({
    type,
    fileName,
    keyName,
    getSingle,
    message: $message,
    currentLang: lang,
  });
};
