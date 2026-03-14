<script lang="ts" setup>
import { type Component, onMounted, ref } from "vue";
import { NAlert } from "naive-ui";
import type { RichType, TextToken } from "./ts/d";
import ShikiCodeBlock from "./ShikiCodeBlock.vue";
import { getShiki } from "@/components/ts/shiki.ts";
import { HighlighterCore } from "shiki/core";

const highlighter = ref<HighlighterCore | null>(null);

onMounted(async () => {
  highlighter.value = await getShiki();
});

defineOptions({ name: "RichTextRenderer" });

defineProps<{
  tokens: TextToken[];
  lang?: string;
}>();

type RenderTarget = string | Component;

const tagMap: Record<RichType, RenderTarget> = {
  bold: "strong",
  thin: "span",
  underline: "span",
  strike: "span",
  center: "span",
  code: "span",
  link: "a",
  info: NAlert,
  warning: NAlert,
  "raw-code": ShikiCodeBlock,
};

const getUrl = (token: TextToken) => (token.url ? normalizeUrl(token.url) : undefined);
const normalizeUrl = (raw: string): string | undefined => {
  if (!raw) return undefined;
  try {
    const url = raw.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//)
      ? new URL(raw)
      : new URL("https://" + raw);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
};
</script>

<template>
  <template v-for="(token, index) in tokens" :key="index">
    <span
      v-if="token.type === 'text'"
      :lang="lang"
      class="rich-text-content"
      v-text="token.value"
    ></span>

    <component
      :is="tagMap[token.type] || 'span'"
      v-else
      :lang="lang"
      :bordered="true"
      :href="token.type === 'link' ? getUrl(token) : undefined"
      :rel="token.type === 'link' ? 'noopener noreferrer' : undefined"
      :target="token.type === 'link' ? '_blank' : undefined"
      v-bind="
        token.type === 'raw-code'
          ? {
              code: token.value as string,
              codeLang: token.codeLang,
              title: token.title,
              label: token.label,
              highlighter: highlighter || null,
            }
          : {}
      "
      :class="[
        token.type !== 'raw-code' ? `fw-${token.type}` : '',
        {
          'fw-link': token.type === 'link',
          'rich-underline': token.type === 'underline',
          'rich-strike': token.type === 'strike',
          'center-text': token.type === 'center',
          'code-text': token.type === 'code',
          'rich-alert-block': token.type === 'info',
          'rich-warning-block': token.type === 'warning',
        },
      ]"
      :show-icon="token.type === 'info' || token.type === 'warning'"
      :title="token.title"
      :type="token.type === 'info' || token.type === 'warning' ? token.type : undefined"
    >
      <RichTextRenderer
        v-if="Array.isArray(token.value) && token.value.length"
        :tokens="token.value"
        :lang="lang"
      />
      <template v-else-if="typeof token.value === 'string' && token.type !== 'raw-code'"
        >{{ token.value }}
      </template>
    </component>
  </template>
</template>

<style lang="scss">
%common-style {
  word-break: break-word;
  font-size: 1.25rem;
  white-space: pre-wrap;
  color: #2b2628;
  text-shadow:
    0 1px 1px rgba(255, 255, 255, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.08);
  letter-spacing: 0.02em;
  line-height: 1.6;
}

.rich-text-content:not(.fw-link):not(.code-text),
[class^="fw-"]:not(.fw-link):not(.code-text),
[class^="rich-"]:not(.fw-link):not(.code-text) {
  @extend %common-style;
}

.fw-bold {
  font-weight: bold;
}

.fw-thin {
  font-weight: lighter;
}

.center-text {
  margin: 0.5rem;
  display: block;
  text-align: center;
}

.fw-link {
  @extend %common-style;
  cursor: pointer;
  text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.1);
  text-decoration: none !important;
  -webkit-text-decoration: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
  background-image: none !important;

  &,
  & * {
    color: #0060bb !important;
  }
}

a,
a.fw-link {
  text-decoration: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
}

.rich-underline {
  text-decoration: underline !important;
  text-decoration-thickness: 1.2px;
  text-underline-offset: 2px;

  &:has(.fw-link) {
    text-decoration-color: #0060bb !important;
  }

  &:has(.code-text) {
    text-decoration-color: var(--global-theme-color-deep) !important;
  }
}

.rich-strike {
  text-decoration: line-through !important;

  &:has(.fw-link) {
    text-decoration-color: #0060bb !important;
  }

  &:has(.code-text) {
    text-decoration-color: var(--global-theme-color-deep) !important;
  }
}

.code-text {
  font-family: "SFMono-Regular", Consolas, monospace;
  background-color: rgba(var(--global-theme-rgb-deep), 0.13) !important;
  padding: 0.2em 0.35em;
  border-radius: 6px;
  font-size: 0.85em;
  font-weight: bold;
  line-height: 1.4;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  display: inline !important;
  text-decoration: none !important;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  z-index: 3;
  &,
  & * {
    color: var(--global-theme-color-deep) !important;
  }
}

.rich-warning-block,
.rich-alert-block {
  max-width: 98%;
  min-width: 45%;
  width: fit-content;
  display: block;
  margin: 0.5rem auto;
  clear: both;
  z-index: 3;

  --n-border: none !important;
  border-radius: 12px;
  --n-title-text-color: #1f2225 !important;
  --n-content-text-color: #333 !important;
  --n-padding: 13px !important;

  .fw-link {
    &,
    & * {
      color: #0060bb !important;
    }
  }

  .n-alert-body {
    padding-left: 13px !important;
  }

  .n-alert__icon {
    svg {
      min-width: 1.35rem;
      min-height: 1.35rem;
    }
  }

  .rich-text-content:not(.fw-link):not(.code-text),
  .rich-warning-block,
  .rich-alert-block,
  [class^="fw-"]:not(.fw-link):not(.code-text),
  [class^="rich-"]:not(.fw-link):not(.code-text) {
    font-size: 1.15rem;
    line-height: 1.5rem;
  }

  .n-alert-body__title {
    padding-left: 2rem !important;
    padding-right: 2rem !important;
    text-align: center;
    word-break: break-word;
    font-size: 1.4rem;
    white-space: pre-wrap;
    color: inherit;
    letter-spacing: 0.02em;
  }

  .n-alert-body__content {
    span {
      font-size: 1.1rem;
      color: inherit;
    }
  }
}

.rich-warning-block {
  .center-text {
    margin: 0 !important;
    padding: 0.2rem 0;
  }

  --n-color: rgba(250, 224, 181, 0.5) !important;

  .n-alert-body__title {
    color: #6b4e16 !important;
  }

  .rich-text-content:not(.fw-link):not(.code-text),
  [class^="fw-"]:not(.fw-link):not(.code-text),
  [class^="rich-"]:not(.fw-link):not(.code-text) {
    color: #6b4e16;
  }
}

.rich-alert-block {
  .center-text {
    margin: 0 !important;
    padding: 0.2rem 0;
  }

  --n-color: rgb(199, 223, 251, 0.5) !important;

  .n-alert-body__title {
    color: #163d6b !important;
  }

  .rich-text-content:not(.fw-link):not(.code-text),
  [class^="fw-"]:not(.fw-link):not(.code-text),
  [class^="rich-"]:not(.fw-link):not(.code-text) {
    color: #163d6b;
  }
}
</style>
