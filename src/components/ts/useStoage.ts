import { useStorage } from "@vueuse/core";
import moment from "moment";
import "moment/dist/locale/ja";
import "moment/dist/locale/zh-cn";
import "moment/dist/locale/en-au";
import type { Ref } from "vue";

export type LangKey = "zh" | "en" | "ja" | "other";

const rawLang = navigator.language.substring(0, 2);
export const browserLang = ["zh", "en", "ja"].includes(rawLang) ? rawLang : "zh";
export const lang: Ref<string> = useStorage("useLang", browserLang);
export const themeColor: Ref<string> = useStorage("setColor", "");


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