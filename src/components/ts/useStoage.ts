import { useStorage } from "@vueuse/core";
import moment from "moment";
import "moment/dist/locale/ja";
import "moment/dist/locale/zh-cn";
import "moment/dist/locale/en-au";
import { ref, watch, type Ref } from "vue";
import { useYamlText } from "@/components/ts/useYamlI18n.ts";
import { loadSingleYaml } from "@/components/ts/getYaml.ts";

export interface SelectOption {
  label: string;
  value: string;
}

export const langMap: Ref<SelectOption[]> = ref([]);

fetch("/data/config/i18nLang.json")
  .then(res => res.json())
  .then((langData: SelectOption[]) => {
    langMap.value = langData;
  })
  .catch(err => console.error("I18n config load failed:", err));

const rawLang = navigator.language.substring(0, 2);
export const lang: Ref<string> = useStorage("useLang", rawLang);
export const themeColor: Ref<string> = useStorage("setColor", "");
export const displayContent = useYamlText("main", "introduction.yaml");
export const displayTitle = useYamlText("main", "title.yaml");

watch(langMap, (newMap) => {
  if (newMap.length === 0) return;

  const validValues = newMap.map(item => item.value);
  if (!validValues.includes(lang.value)) {
    lang.value = validValues.includes(rawLang) ? rawLang : (validValues.includes("en") ? "en" : validValues[0]);
  }
});

interface YamlFriendsBlock {
  name: string;
  alias: string;
  url: string;
  icon: string;
}

interface YamlResponse {
  friends: YamlFriendsBlock[];
}

export const useFriendsList = async () => {
  try {
    const rawData = await loadSingleYaml<YamlResponse>("main", "friends.yaml");
    if (!rawData || !rawData.friends) return [];

    return rawData.friends.map((friend) => ({
      icon: friend.icon,
      name: friend.name,
      url: friend.url,
      alias: friend.alias,
    }));
  } catch (err) {
    console.error("Error", err);
    return [];
  }
};

const localeMap: Record<string, string> = {
  zh: "zh-cn",
  en: "en-au",
  ja: "ja",
};


// 导出一个专门格式化时间的工具
export const formatTime = (date: string | number | Date | moment.Moment | undefined): string => {
  if (!date) return "";
  const currentLocale = localeMap[lang.value] || "en";
  moment.locale(currentLocale);
  return moment(date).fromNow();
};