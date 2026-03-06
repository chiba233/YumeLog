<script lang="ts" setup>
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

const tagMap: Record<string, HtmlTag> = {
  bold: "strong",
  thin: "span",
  underline: "u",
  strike: "del",
  center: "div",
};

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
    <span v-if="token.type === 'text'" class="rich-text-content">{{ token.value }}</span>
    <a
      v-else-if="token.type === 'link'"
      :href="normalizeUrl(token.url || '')"
      class="fw-link"
      rel="noopener noreferrer"
      target="_blank"
    >
      <RichTextRenderer
        v-if="Array.isArray(token.value) && token.value.length"
        :tokens="token.value"
      />
    </a>

    <component
      :is="tagMap[token.type] || 'span'"
      v-else
      :class="[`fw-${token.type}`, { 'rich-underline': token.type === 'underline', 'rich-strike': token.type === 'strike', 'center-text': token.type === 'center' }]"
    >
      <RichTextRenderer
        v-if="Array.isArray(token.value) && token.value.length"
        :tokens="token.value"
      />
    </component>
  </template>
</template>

<style lang="scss" scoped>
.rich-text-wrapper {
  --rt-color: #191919;
  color: var(--rt-color);
}

%common-style {
  font-size: inherit;
  white-space: pre-wrap;
  color: inherit;
  letter-spacing: 0.02em;
  line-height: 1.8;
}

.rich-text-content, .fw-bold, .fw-thin, .rich-underline, .rich-strike, .fw-link {
  @extend %common-style;
}

.fw-link {
  cursor: pointer;
  color: #007bff;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
  text-decoration: underline;

  &, & * {
    color: #007bff;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
  }
}

.fw-bold {
  font-weight: bold;
}

.fw-thin {
  font-weight: 300;
}

.center-text {
  text-align: center;
  margin: 0.8rem;
}
</style>