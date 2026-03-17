// noinspection ES6PreferShortImport,DuplicatedCode

import pLimit from "p-limit";

const limit = pLimit(6);

interface TextToken {
  type: string;
  value: string | TextToken[];
  codeLang?: string;
  label?: string;
  title?: string;
  url?: string;
}

interface BaseBlock<T = string> {
  type: string;
  content?: T;
}

interface PostBlock extends BaseBlock<string | ImageContent[]> {
  tokens?: TextToken[];
}

interface ImageContent {
  src: string;
  spareUrl?: string;
  desc?: string;
}

interface PostBlock extends BaseBlock<string | ImageContent[]> {
  tokens?: TextToken[];
}

interface DSLNode {
  name: string;
  content: string;
}

interface SyntaxConfig {
  blockPrefix: string;
  blockEnd: string;
}

type BlockContent = PostBlock["content"];
type DSLTree = DSLNode[];
type BlockParser = (content: string) => BlockContent;
const parseDashObjectList = (content: string): Record<string, string>[] => {
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
const blockParsers: Record<string, BlockParser> = {
  image(content: string) {
    return parseDashObjectList(content) as unknown as ImageContent[];
  },
};

const syntax: SyntaxConfig = {
  blockPrefix: "@",
  blockEnd: "end",
};

const stripQuotes = (value: string): string => {
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
const parseDSL = (text: string): DSLTree => {
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
        console.error(`Nested DSL block not allowed: ${name}`);
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
    console.error(`DSL block not closed: ${currentName}`);
  }
  return nodes;
};

const applyMeta = (content: string, target: Record<string, unknown>) => {
  const lines = content.split(/\r\n|\n|\r/);
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    target[key] = line.slice(i + 1).trim();
  }
};
const astToPost = (ast: DSLTree): Record<string, unknown> & { blocks: PostBlock[] } => {
  const meta: Record<string, unknown> = {};
  const blocks: PostBlock[] = [];

  for (const node of ast) {
    if (node.name === "meta") {
      applyMeta(node.content, meta);
      continue;
    }

    const block: PostBlock = {
      type: node.name,
    };

    const parser = blockParsers[node.name];

    if (parser) {
      block.content = parser(node.content);
    } else {
      block.content = node.content;
    }

    blocks.push(block);
  }

  return {
    ...meta,
    blocks,
  };
};

interface BaseContent {
  id?: string;
  time?: string;
  pin?: boolean;
}

interface YamlConfigItem {
  listUrl: string;
  url: string;
  spareUrl?: string;
  spareListUrl?: string;
}

interface PostWithTs extends BaseContent {
  _ts: number;
}

type YamlUrlConfig = Record<string, YamlConfigItem>;

export const loadAllPostsForSSG = async (type: string): Promise<BaseContent[]> => {
  const base = process.env.VITE_SITE_URL ?? "http://localhost:14514";

  const normalize = (p: string) => {
    if (/^https?:\/\//.test(p)) return p;
    return `${base.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;
  };

  const configRes = await fetch(normalize("./data/config/yamlUrl.json"));
  const config = (await configRes.json()) as YamlUrlConfig;

  const item = config[type];
  if (!item) return [];

  const { listUrl, url: baseUrl, spareListUrl, spareUrl } = item;

  let listRes = await fetch(normalize(listUrl));

  if (!listRes.ok && spareListUrl) {
    listRes = await fetch(normalize(spareListUrl));
  }

  if (!listRes.ok) return [];

  const list = (await listRes.json()) as string[];

  const posts = await Promise.all(
    list.map((name) =>
      limit(async () => {
        let res = await fetch(`${baseUrl}${name}`);

        if (!res.ok && spareUrl) {
          res = await fetch(`${spareUrl}${name}`);
        }

        if (!res.ok) return null;

        const text = await res.text();
        const ast = parseDSL(text);
        const parsed = astToPost(ast);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed as BaseContent;
      }),
    ),
  );

  const valid = posts.filter((p): p is BaseContent => p !== null);

  const parseTime = (t?: string): number => {
    if (!t) return 0;

    if (/^\d{8}$/.test(t)) {
      const iso = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
      return Date.parse(iso);
    }

    return Date.parse(t) || 0;
  };

  const withTs: PostWithTs[] = valid.map((p) => ({
    ...p,
    _ts: parseTime(p.time),
  }));

  withTs.sort((a, b) => {
    if (a.pin && !b.pin) return -1;
    if (!a.pin && b.pin) return 1;
    return b._ts - a._ts;
  });

  return withTs;
};
