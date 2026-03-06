import { useStorage } from "@vueuse/core";
import moment from "moment";
import "moment/dist/locale/ja";
import "moment/dist/locale/zh-cn";
import "moment/dist/locale/en-au";
import { Ref } from "vue";
import { useYamlText } from "@/components/ts/useYamlI18n.ts";
import { loadSingleYaml } from "@/components/ts/getYaml.ts";

export const langMap: Record<string, string> = { zh: "zh", en: "en", ja: "ja", other: "other" };

interface YamlFriendsBlock {
  name: string;
  alias: string;
  url: string;
  icon: string;
}

interface YamlResponse {
  friends: YamlFriendsBlock[];
}


const rawLang = navigator.language.substring(0, 2);
export const browserLang = ["zh", "en", "ja"].includes(rawLang) ? rawLang : "zh";
export const lang: Ref<string> = useStorage("useLang", browserLang);
export const themeColor: Ref<string> = useStorage("setColor", "");
export const displayContent = useYamlText("main", "introduction.yaml");
export const displayTitle = useYamlText("main", "title.yaml");
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


// 必须确保这些语言包被载入

const localeMap: Record<string, string> = {
  zh: "zh-cn",
  en: "en-au",
  ja: "ja",
};


// 导出一个专门格式化时间的工具
export const formatTime = (date: any) => {
  const currentLocale = localeMap[lang.value] || "en";
  moment.locale(currentLocale);
  return moment(date).fromNow();
};