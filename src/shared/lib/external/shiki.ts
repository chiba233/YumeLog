import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import ts from "shiki/langs/typescript.mjs";
import bash from "shiki/langs/bash.mjs";
import json from "shiki/langs/json.mjs";
import yaml from "shiki/langs/yaml.mjs";
import vue from "shiki/langs/vue.mjs";
import html from "shiki/langs/html.mjs";
import theme from "shiki/themes/github-light-high-contrast.mjs";
import type { ThemeRegistration } from "shiki/types";
import { PROJECT_DSL_LANGUAGES, SHIKI_THEME } from "@/shared/lib/external/shikiLanguages.ts";
import { isSSR } from "@/shared/lib/app/useHead.ts";

const projectTheme: ThemeRegistration = {
  ...theme,
  name: SHIKI_THEME,
  tokenColors: [
    ...(theme.tokenColors ?? []),
    {
      scope: [
        "entity.name.tag.blog-rich-text-dsl",
        "entity.name.tag.raw.blog-rich-text-dsl",
        "entity.name.tag.block.blog-rich-text-dsl",
        "keyword.control.directive.blog-block-dsl",
        "keyword.control.directive.meta.blog-block-dsl",
        "keyword.control.directive.text.blog-block-dsl",
        "keyword.control.directive.image.blog-block-dsl",
        "keyword.control.directive.divider.blog-block-dsl",
      ],
      settings: {
        foreground: "#0550AE",
        fontStyle: "bold",
      },
    },
    {
      scope: [
        "punctuation.definition.tag.begin.blog-rich-text-dsl",
        "punctuation.definition.tag.end.blog-rich-text-dsl",
        "punctuation.definition.directive.blog-block-dsl",
      ],
      settings: {
        foreground: "#CF222E",
        fontStyle: "bold",
      },
    },
    {
      scope: [
        "punctuation.section.arguments.begin.blog-rich-text-dsl",
        "punctuation.section.arguments.end.blog-rich-text-dsl",
        "punctuation.section.group.begin.blog-rich-text-dsl",
        "punctuation.section.group.end.blog-rich-text-dsl",
      ],
      settings: {
        foreground: "#6639BA",
      },
    },
    {
      scope: [
        "punctuation.separator.arguments.blog-rich-text-dsl",
        "punctuation.separator.key-value.blog-block-dsl",
        "punctuation.definition.list.begin.blog-block-dsl",
      ],
      settings: {
        foreground: "#953800",
        fontStyle: "bold",
      },
    },
    {
      scope: [
        "keyword.operator.raw.open.blog-rich-text-dsl",
        "keyword.operator.raw.close.blog-rich-text-dsl",
        "keyword.operator.block.open.blog-rich-text-dsl",
        "keyword.operator.block.close.blog-rich-text-dsl",
        "keyword.operator.block-scalar.blog-block-dsl",
      ],
      settings: {
        foreground: "#1A7F37",
        fontStyle: "bold",
      },
    },
    {
      scope: [
        "keyword.control.flow.end.blog-rich-text-dsl",
        "keyword.control.flow.end.blog-block-dsl",
      ],
      settings: {
        foreground: "#8250DF",
        fontStyle: "bold",
      },
    },
    {
      scope: ["variable.other.property.blog-block-dsl"],
      settings: {
        foreground: "#0A3069",
      },
    },
    {
      scope: [
        "string.unquoted.blog-block-dsl",
        "string.unquoted.block.blog-block-dsl",
        "string.unquoted.block.blog-rich-text-dsl",
      ],
      settings: {
        foreground: "#0A7EA4",
      },
    },
    {
      scope: [
        "constant.character.escape.blog-rich-text-dsl",
        "constant.character.escape.blog-block-dsl",
      ],
      settings: {
        foreground: "#116329",
      },
    },
  ],
};

const getWasm = async () => {
  if (!isSSR) {
    return import("shiki/wasm");
  } else {
    const m = await import("shiki/wasm");
    return m.default;
  }
};

let highlighter: HighlighterCore | null = null;
let loading: Promise<HighlighterCore> | null = null;

export const getShiki = (): Promise<HighlighterCore> => {
  if (highlighter) return Promise.resolve(highlighter);

  if (!loading) {
    loading = createOnigurumaEngine(getWasm)
      .then((engine) =>
        createHighlighterCore({
          themes: [projectTheme],
          langs: [ts, bash, json, yaml, vue, html, ...PROJECT_DSL_LANGUAGES],
          engine,
        }),
      )
      .then((h) => {
        highlighter = h;
        return h;
      });
  }

  return loading;
};
