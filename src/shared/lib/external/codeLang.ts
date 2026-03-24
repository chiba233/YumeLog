export const BUILTIN_LANGUAGE_IDS = [
  "typescript",
  "bash",
  "json",
  "yaml",
  "vue",
  "html",
  "text",
] as const;

export const PROJECT_LANGUAGE_IDS = ["yumeDSL"] as const;

export const SHIKI_LANGUAGE_IDS = [...BUILTIN_LANGUAGE_IDS, ...PROJECT_LANGUAGE_IDS] as const;
export type SupportedCodeLang = (typeof SHIKI_LANGUAGE_IDS)[number];

const LANGUAGE_ALIAS_MAP: Record<string, SupportedCodeLang> = {
  bash: "bash",
  sh: "bash",
  shell: "bash",
  html: "html",
  json: "json",
  text: "text",
  txt: "text",
  plain: "text",
  plaintext: "text",
  ts: "typescript",
  js: "typescript",
  javascript: "typescript",
  typescript: "typescript",
  vue: "vue",
  yaml: "yaml",
  yml: "yaml",
  yumedsl: "yumeDSL",
};

export const resolveSupportedCodeLang = (codeLang?: string): SupportedCodeLang | undefined => {
  if (!codeLang) return undefined;
  return LANGUAGE_ALIAS_MAP[codeLang.trim().toLowerCase()];
};
