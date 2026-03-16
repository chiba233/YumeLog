export const parseDashObjectList = (content: string): Record<string, string>[] => {
  const lines = content.split(/\r?\n/);
  const result: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;
  let multiKey: string | null = null;
  let multiBuffer: string[] = [];

  const flushMulti = () => {
    if (current && multiKey) {
      current[multiKey] = multiBuffer.join("\n").trimEnd();
    }
    multiKey = null;
    multiBuffer = [];
  };

  const processValue = (raw: string): string => {
    const trimmedRaw = raw.trim();
    if (/^(['"]).*\1$/.test(trimmedRaw)) {
      return stripQuotes(trimmedRaw);
    }
    return raw.trim();
  };

  for (const raw of lines) {
    if (multiKey) {
      if (raw.startsWith("    ") || raw.trim() === "") {
        multiBuffer.push(raw.startsWith("    ") ? raw.slice(4) : "");
        continue;
      } else {
        flushMulti();
      }
    }

    if (!raw.trim()) continue;

    if (raw.startsWith("- ") || raw.startsWith("  ")) {
      const isListItem = raw.startsWith("- ");
      if (isListItem) flushMulti();

      const contentPart = isListItem ? raw.slice(2) : raw.trimStart();
      const i = contentPart.indexOf(": ");

      if (i === -1) {
        console.error(`[DSL Error] 格式错误，已忽略该行: "${raw}"`);
        continue;
      }

      if (isListItem) {
        if (current) result.push(current);
        current = {};
      }

      if (!current) {
        console.error(`[DSL Error] 孤立属性行，已忽略: "${raw}"`);
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
      console.error(`[DSL Warning] 无法识别的行，已跳过: "${raw}"`);
    }
  }

  flushMulti();
  if (current) result.push(current);

  return result;
};

function stripQuotes(value: string): string {
  if (/^(['"]).*\1$/.test(value)) {
    const quote = value[0];
    const content = value.slice(1, -1);
    return content.replace(/\\([\\'"])/g, (match: string, p1: string): string => {
      if (p1 === "\\" || p1 === quote) {
        return p1;
      }
      return match;
    });
  }

  return value;
}
