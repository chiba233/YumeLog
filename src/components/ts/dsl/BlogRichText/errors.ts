import commonI18n from "@/data/I18N/commonI18n.json";
import { $message } from "../../global/msgUtils.ts";
import { lang } from "../../global/setupLang.ts";

type I18nMap = Record<string, string>;
export const emitI18nError = (
  key: keyof typeof commonI18n,
  replacements: Record<string, string | number>,
  silent: boolean,
) => {
  if (silent) return;

  const entry = commonI18n[key] as unknown as I18nMap;
  let msg = entry[lang.value] || entry.en;

  for (const [k, v] of Object.entries(replacements)) {
    msg = msg.replace(`{${k}}`, String(v));
  }

  $message.error(msg, true, 3000);
};
