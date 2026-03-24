// noinspection DuplicatedCode

import {
  DASH_LIST_INDENT,
  DASH_LIST_MARKER,
  MULTILINE_INDICATOR,
  TEMP_ID_PREFIX_ITEM,
} from "./constants.ts";
import { createDSLTempId } from "./createDSLTempId.ts";
import type { DSLError, DSLErrorCode } from "./dslError.ts";
import { findKeySeparator, splitTextLines } from "./textLines.ts";

export interface ParseDashObjectListOptions {
  onError?: (error: DSLError) => void;
}

export interface DashListLineAnalysis {
  indent: string;
  isListItem: boolean;
  key: string;
  spacingAfterSeparator: string;
  rawValue: string;
  isMultiline: boolean;
}

export interface PropertyLineAnalysis {
  indent: string;
  key: string;
  spacingAfterSeparator: string;
  rawValue: string;
  isMultiline: boolean;
}

export const analyzeDashListLine = (line: string): DashListLineAnalysis | null => {
  if (!line.trim()) return null;
  if (!line.startsWith(DASH_LIST_MARKER) && !line.startsWith(DASH_LIST_INDENT)) return null;

  const indentLength = line.length - line.trimStart().length;
  const indent = line.slice(0, indentLength);
  const trimmed = line.slice(indentLength);
  const isListItem = trimmed.startsWith(DASH_LIST_MARKER);
  const contentPart = isListItem ? trimmed.slice(DASH_LIST_MARKER.length) : trimmed;
  const sep = findKeySeparator(contentPart);

  if (!sep) return null;

  const key = contentPart.slice(0, sep.index).trim();
  const afterColon = contentPart.slice(sep.index + 1);
  const spacingLength = afterColon.length - afterColon.trimStart().length;
  const spacingAfterSeparator = afterColon.slice(0, spacingLength);
  const rawValue = afterColon.slice(spacingLength);

  return {
    indent,
    isListItem,
    key,
    spacingAfterSeparator,
    rawValue,
    isMultiline: rawValue.trim() === MULTILINE_INDICATOR,
  };
};

export const analyzePropertyLine = (line: string): PropertyLineAnalysis | null => {
  if (!line.trim()) return null;

  const indentLength = line.length - line.trimStart().length;
  const indent = line.slice(0, indentLength);
  const trimmed = line.slice(indentLength);
  const sep = findKeySeparator(trimmed);

  if (!sep) return null;

  const key = trimmed.slice(0, sep.index).trim();
  if (!key) return null;

  const afterColon = trimmed.slice(sep.index + 1);
  const spacingLength = afterColon.length - afterColon.trimStart().length;
  const spacingAfterSeparator = afterColon.slice(0, spacingLength);
  const rawValue = afterColon.slice(spacingLength);

  return {
    indent,
    key,
    spacingAfterSeparator,
    rawValue,
    isMultiline: rawValue.trim() === MULTILINE_INDICATOR,
  };
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
    return stripQuotes(raw);
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

    if (raw.startsWith(DASH_LIST_MARKER) || raw.startsWith(DASH_LIST_INDENT)) {
      const isListItem = raw.startsWith(DASH_LIST_MARKER);

      if (isListItem) {
        flushMulti();

        if (current && hasMeaningfulFields(current)) {
          result.push(current);
        }

        current = { temp_id: createDSLTempId(TEMP_ID_PREFIX_ITEM) } as T;
      }

      if (!current) {
        emitError("dslIsolatedProperty", raw);
        continue;
      }

      const contentPart = isListItem ? raw.slice(DASH_LIST_MARKER.length) : raw.trimStart();
      const sep = findKeySeparator(contentPart);

      if (!sep) {
        emitError("dslFormatError", raw);
        continue;
      }

      const key = contentPart.slice(0, sep.index).trim();
      const valuePart = contentPart.slice(sep.index + sep.length);

      if (valuePart.trim() === MULTILINE_INDICATOR) {
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
