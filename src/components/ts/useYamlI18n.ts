import { computed, ref } from "vue";
import { lang } from "@/components/ts/useStorage.ts";
import { loadSingleYaml } from "@/components/ts/getYaml.ts";
import yamlUrl from "../../../public/data/config/yamlUrl.json";

interface IntroductionBlock {
  type: string;
  content: string;
}

interface Introduction {
  blocks?: IntroductionBlock[];
  content?: string;

  [key: string]: unknown;
}

export const useYamlText = (type: keyof typeof yamlUrl, fileName: string) => {
  const introData = ref<Introduction | null>(null);

  const loadData = async () => {
    introData.value = await loadSingleYaml<Introduction>(type, fileName);
  };

  loadData().catch((err) => {
    console.error("YAML Error", err);
  });

  return computed(() => {
    if (!introData.value || !introData.value.blocks) return "loading";
    const targetType = lang.value;
    const { blocks } = introData.value;
    return blocks.find((b) => b.type === targetType)?.content
      || blocks.find((b) => b.type === "en")?.content
      || "";
  });
};