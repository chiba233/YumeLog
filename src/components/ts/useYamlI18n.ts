import { computed, onServerPrefetch, ref } from "vue"; // 记得引入 onMounted
import { lang } from "@/components/ts/setupLang.ts";
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
    try {
      const res = await getSingle<DynamicIntroduction>(type, fileName);
      if (res) introData.value = res;
    } catch (e) {
      console.error("YAML加载失败:", e);
    }
  };
  const loadPromise = loadData();
  if (import.meta.env.SSR) {
    onServerPrefetch(async () => {
      await loadPromise;
    });
  }
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
