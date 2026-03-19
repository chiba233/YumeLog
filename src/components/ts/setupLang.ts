import { useStorage } from "@vueuse/core";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ja";
import "dayjs/locale/zh-cn";
import "dayjs/locale/en-au";
import buddhistEra from "dayjs/plugin/buddhistEra";
import "dayjs/locale/th";
import { ref, type Ref, watch } from "vue";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { SelectOption } from "./d.ts";

dayjs.extend(buddhistEra);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

export const langMap: Ref<SelectOption[]> = ref([]);

const rawLang = import.meta.env.SSR ? "zh" : navigator.language.slice(0, 2);
export const lang: Ref<string> = useStorage("useLang", rawLang);

watch(
  langMap,
  (newMap) => {
    if (newMap.length === 0) return;
    const validValues = newMap.map((item) => item.value);
    if (!validValues.includes(lang.value)) {
      lang.value = validValues.includes(rawLang)
        ? rawLang
        : validValues.includes("en")
          ? "en"
          : validValues[0];
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
export const formatTime = (date?: string | number | Date | Dayjs): string => {
  if (!date) return "error";
  const locale = localeMap[lang.value] || localeMap.en;
  dayjs.locale(locale);
  return dayjs(date).fromNow();
};

export const formatDate = (date?: string | number | Date | Dayjs): string => {
  if (!date) return "error";
  const locale = localeMap[lang.value] || localeMap.en;
  dayjs.locale(locale);
  if (locale === "th") {
    return dayjs(date).format("D MMMM BBBB - dddd");
  }
  return dayjs(date).format("LL - dddd");
};
