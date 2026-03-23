import { useStorage } from "@vueuse/core";
import type { Dayjs } from "dayjs";
import { ref, type Ref, watch } from "vue";
import type { SelectOption } from "@/shared/types/common.ts";
import { formatDateByLang, formatTimeByLang, resolvePreferredLang } from "./langCore.ts";

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
export const formatTime = (date?: string | number | Date | Dayjs): string => {
  return formatTimeByLang(lang.value, date);
};

export const formatDate = (date?: string | number | Date | Dayjs): string => {
  return formatDateByLang(lang.value, date);
};
