import { ref, shallowRef } from "vue";

type WebTitleMap = Record<string, Record<string, string>>;

export const globalWebTitleMap = shallowRef<WebTitleMap>({});

export const dynamicTitlePrefix = ref<string>("");