<script lang="ts" setup>
defineOptions({
  name: "RichTextRenderer",
});
import { RichType } from "@/components/ts/blogFormat.ts";

interface TextToken {
  type: RichType | "text";
  value: string | TextToken[];
  url?: string;
}

type HtmlTag = keyof HTMLElementTagNameMap;

defineProps<{
  tokens: TextToken[]
}>();

const tagMap: Record<RichType, HtmlTag> = {
  bold: "strong",
  thin: "span",
  underline: "span",
  strike: "span",
  center: "span",
  code: "span",
  link: "a",
};
const getUrl = (token: TextToken) =>
  token.url ? normalizeUrl(token.url) : undefined;

const normalizeUrl = (raw: string): string | undefined => {
  if (!raw) return undefined;
  try {
    const url = raw.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//)
      ? new URL(raw)
      : new URL("https://" + raw);

    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
};

</script>

<template>
  <template v-for="(token, index) in tokens" :key="index">

    <span
      v-if="token.type === 'text'"
      class="rich-text-content"
    >
      {{ token.value }}
    </span>

    <component
      :is="tagMap[token.type] || 'span'"
      v-else
      :class="[
        `fw-${token.type}`,
        {
          'fw-link': token.type === 'link',
          'rich-underline': token.type === 'underline',
          'rich-strike': token.type === 'strike',
          'center-text': token.type === 'center',
          'code-text': token.type === 'code'
        }
      ]"
      :href="token.type === 'link' ? getUrl(token) : undefined"
      :rel="token.type === 'link' ? 'noopener noreferrer' : undefined"
      :target="token.type === 'link' ? '_blank' : undefined"
    >
      <RichTextRenderer
        v-if="Array.isArray(token.value) && token.value.length"
        :tokens="token.value"
      />
    </component>

  </template>
</template>

<style lang="scss" scoped>
%common-style {
  word-break: break-word;
  font-size: inherit;
  white-space: pre-wrap;
  color: inherit;
  letter-spacing: 0.02em;
  line-height: 1.8;
}

.rich-text-content,
[class^="fw-"],
[class^="rich-"] {
  @extend %common-style;
}

.fw-bold {
  font-weight: bold;
}

.fw-thin {
  font-weight: 300;
}

.center-text {
  margin: 0.8rem;
  display: block;
  text-align: center;
}

.fw-link {
  @extend %common-style;
  cursor: pointer;
  color: #0060bb !important;
  text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.1);
  text-decoration: none !important;
  -webkit-text-decoration: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
  background-image: none !important;
}

:deep(a), a.fw-link {
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
    text-decoration-color: #fd80bd !important;
  }
}

.rich-strike {
  text-decoration: line-through !important;

  &:has(.fw-link) {
    text-decoration-color: #0060bb !important;
  }

  &:has(.code-text) {
    text-decoration-color: #fd80bd !important;
  }
}

.code-text {
  font-family: "SFMono-Regular", Consolas, monospace;
  background: rgba(27, 31, 35, .15);
  padding: 0.15em 0.35em;
  border-radius: 4px;
  font-size: .85em;
  font-weight: 600;
  color: #fd80bd;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.8);
}


</style>