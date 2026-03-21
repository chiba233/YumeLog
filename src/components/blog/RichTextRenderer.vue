<script lang="ts" setup>
import type { RichType, TextToken } from "../ts/dsl/BlogRichText/types";
import { type Component, defineAsyncComponent, FunctionalComponent, h, VNode } from "vue";
import { NAlert, NCollapse, NCollapseItem } from "naive-ui";
import { isSSR } from "@/components/ts/global/useHead.ts";

const ShikiCodeBlock = defineAsyncComponent(() => import("@/components/blog/ShikiCodeBlock.vue"));

defineOptions({ name: "RichTextRenderer" });

const props = defineProps<{
  tokens: TextToken[];
  lang?: string;
}>();

type RenderTarget = string | Component | ReturnType<typeof defineAsyncComponent>;

interface CollapseWrapperProps {
  temp_id: string;
  title: string;
}
const CollapseWrapper: FunctionalComponent<CollapseWrapperProps> = (props, { slots }): VNode => {
  return h(
    NCollapse,
    {
      arrowPlacement: "left",
      displayDirective: "if",
      class: "rich-collapse-wrapper",
      defaultExpandedNames: isSSR ? [props.temp_id] : undefined,
    },
    {
      default: () =>
        h(
          NCollapseItem,
          {
            name: props.temp_id,
          },
          {
            header: () =>
              h("div", { class: "rich-collapse-header" }, [
                h("div", { class: "rich-collapse-title" }, props.title),
              ]),

            default: () => h("div", { class: "rich-collapse-body" }, slots.default?.() ?? []),
          },
        ),
    },
  );
};

const getComponentProps = (token: TextToken) => {
  const base: Record<string, unknown> = { lang: props.lang };

  switch (token.type) {
    case "link":
      return {
        ...base,
        href: getUrl(token),
        rel: "noopener noreferrer",
        target: "_blank",
      };

    case "info":
    case "warning":
      return {
        ...base,
        title: token.title,
        showIcon: true,
        bordered: true,
        type: token.type,
      };

    case "collapse":
      return {
        ...base,
        title: token.title ?? "",
        temp_id: token.temp_id,
      };

    case "raw-code":
      return {
        ...base,
        code: token.value as string,
        codeLang: token.codeLang,
        title: token.title,
        label: token.label,
      };

    default:
      return base;
  }
};

const getComponentClass = (token: TextToken) => {
  if (token.type === "raw-code") return "";

  return [
    `fw-${token.type}`,
    {
      "fw-link": token.type === "link",
      "rich-underline": token.type === "underline",
      "rich-strike": token.type === "strike",
      "center-text": token.type === "center",
      "code-text": token.type === "code",
      "rich-alert-block": token.type === "info",
      "rich-warning-block": token.type === "warning",
    },
  ];
};
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
  collapse: CollapseWrapper,
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
  <template v-for="token in tokens" :key="token.temp_id">
    <span
      v-if="token.type === 'text'"
      :lang="lang"
      class="rich-text-content"
      v-text="token.value"
    ></span>

    <component
      :is="tagMap[token.type] || 'span'"
      v-else
      v-bind="getComponentProps(token)"
      :class="getComponentClass(token)"
    >
      <RichTextRenderer
        v-if="Array.isArray(token.value) && token.value.length"
        :tokens="token.value"
        :lang="lang"
      />
      <template v-else-if="typeof token.value === 'string' && token.type !== 'raw-code'">
        {{ token.value }}
      </template>
    </component>
  </template>
</template>

<style lang="scss">
%common-style {
  word-break: break-word;
  font-size: 1.2rem;
  white-space: pre-wrap;
  color: var(--glass-font-color);
  text-shadow: var(--glass-text-shadow);
  letter-spacing: 0.02em;
  line-height: 1.6;
}

.rich-text-content,
.fw-bold,
.fw-thin,
.center-text,
.rich-underline,
.rich-strike {
  @extend %common-style;
}

.rich-collapse-wrapper {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;

  .n-collapse-item__header {
    align-items: center;
  }

  .n-collapse-item__header-extra {
    display: none !important;
  }

  .n-collapse-item__content-inner {
    padding: 0 !important;
  }

  .n-collapse-item__header-main {
    min-width: 0;
    flex: 1 1 auto;
  }

  .n-collapse-item-arrow {
    flex: 0 0 auto;
    margin-right: 0.4rem;
    align-self: center;
  }

  .n-collapse-item-arrow .n-base-icon,
  .n-collapse-item-arrow svg {
    width: 1.25rem;
    height: 1.25rem;
    display: block;
    stroke-width: 1px;
  }
}

