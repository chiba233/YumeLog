import { computed, ref } from "vue";
import { lang } from "@/components/ts/useStorage.ts";
import { useContentStore } from "@/components/ts/contentStore.ts";

interface I18nBlock {
  type: string;
  content: string;
}

type DynamicIntroduction = Record<string, unknown>;

export const useYamlText = (type: string, fileName: string, keyName: string = "blocks") => {
  const introData = ref<DynamicIntroduction | null>(null);
  const { getSingle } = useContentStore();

  const loadData = async () => {
    const res = await getSingle<DynamicIntroduction>(type, fileName);
    if (res) {
      introData.value = res;
    }
  };

  void loadData();

  return computed(() => {
    if (!introData.value || !Array.isArray(introData.value[keyName])) {
      return "...";
    }

    const targetBlocks = introData.value[keyName] as I18nBlock[];
    const targetLang = lang.value;

    return (
      targetBlocks.find((b) => b.type === targetLang)?.content ||
      targetBlocks.find((b) => b.type === "en")?.content ||
      targetBlocks[0]?.content ||
      ""
    );
  });
};