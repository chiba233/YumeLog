import { computed, ref, shallowRef } from "vue";
import { lang } from "@/components/ts/setupLang.ts";
import blogI18nData from "@/data/I18N/blogI18n.json";
import { loadSingleYaml } from "@/components/ts/getYaml.ts";

type WebTitleMap = Record<string, Record<string, string>>;

export const globalWebTitleMap = shallowRef<WebTitleMap>({});
export const showCatModel = ref<boolean>(false);
export const showMaiModal = ref<boolean>(false);
export const showWechatModel = ref<boolean>(false);
export const showLineModel = ref<boolean>(false);
export const currentPostTitle = ref<string | null>(null);
export const blogDisplay = computed(() => {
  const currentLang = lang.value;
  const source = blogI18nData as Record<string, Record<string, string>>;
  const displayObj: Record<string, string> = {};

  Object.keys(source).forEach((key) => {
    const translations = source[key];
    displayObj[key] =
      translations[currentLang] ||
      translations["en"] ||
      translations["other"] ||
      Object.values(translations)[0];
  });

  return displayObj;
});

interface YamlNekoBlock {
  imgError: string;
  img: string;
  imgName: string;
}

interface YamlResponse {
  img: YamlNekoBlock[];
}

interface OriginalNekoBlock {
  imgError: string;
  img: string;
  imgName: string;
}

export const nekoImg = ref<OriginalNekoBlock[]>([]);
export const loadCat = async () => {
  if (nekoImg.value.length) return;
  const res = await loadSingleYaml<YamlResponse>("main", "neko.yaml");
  if (res && res.img) {
    nekoImg.value = res.img.map(
      (img: YamlNekoBlock): OriginalNekoBlock => ({
        imgError: img.imgError,
        img: img.img,
        imgName: img.imgName,
      }),
    );
  }
};