.rich-collapse-header {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
}

.rich-collapse-title {
  min-width: 0;
  flex: 1 1 auto;
  text-align: left;
  font-size: 1.15rem;
  font-weight: bold;
  line-height: 1.25;
  color: rgb(var(--global-theme-rgb-deep)) !important;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.rich-collapse-body {
  min-width: 0;
}

.fw-bold {
  font-weight: bold;
}

.fw-thin {
  font-weight: lighter;
}

.center-text {
  margin: 0.5rem 0;
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
  overflow-wrap: anywhere;
  word-break: break-word;

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
  font-size: 0.8em;
  font-weight: bold;
  line-height: 1.4;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  display: inline !important;
  text-decoration: none !important;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;

  .rich-text-content,
  .center-text,
  .fw-link,
  .rich-underline,
  .fw-bold,
  .fw-thin,
  .rich-strike {
    font-size: 1em !important;
    line-height: inherit !important;
  }

  &,
  & * {
    color: var(--global-theme-color-deep) !important;
  }
}

.rich-warning-block,
.rich-alert-block {
  width: fit-content;
  max-width: 98%;
  display: block;
  margin: 0.5rem auto;
  clear: both;

  --n-border: none !important;
  border-radius: 12px;
  --n-title-text-color: #1f2225 !important;
  --n-content-text-color: #333 !important;
  --n-padding: 13px !important;

  .n-alert-body {
    padding-left: 13px !important;
    min-width: 0;
  }

  .n-alert__icon {
    flex: 0 0 auto;

    svg {
      min-width: 1.35rem;
      min-height: 1.35rem;
    }
  }

  .n-alert-body__title {
    padding-left: 2rem !important;
    padding-right: 2rem !important;
    text-align: center;
    word-break: break-word;
    overflow-wrap: anywhere;
    font-size: 1.4rem;
    white-space: pre-wrap;
    letter-spacing: 0.02em;
    line-height: 1.35;
  }

  .n-alert-body__content {
    min-width: 0;

    span {
      font-size: 1.1rem;
    }
  }

  .center-text {
    margin: 0 !important;
    padding: 0.2rem 0;
  }

  .fw-link,
  .fw-link * {
    color: #0060bb !important;
  }

  .code-text,
  .code-text * {
    color: var(--global-theme-color-deep) !important;
  }
}

.rich-warning-block {
  --n-color: rgba(250, 224, 181, 0.5) !important;

  .n-alert-body__title {
    color: #6b4e16 !important;
  }

  .rich-text-content,
  .fw-bold,
  .fw-thin,
  .center-text,
  .rich-underline,
  .rich-strike,
  .n-alert-body__content,
  .n-alert-body__content span,
  .n-alert-body__content div,
  .n-alert-body__content p,
  .n-alert-body__content strong,
  .n-alert-body__content em,
  .n-alert-body__content b,
  .n-alert-body__content i,
  .n-alert-body__content a:not(.fw-link) {
    color: #6b4e16 !important;
  }
}

.rich-alert-block {
  --n-color: rgba(199, 223, 251, 0.5) !important;

  .n-alert-body__title {
    color: #163d6b !important;
  }

  .rich-text-content,
  .fw-bold,
  .fw-thin,
  .center-text,
  .rich-underline,
  .rich-strike,
  .n-alert-body__content,
  .n-alert-body__content span,
  .n-alert-body__content div,
  .n-alert-body__content p,
  .n-alert-body__content strong,
  .n-alert-body__content em,
  .n-alert-body__content b,
  .n-alert-body__content i,
  .n-alert-body__content a:not(.fw-link) {
    color: #163d6b !important;
  }
}

@media (max-width: 768px) {
  %common-style {
    font-size: 1.08rem;
    line-height: 1.55;
  }

  .rich-collapse-title {
    font-size: 1.05rem;
    line-height: 1.3;
  }

  .rich-warning-block,
  .rich-alert-block {
    max-width: 100%;
    min-width: 0;

    .n-alert-body__title {
      font-size: 1.2rem;
      padding-left: 1.25rem !important;
      padding-right: 1.25rem !important;
    }

    .rich-text-content,
    .fw-bold,
    .fw-thin,
    .center-text,
    .rich-underline,
    .rich-strike,
    .n-alert-body__content,
    .n-alert-body__content span,
    .n-alert-body__content div,
    .n-alert-body__content p {
      font-size: 1.02rem !important;
      line-height: 1.45rem !important;
    }
  }
}
</style>
