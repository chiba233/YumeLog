import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import "dayjs/locale/zh-cn";
import "dayjs/locale/en-au";
import "dayjs/locale/th";
import buddhistEra from "dayjs/plugin/buddhistEra";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import advancedFormat from "dayjs/plugin/advancedFormat";
import type { SelectOption } from "@/shared/types/common.ts";

dayjs.extend(buddhistEra);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);

export const localeMap: Record<string, string> = {
  zh: "zh-cn",
  en: "en-au",
  ja: "ja",
  th: "th",
};

export const resolveLocale = (langCode: string): string => localeMap[langCode] || localeMap.en;

export const resolvePreferredLang = (
  options: SelectOption[],
  currentLang: string,
  rawLang: string,
): string => {
  if (options.length === 0) return currentLang;
  const validValues = options.map((item) => item.value);
  if (validValues.includes(currentLang)) return currentLang;
  if (validValues.includes(rawLang)) return rawLang;
  if (validValues.includes("en")) return "en";
  return validValues[0];
};

const parseDate = (input?: string | number | Date | Dayjs): Dayjs => {
  if (input === undefined || input === null) {
    return dayjs("");
  }

  if (input === "now") {
    return dayjs();
  }

  return dayjs(input);
};

type FormatTimeOptions = {
  date?: string | number | Date | Dayjs;
  format?: string;
  lang?: string;
};

export const coreFormatTime = ({ date, format, lang }: FormatTimeOptions): string => {
  const d = parseDate(date);
  if (!d.isValid()) return "error";
  const locale = resolveLocale(lang || "en");
  const localized = d.locale(locale);
  return format ? localized.format(format) : localized.fromNow();
};

export const formatTimeByLang = (
  langCode: string,
  date?: string | number | Date | Dayjs,
): string => {
  return coreFormatTime({
    date,
    lang: langCode,
  });
};

export const formatDateByLang = (
  langCode: string,
  date?: string | number | Date | Dayjs,
): string => {
  const locale = resolveLocale(langCode);

  return coreFormatTime({
    date,
    lang: langCode,
    format: locale === "th" ? "D MMMM BBBB - dddd" : "LL - dddd",
  });
};
