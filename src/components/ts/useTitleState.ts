import { shallowRef } from "vue";

type WebTitleMap = Record<string, Record<string, string>>;

export const globalWebTitleMap = shallowRef<WebTitleMap>({});
