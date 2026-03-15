<script lang="ts" setup>
import { onBeforeMount, onServerPrefetch, shallowRef, watch } from "vue";
import type { HighlighterCore } from "shiki/core";
import type { ThemedToken } from "shiki";
import { $message } from "@/components/ts/msgUtils.ts";
import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/components/ts/setupLang.ts";
import { getShiki } from "@/components/ts/shiki.ts";

type I18nMap = Record<string, string>;
type CodeLang = "typescript" | "html" | "bash" | "json" | "yaml" | "text" | "vue";

interface Props {
  code: string;
  codeLang?: CodeLang;
  label?: string;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  codeLang: "text",
  label: "",
  title: "",
});

const tokenLines = shallowRef<ThemedToken[][]>([]);
const internalHighlighter = shallowRef<HighlighterCore | null>(null);

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

const updateTokens = () => {
  const h = internalHighlighter.value;
  if (!h) return;

  try {
    const cleanCode = dedent(props.code);
    tokenLines.value = h.codeToTokens(cleanCode, {
      lang: props.codeLang,
      theme: "github-light-high-contrast",
    }).tokens;
  } catch (e) {
    if (import.meta.env.SSR) {
      console.error("[Shiki Error]:", e);
    }
    const ShikiErrorLanguage = commonI18n.ShikiErrorLanguage as I18nMap;
    $message.error(ShikiErrorLanguage[lang.value], true, 3000);
    tokenLines.value = [];
  }
};

const init = async () => {
  internalHighlighter.value = await getShiki();
  updateTokens();
};

if (import.meta.env.SSR) {
  onServerPrefetch(async () => {
    await init();
  });
}

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
      <span class="code-title">{{ title }}</span>
      <span class="code-lang-label">{{ codeLang }}</span>
    </div>

    <pre class="shiki-canvas"><code v-if="tokenLines.length"><span
      v-for="(line,lineIdx) in tokenLines"
      :key="lineIdx"
      class="line"
    ><span
      v-for="(token,tokenIdx) in line"
      :key="tokenIdx"
      :style="{ color: token.color }"
      v-text="token.content"
    /></span></code><code
      v-else
      class="fallback-code "
      v-text="code"
    /></pre>
  </div>
</template>

<style lang="scss" scoped>
.shiki-code-block-container.light-theme {
  margin: 1.2rem auto;
  border-radius: 10px;
  overflow: hidden;
  background-color: rgba(var(--global-theme-color-rgb), 0.3) !important;
  border: 1px solid var(--global-theme-color-rgb);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  max-width: 95%;
  z-index: 3;

  .code-block-header {
    background-color: rgba(var(--global-theme-color-rgb), 0.15) !important;
    padding: 4px 12px;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid var(--global-theme-color-rgb);
    .code-title {
      font-size: 12px;
      font-weight: 600;
      opacity: 0.85;
      font-family:
        system-ui,
        -apple-system,
        Segoe UI,
        Roboto,
        sans-serif;
    }
    .code-lang-label {
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
      display: block !important;
      background: transparent !important;
      padding: 0 !important;
      border-radius: 0 !important;
      text-shadow: none !important;
    }

    .line {
      font-family:
        "Noto Sans Mono CJK SC", "Noto Sans Mono CJK JP", ui-monospace, SFMono-Regular, Menlo,
        Monaco, Consolas, monospace;
      display: block;
      white-space: pre;
      filter: contrast(1.15);
    }

    .fallback-code {
      font-family:
        "Noto Sans Mono CJK SC", "Noto Sans Mono CJK JP", ui-monospace, SFMono-Regular, Menlo,
        Monaco, Consolas, monospace;
      white-space: pre;
      display: block;
      filter: contrast(1.1);
    }
  }
}
</style>
