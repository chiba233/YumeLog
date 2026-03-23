import { useStorage } from "@vueuse/core";
import type { Dayjs } from "dayjs";
import { ref, type Ref, watch } from "vue";
import type { SelectOption } from "@/shared/types/common.ts";
import {
  coreFormatTime,
  formatDateByLang,
  formatTimeByLang,
  resolvePreferredLang,
} from "./langCore.ts";

export const langMap: Ref<SelectOption[]> = ref([]);

const resolveSsgLang = (): string => {
  const rawEnvLang: unknown = import.meta.env?.VITE_SSR_LANG;
  if (typeof rawEnvLang !== "string") return "zh";

  const envLang = rawEnvLang.trim().toLowerCase();
  return envLang ? envLang.slice(0, 2) : "zh";
};

const rawLang = import.meta.env?.SSR ? resolveSsgLang() : navigator.language.slice(0, 2);
export const lang: Ref<string> = import.meta.env?.SSR
  ? ref(rawLang)
  : useStorage("useLang", rawLang);

watch(
  langMap,
  (newMap) => {
    if (newMap.length === 0) return;
    const nextLang = resolvePreferredLang(newMap, lang.value, rawLang);
    if (nextLang !== lang.value) {
      lang.value = nextLang;
    }
  },
  { immediate: true },
);

// 导出一个专门格式化时间的工具
type FormatOptions = {
  date?: string | number | Date | Dayjs;
  format?: string;
  lang?: string;
};
const isFormatOptions = (v: unknown): v is FormatOptions => {
  return typeof v === "object" && v !== null && "date" in v;
};
export const formatTime = (input?: string | number | Date | Dayjs | FormatOptions): string => {
  if (isFormatOptions(input)) {
    return coreFormatTime({
      date: input.date,
      format: input.format,
      lang: input.lang ?? lang.value,
    });
  }

  return formatTimeByLang(lang.value, input);
};
export const formatDate = (input?: string | number | Date | Dayjs | FormatOptions): string => {
  if (isFormatOptions(input)) {
    if (!input.format) {
      return formatDateByLang(input.lang ?? lang.value, input.date);
    }

    return coreFormatTime({
      date: input.date,
      format: input.format,
      lang: input.lang ?? lang.value,
    });
  }

  return formatDateByLang(lang.value, input);
};
