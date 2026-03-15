export function parseDashObjectList(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/);

  const result: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;

  let multiKey: string | null = null;
  let multiBuffer: string[] = [];

  const flushMulti = () => {
    if (current && multiKey) {
      current[multiKey] = multiBuffer.join("\n");
    }
    multiKey = null;
    multiBuffer = [];
  };

  for (const raw of lines) {
    if (!raw.trim()) continue;
    if (multiKey) {
      if (raw.startsWith("    ")) {
        multiBuffer.push(raw.slice(4));
        continue;
      } else {
        flushMulti();
      }
    }

    if (raw.startsWith("- ")) {
      flushMulti();
      if (current) result.push(current);
      current = {};
      const rest = raw.slice(2);
      const i = rest.indexOf(": ");
      if (i === -1) {
        console.error(`Invalid DSL list syntax: ${raw}`);
        current = null;
        continue;
      }

      const key = rest.slice(0, i).trim();
      const value = rest.slice(i + 2);
      if (value === "|") {
        multiKey = key;
        continue;
      }

      current[key] = stripQuotes(value);
    } else if (raw.startsWith("  ")) {
      if (!current) {
        console.error(`Property without list item: ${raw}`);
        continue;
      }

      const trimmed = raw.trimStart();
      const i = trimmed.indexOf(": ");
      if (i === -1) {
        console.error(`Invalid key:value syntax: ${raw}`);
        continue;
      }

      const key = trimmed.slice(0, i).trim();
      const value = trimmed.slice(i + 2);

      if (value === "|") {
        multiKey = key;
        continue;
      }

      current[key] = stripQuotes(value);
    } else {
      console.error(`Invalid DSL line: ${raw}`);
    }
  }

  flushMulti();

  if (current) result.push(current);
  return result;
}

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
      value = value.slice(1, -1);
      value = value.replace(/\\"/g, "\"");
      value = value.replace(/\\\\/g, "\\");
      return value;
    }
  }

  return value;
}
