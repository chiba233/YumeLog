import { useStorage } from "@vueuse/core";
import moment from "moment";
import "moment/dist/locale/ja";
import "moment/dist/locale/zh-cn";
import "moment/dist/locale/en-au";
import "moment/dist/locale/th.js";
import { ref, type Ref, watch } from "vue";

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

watch(langMap, (newMap) => {
  if (newMap.length === 0) return;

  const validValues = newMap.map(item => item.value);
  if (!validValues.includes(lang.value)) {
    lang.value = validValues.includes(rawLang) ? rawLang : (validValues.includes("en") ? "en" : validValues[0]);
  }
  },
  { immediate: true },
);



const localeMap: Record<string, string> = {
  zh: "zh-cn",
  en: "en-au",
  ja: "ja",
  th: "th",
};


// 导出一个专门格式化时间的工具
export const formatTime = (
  date?: string | number | Date | moment.Moment,
): string => {
  if (!date) return "error";
  const locale = localeMap[lang.value] || "en";
  moment.locale(locale);
  return moment(date).fromNow();
};