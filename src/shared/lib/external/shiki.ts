import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import ts from "shiki/langs/typescript.mjs";
import bash from "shiki/langs/bash.mjs";
import json from "shiki/langs/json.mjs";
import yaml from "shiki/langs/yaml.mjs";
import vue from "shiki/langs/vue.mjs";
import html from "shiki/langs/html.mjs";
import theme from "shiki/themes/github-light-high-contrast.mjs";

const getWasm = async () => {
  if (typeof window !== "undefined") {
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
          themes: [theme],
          langs: [ts, bash, json, yaml, vue, html],
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
