import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import wasm from "shiki/wasm";

import ts from "shiki/langs/typescript.mjs";
import js from "shiki/langs/javascript.mjs";
import bash from "shiki/langs/bash.mjs";
import json from "shiki/langs/json.mjs";
import yaml from "shiki/langs/yaml.mjs";

import theme from "shiki/themes/github-light-high-contrast.mjs";

let highlighter: HighlighterCore | null = null;
let loading: Promise<HighlighterCore> | null = null;

export function getShiki(): Promise<HighlighterCore> {
  if (highlighter) return Promise.resolve(highlighter);

  if (!loading) {
    loading = createOnigurumaEngine(() => wasm)
      .then((engine) => {
        return createHighlighterCore({
          themes: [theme],
          langs: [ts, js, bash, json, yaml],
          engine,
        });
      })
      .then((h) => {
        highlighter = h;
        return h;
      });
  }

  return loading;
}
