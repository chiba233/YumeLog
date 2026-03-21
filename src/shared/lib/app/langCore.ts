import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import "dayjs/locale/zh-cn";
import "dayjs/locale/en-au";
import buddhistEra from "dayjs/plugin/buddhistEra";
import "dayjs/locale/th";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import type { SelectOption } from "@/shared/types/common.ts";

dayjs.extend(buddhistEra);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

export const localeMap: Record<string, string> = {
  zh: "zh-cn",
  en: "en-au",
  ja: "ja",
  th: "th",
};

export const resolvePreferredLang = (
  options: SelectOption[],
  currentLang: string,
  rawLang: string,
): string => {
  if (options.length === 0) return currentLang;

  const validValues = options.map((item) => item.value);
  if (validValues.includes(currentLang)) {
    return currentLang;
  }

  if (validValues.includes(rawLang)) {
    return rawLang;
  }

  if (validValues.includes("en")) {
    return "en";
  }

  return validValues[0];
};

export const resolveLocale = (langCode: string): string => localeMap[langCode] || localeMap.en;

export const formatTimeByLang = (
  langCode: string,
  date?: string | number | Date | Dayjs,
): string => {
  if (!date) return "error";
  dayjs.locale(resolveLocale(langCode));
  return dayjs(date).fromNow();
};

export const formatDateByLang = (
  langCode: string,
  date?: string | number | Date | Dayjs,
): string => {
  if (!date) return "error";

  const locale = resolveLocale(langCode);
  dayjs.locale(locale);

  if (locale === "th") {
    return dayjs(date).format("D MMMM BBBB - dddd");
  }

  return dayjs(date).format("LL - dddd");
};
