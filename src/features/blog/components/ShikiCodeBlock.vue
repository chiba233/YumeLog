<script lang="ts" setup>
import { computed, type CSSProperties, onBeforeMount, shallowRef, watch } from "vue";
import type { HighlighterCore } from "shiki/core";
import type { ThemedToken } from "shiki";
import { $message } from "@/shared/lib/app/msgUtils.ts";
import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/shared/lib/app/setupLang.ts";
import { getShiki } from "@/shared/lib/external/shiki.ts";
import { type SupportedCodeLang } from "@/shared/lib/external/codeLang.ts";
import { SHIKI_THEME } from "@/shared/lib/external/shikiLanguages.ts";
import { type HighlightToken, tokenizeYumeDsl } from "@/shared/lib/external/yumeDslHighlight.ts";
import { isSSR } from "@/shared/lib/app/useHead";

type I18nMap = Record<string, string>;

interface Props {
  code: string;
  codeLang?: SupportedCodeLang;
  label?: string;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  codeLang: "text",
  label: "",
  title: "",
});

interface RenderToken {
  content: string;
  style?: CSSProperties;
}

const tokenLines = shallowRef<RenderToken[][]>([]);
const internalHighlighter = shallowRef<HighlighterCore | null>(null);
const copied = shallowRef(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;
const copyCodeText = computed(() => (commonI18n.copyCode as I18nMap)[lang.value]);
const copiedCodeText = computed(() => (commonI18n.copiedCode as I18nMap)[lang.value]);
const copyFailedText = computed(() => (commonI18n.copyFailed as I18nMap)[lang.value]);
const clipboardApiUnavailable = computed(
  () => (commonI18n.clipboardApiUnavailable as I18nMap)[lang.value],
);

const SHIKI_FONT_STYLE_NOT_SET = -1;
const SHIKI_FONT_STYLE_NONE = 0;
const SHIKI_FONT_STYLE_ITALIC = 1;
const SHIKI_FONT_STYLE_BOLD = 2;
const SHIKI_FONT_STYLE_UNDERLINE = 4;
const SHIKI_FONT_STYLE_STRIKETHROUGH = 8;

const dedent = (code: string): string => {
  if (!code) return "";
  const lines = code.replace(/\t/g, "  ").split("\n");
  const indents = lines.filter((l) => l.trim().length).map((l) => l.match(/^ */)![0].length);
  const minIndent = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => l.slice(minIndent))
    .join("\n")
    .trim();
};

const normalizedCode = computed(() => dedent(props.code));

const hasShikiFontStyle = (
  fontStyle: ThemedToken["fontStyle"] | undefined,
  flag: number,
): boolean => {
  const resolvedFontStyle = Number(fontStyle ?? SHIKI_FONT_STYLE_NOT_SET);

  if (
    resolvedFontStyle === SHIKI_FONT_STYLE_NOT_SET ||
    resolvedFontStyle === SHIKI_FONT_STYLE_NONE
  ) {
    return false;
  }

  return (resolvedFontStyle & flag) !== 0;
};

const getDecoration = (fontStyle?: ThemedToken["fontStyle"]): CSSProperties["textDecoration"] => {
  const decorations: string[] = [];
  if (hasShikiFontStyle(fontStyle, SHIKI_FONT_STYLE_UNDERLINE)) decorations.push("underline");
  if (hasShikiFontStyle(fontStyle, SHIKI_FONT_STYLE_STRIKETHROUGH)) {
    decorations.push("line-through");
  }

  return decorations.length > 0 ? decorations.join(" ") : undefined;
};

const getShikiTokenStyle = (token: Pick<ThemedToken, "color" | "fontStyle">): CSSProperties => {
  return {
    color: token.color,
    fontStyle: hasShikiFontStyle(token.fontStyle, SHIKI_FONT_STYLE_ITALIC) ? "italic" : undefined,
    fontWeight: hasShikiFontStyle(token.fontStyle, SHIKI_FONT_STYLE_BOLD) ? "bold" : undefined,
    textDecoration: getDecoration(token.fontStyle),
  };
};

