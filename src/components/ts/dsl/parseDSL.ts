// noinspection DuplicatedCode

import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/components/ts/setupLang.ts";
import { $message } from "@/components/ts/msgUtils.ts";
type I18nMap = Record<string, string>;

export interface DSLNode {
  name: string;
  content: string;
}

export type DSLTree = DSLNode[];

export interface SyntaxConfig {
  blockPrefix: string;
  blockEnd: string;
}

export const syntax: SyntaxConfig = {
  blockPrefix: "@",
  blockEnd: "end",
};

const getBlockName = (line: string): string | null => {
  if (!line.startsWith(syntax.blockPrefix)) {
    return null;
  }

  const name = line.slice(syntax.blockPrefix.length).trim();

  if (!name) {
    return null;
  }

  return name;
};

export const parseDSL = (text: string): DSLTree => {
  text = text.replace(/^\uFEFF/, "");
  const lines = text.split(/\r\n|\n|\r/);

  const nodes: DSLNode[] = [];
  let currentName: string | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (!currentName) return;
    nodes.push({ name: currentName, content: buffer.join("\n").trim() });
    buffer = [];
    currentName = null;
  };

  for (const line of lines) {
    if (line.startsWith("\\")) {
      if (currentName) {
        buffer.push(line.slice(1));
      }
      continue;
    }

    const name = getBlockName(line);

    if (name !== null) {
      if (name === syntax.blockEnd) {
        flush();
        continue;
      }
      if (currentName) {
        const dslNestedBlockNotAllowed = commonI18n.dslNestedBlockNotAllowed as I18nMap;
        const dslNestedBlockNotAllowedMsg = (
          dslNestedBlockNotAllowed[lang.value] || dslNestedBlockNotAllowed.en
        ).replace("{name}", String(name));
        $message.error(dslNestedBlockNotAllowedMsg, true, 3000);
      }
      flush();
      currentName = name;
      continue;
    }

    if (currentName) {
      buffer.push(line);
    }
  }

  flush();
  if (currentName) {
    const dslBlockNotClosed = commonI18n.dslBlockNotClosed as I18nMap;
    const dslBlockNotClosedMsg = (dslBlockNotClosed[lang.value] || dslBlockNotClosed.en).replace(
      "{name}",
      String(currentName),
    );
    $message.error(dslBlockNotClosedMsg, true, 3000);
  }
  return nodes;
};
