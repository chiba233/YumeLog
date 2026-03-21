import { computed, onServerPrefetch, ref } from "vue";
import { lang } from "@/components/ts/global/setupLang.ts";
import { useContentStore } from "@/components/ts/global/contentStore.ts";
import { $message } from "@/components/ts/global/msgUtils.ts";
import { CommonI18nBlock } from "../d.ts";
import commonI18n from "@/data/I18N/commonI18n.json";

type I18nMap = Record<string, string>;
const yamlLoadFailed = commonI18n.yamlLoadFailed as I18nMap;

type DynamicIntroduction = Record<string, unknown>;

export const useYamlText = (type: string, fileName: string, keyName: string = "blocks") => {
  const introData = ref<DynamicIntroduction | null>(null);
  const { getSingle } = useContentStore();
  const loadData = async () => {
    if (introData.value) return;
    try {
      const res = await getSingle<DynamicIntroduction>(type, fileName);
      if (res) introData.value = res;
    } catch (e) {
      if (!import.meta.env.SSR) {
        const pathMsg = (yamlLoadFailed[lang.value] || yamlLoadFailed.en).replace(
          "{err}",
          String(e),
        );
        $message.error(pathMsg, true, 3000);
      }
      console.error(`[YAML Load Error] ${type}/${fileName}:`, e);
    }
  };

  if (import.meta.env.SSR) {
    onServerPrefetch(async () => {
      await loadData();
    });
  } else {
    void loadData();
  }

  return computed(() => {
    const data = introData.value;
    if (!data || !Array.isArray(data[keyName])) return "...";
    const targetBlocks = data[keyName] as CommonI18nBlock[];
    const currentLang = lang.value;
    const found =
      targetBlocks.find((b) => b.type === currentLang) ||
      targetBlocks.find((b) => b.type === "en") ||
      targetBlocks[0];

    return found?.content ?? "";
  });
};