const getHighlightTokenStyle = (token: HighlightToken): CSSProperties => {
  return {
    color: token.color,
    fontStyle: token.fontStyle === "italic" ? "italic" : undefined,
    fontWeight: token.fontStyle === "bold" ? "bold" : undefined,
  };
};

const normalizeShikiTokenLines = (lines: ThemedToken[][]): RenderToken[][] => {
  return lines.map((line) =>
    line.map((token) => ({
      content: token.content,
      style: getShikiTokenStyle(token),
    })),
  );
};

const normalizeHighlightTokenLines = (lines: HighlightToken[][]): RenderToken[][] => {
  return lines.map((line) =>
    line.map((token) => ({
      content: token.content,
      style: getHighlightTokenStyle(token),
    })),
  );
};

const updateTokens = () => {
  const h = internalHighlighter.value;
  if (!h) return;

  try {
    const cleanCode = normalizedCode.value;
    if (props.codeLang === "yumeDSL") {
      tokenLines.value = normalizeHighlightTokenLines(tokenizeYumeDsl(cleanCode));
      return;
    }
    tokenLines.value = normalizeShikiTokenLines(
      h.codeToTokens(cleanCode, {
        lang: props.codeLang,
        theme: SHIKI_THEME,
      }).tokens,
    );
  } catch (e) {
    if (import.meta.env.SSR) {
      console.error("[Shiki Error]:", e);
    }
    const ShikiErrorLanguage = commonI18n.ShikiErrorLanguage as I18nMap;
    $message.error(ShikiErrorLanguage[lang.value], true, 3000);
    tokenLines.value = [];
  }
};

