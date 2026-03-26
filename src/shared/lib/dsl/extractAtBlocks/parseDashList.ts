// noinspection DuplicatedCode

import { DASH_LIST_MARKER, MULTILINE_INDICATOR, TEMP_ID_PREFIX_ITEM } from "./constants.ts";
import { createDSLTempId } from "./createDSLTempId.ts";
import type { DSLError, DSLErrorCode } from "./dslError.ts";
import { findKeySeparator, splitTextLines } from "./textLines.ts";

export interface ParseDashObjectListOptions {
  onError?: (error: DSLError) => void;
}

export interface DashListLineAnalysis {
  indent: string;
  isListItem: boolean;
  listMarker: string | null;
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

  const indentLength = line.length - line.trimStart().length;
  const indent = line.slice(0, indentLength);
  const trimmed = line.slice(indentLength);
  const isListItem = trimmed.startsWith(DASH_LIST_MARKER);

  if (!isListItem && indentLength === 0) return null;

  let contentPart: string;
  let listMarker: string | null = null;

  if (isListItem) {
    const afterDash = trimmed.slice(1);
    const spacesAfterDash = afterDash.length - afterDash.trimStart().length;
    listMarker = trimmed.slice(0, 1 + spacesAfterDash);
    contentPart = afterDash.trimStart();
  } else {
    contentPart = trimmed;
  }

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
    listMarker,
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
  let itemMarkerWidth = 0;

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
      const stripWidth = itemMarkerWidth + 2;

      current[multiKey as keyof T] = multiBuffer
        .map((l) => l.slice(stripWidth))
        .join("\n")
        .trimEnd() as T[keyof T];
    }

    multiKey = null;
    multiBuffer = [];
  };

  for (const raw of lines) {
    if (multiKey) {
      const multilineIndent = itemMarkerWidth + 2;
      const lineIndent = raw.length - raw.trimStart().length;

      if (raw.trim() === "" || lineIndent >= multilineIndent) {
        multiBuffer.push(raw.trim() === "" ? "" : raw);
        continue;
      }

      flushMulti();
    }

    if (!raw.trim()) continue;

    const analysis = analyzeDashListLine(raw);

    if (!analysis) {
      if (raw.startsWith(DASH_LIST_MARKER)) {
        emitError("dslFormatError", raw);
      } else if (/^\s/.test(raw)) {
        emitError(current ? "dslFormatError" : "dslIsolatedProperty", raw);
      } else {
        emitError("dslUnrecognizedLine", raw);
      }
      continue;
    }

    if (analysis.isListItem) {
      flushMulti();
      if (current && hasMeaningfulFields(current)) result.push(current);
      current = { temp_id: createDSLTempId(TEMP_ID_PREFIX_ITEM) } as T;
      itemMarkerWidth = analysis.listMarker!.length;
    }

    if (!current) {
      emitError("dslIsolatedProperty", raw);
      continue;
    }

    if (!analysis.isListItem && analysis.indent.length !== itemMarkerWidth) {
      emitError("dslFormatError", raw);
      continue;
    }

    if (analysis.isMultiline) {
      multiKey = analysis.key;
      continue;
    }

    current[analysis.key as keyof T] = stripQuotes(analysis.rawValue) as T[keyof T];
  }

  flushMulti();
  if (current && hasMeaningfulFields(current)) result.push(current);
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
