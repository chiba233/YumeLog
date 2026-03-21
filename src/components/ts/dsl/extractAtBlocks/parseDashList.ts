// noinspection DuplicatedCode

import { createDSLTempId } from "./createDSLTempId.ts";
import type { DSLError, DSLErrorCode } from "./dslError.ts";
import { splitTextLines } from "./textLines.ts";

export interface ParseDashObjectListOptions {
  onError?: (error: DSLError) => void;
}

export const parseDashObjectList = (
  content: string,
  options: ParseDashObjectListOptions = {},
): Array<Record<string, string> & { temp_id: string }> => {
  return parseTypedDashObjectList<Record<string, string> & { temp_id: string }>(content, options);
};

export const parseTypedDashObjectList = <T extends { temp_id: string }>(
  content: string,
  options: ParseDashObjectListOptions = {},
): T[] => {
  const lines = splitTextLines(content);
  const result: T[] = [];
  let current: T | null = null;
  let multiKey: string | null = null;
  let multiBuffer: string[] = [];

  const emitError = (code: DSLErrorCode, raw: string): void => {
    options.onError?.({
      code,
      params: { raw: String(raw) },
    });
  };

  const hasMeaningfulFields = (value: T): boolean => {
    return Object.keys(value).some((key) => key !== "temp_id");
  };

  const flushMulti = (): void => {
    if (current && multiKey) {
      const indents = multiBuffer
        .filter((l) => l.trim() !== "")
        .map((l) => l.match(/^(\s*)/)?.[1].length ?? 0);

      const minIndent = indents.length ? Math.min(...indents) : 0;

      current[multiKey as keyof T] = multiBuffer
        .map((l) => l.slice(minIndent))
        .join("\n")
        .trimEnd() as T[keyof T];
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

        if (current && hasMeaningfulFields(current)) {
          result.push(current);
        }

        current = { temp_id: createDSLTempId("dsl-item") } as T;
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

      current[key as keyof T] = processValue(valuePart) as T[keyof T];
    } else {
      emitError("dslUnrecognizedLine", raw);
    }
  }

  flushMulti();

  if (current && hasMeaningfulFields(current)) {
    result.push(current);
  }

  return result;
};

const stripQuotes = (value: string): string => {
  const len = value.length;
  if (len < 2) return value;

  const first = value[0];
  if ((first === '"' || first === "'") && value[len - 1] === first) {
    const content = value.slice(1, -1);
    return content.includes("\\")
      ? content.replace(/\\(["\\])/g, (_: string, p1: string): string => p1)
      : content;
  }

  return value;
};
