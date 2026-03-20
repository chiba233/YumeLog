// noinspection DuplicatedCode

import type { DSLError, DSLErrorCode } from "./dslError.ts";

export interface ParseDashObjectListOptions {
  onError?: (error: DSLError) => void;
}

export const parseDashObjectList = (
  content: string,
  options: ParseDashObjectListOptions = {},
): Record<string, string>[] => {
  const lines = content.split(/\r?\n/);
  const result: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;
  let multiKey: string | null = null;
  let multiBuffer: string[] = [];

  const emitError = (code: DSLErrorCode, raw: string): void => {
    options.onError?.({
      code,
      params: { raw: String(raw) },
    });
  };

  const flushMulti = (): void => {
    if (current && multiKey) {
      const indents = multiBuffer
        .filter((l) => l.trim() !== "")
        .map((l) => l.match(/^(\s*)/)?.[1].length ?? 0);

      const minIndent = indents.length ? Math.min(...indents) : 0;

      current[multiKey] = multiBuffer
        .map((l) => l.slice(minIndent))
        .join("\n")
        .trimEnd();
    }

    multiKey = null;
    multiBuffer = [];
  };

  const processValue = (raw: string): string => {
    return stripQuotes(raw.trim());
  };

  for (const raw of lines) {
    if (multiKey) {
      if (/^\s+/.test(raw) || raw.trim() === "") {
        if (raw.trim() === "") {
          multiBuffer.push("");
          continue;
        }

        multiBuffer.push(raw);
        continue;
      }

      flushMulti();
    }

    if (!raw.trim()) continue;

    if (raw.startsWith("- ") || raw.startsWith("  ")) {
      const isListItem = raw.startsWith("- ");

      if (isListItem) {
        flushMulti();

        if (current && Object.keys(current).length > 0) {
          result.push(current);
        }

        current = {};
      }

      if (!current) {
        emitError("dslIsolatedProperty", raw);
        continue;
      }

      const contentPart = isListItem ? raw.slice(2) : raw.trimStart();
      const i = contentPart.indexOf(": ");

      if (i === -1) {
        emitError("dslFormatError", raw);
        continue;
      }

      const key = contentPart.slice(0, i).trim();
      const valuePart = contentPart.slice(i + 2);

      if (valuePart.trim() === "|") {
        multiKey = key;
        continue;
      }

      current[key] = processValue(valuePart);
    } else {
      emitError("dslUnrecognizedLine", raw);
    }
  }

  flushMulti();

  if (current && Object.keys(current).length > 0) {
    result.push(current);
  }

  return result;
};

const stripQuotes = (value: string): string => {
  const len = value.length;
  if (len < 2) return value;

  const first = value[0];
  if ((first === "\"" || first === "'") && value[len - 1] === first) {
    const content = value.slice(1, -1);
    return content.includes("\\")
      ? content.replace(/\\(["\\])/g, (_: string, p1: string): string => p1)
      : content;
  }

  return value;
};