const navigatorClipboardUnSupport = () => {
  if (isSSR) return console.log("clipboard unSupport!");
  $message.error(clipboardApiUnavailable.value, true, 2500);
};
const copyCode = async (): Promise<void> => {
  const text = normalizedCode.value;
  try {
    if (!navigator?.clipboard?.writeText) {
      return navigatorClipboardUnSupport();
    }
    await navigator.clipboard.writeText(text);
    copied.value = true;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch (err) {
    console.error("[Copy Error]:", err);
    $message.error(copyFailedText.value, true, 2500);
  }
};

const init = async () => {
  internalHighlighter.value = await getShiki();
  updateTokens();
};

// if (import.meta.env.SSR) {
//   onServerPrefetch(async () => {
//     await init();
//   });
// }

onBeforeMount(async () => {
  if (tokenLines.value.length === 0) {
    await init();
  } else {
    await getShiki().then((h) => {
      internalHighlighter.value = h;
    });
  }
});

watch(internalHighlighter, () => updateTokens());
watch(
  () => props.code,
  () => updateTokens(),
);
watch(
  () => props.codeLang,
  () => updateTokens(),
);
</script>

<template>
  <div class="shiki-code-block-container light-theme">
    <div v-if="label || codeLang" class="code-block-header">
      <div class="code-header-main">
        <span :lang="lang" class="code-title">{{ title }}</span>
        <span class="code-lang-label">{{ codeLang }}</span>
      </div>
    </div>

    <button
      :aria-label="copied ? copiedCodeText : copyCodeText"
      :class="{ copied }"
      class="copy-floating-button"
      type="button"
      @click="copyCode"
    >
      {{ copied ? copiedCodeText : copyCodeText }}
    </button>

    <pre class="shiki-canvas"><code
      v-if="tokenLines.length"
      class="code-lines"
    ><span
      v-for="(line, lineIdx) in tokenLines"
      :key="lineIdx"
      class="line"
    ><span
      v-for="(token, tokenIdx) in line"
      :key="tokenIdx"
      :style="token.style"
      v-text="token.content"
    /></span></code><code
      v-else
      class="fallback-code"
      v-text="code"
    /></pre>
  </div>
</template>

<style lang="scss" scoped>
.shiki-code-block-container.light-theme {
  position: relative;
  margin: 1.2rem auto;
  border-radius: 10px;
  overflow: hidden;
  background-color: rgba(var(--global-theme-color-rgb), 0.3) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  max-width: 95%;
  z-index: 3;
  .copy-floating-button {
    position: absolute;
    top: 2.5rem;
    right: 1rem;
    z-index: 6;
    border: none;
    background:
      linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)),
      rgb(var(--global-theme-color-rgb));
    color: var(--global-theme-color-deep);
    border-radius: 999px;
    padding: 0.35rem 0.6rem;
    font-size: 12px;
    line-height: 1;
    font-weight: 600;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);

    transition:
      opacity 0.18s ease,
      transform 0.18s ease,
      box-shadow 0.18s ease,
      background-color 0.18s ease;
  }

  &:hover .copy-floating-button,
  &:focus-within .copy-floating-button,
  .copy-floating-button.copied {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .copy-floating-button:hover {
    transform: translateY(-1px);
    background:
      linear-gradient(rgba(255, 255, 255, 0.43), rgba(255, 255, 255, 0.43)),
      rgb(var(--global-theme-color-rgb));
  }

  .copy-floating-button:active {
    transform: scale(0.98);
    background:
      linear-gradient(rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.35)),
      rgb(var(--global-theme-color-rgb));
  }

  .copy-floating-button.copied {
    background:
      linear-gradient(rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.35)),
      rgb(var(--global-theme-color-rgb));
  }

  .code-block-header {
    background-color: rgba(var(--global-theme-color-rgb), 0.15) !important;
    padding: 4px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    min-width: 0;
    border-bottom: 1px solid var(--global-theme-color-rgb);

    .code-header-main {
      min-width: 0;
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }

    .code-title {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 12px;
      font-weight: 600;
      opacity: 0.85;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family:
        system-ui,
        -apple-system,
        Segoe UI,
        Roboto,
        sans-serif;
    }

    .code-lang-label {
      flex: 0 0 auto;
      white-space: nowrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 600;
      text-transform: lowercase;
    }
  }

  .shiki-canvas {
    margin: 0;
    padding: 1rem;
    overflow: auto;
    font-size: 0.95rem;
    line-height: 1.7;
    background-color: rgba(255, 255, 255, 0.3);
    font-weight: 500;
    max-height: 35em;

    &::-webkit-scrollbar {
      width: 6px !important;
      height: 6px !important;
      display: block !important;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(var(--global-theme-rgb-deep), 0.3);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(var(--global-theme-rgb-deep), 0.1);
    }

    code {
      font-family:
        "Fira Code", "Cascadia Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        monospace;
      background: transparent !important;
      padding: 0 !important;
      border-radius: 0 !important;
      text-shadow: none !important;
    }

    .code-lines {
      display: inline-block !important;
      min-width: 100%;
    }

    .line {
      position: relative;
      display: block;
      width: 100%;
      white-space: pre;
      filter: contrast(1.15);
      font-family:
        "Noto Sans Mono CJK SC", "Noto Sans Mono CJK JP", ui-monospace, SFMono-Regular, Menlo,
        Monaco, Consolas, monospace;
    }

    .line::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 1px;
      pointer-events: none;
      background: linear-gradient(
        to bottom,
        transparent calc(100% - 1px),
        rgba(var(--global-theme-rgb-deep), 0.4) 100%
      );
    }

    .fallback-code {
      position: relative;
      display: block;
      white-space: pre;
      filter: contrast(1.1);
      font-family:
        "Noto Sans Mono CJK SC", "Noto Sans Mono CJK JP", ui-monospace, SFMono-Regular, Menlo,
        Monaco, Consolas, monospace;
    }

    .fallback-code::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 1px;
      pointer-events: none;
      background: linear-gradient(
        to bottom,
        transparent calc(100% - 1px),
        rgba(var(--global-theme-rgb-deep), 0.4) 100%
      );
    }
  }
}
</style>
