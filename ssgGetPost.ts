import yaml from "js-yaml";
import pLimit from "p-limit";

const limit = pLimit(6);

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

export async function loadAllPostsForSSG(type: string): Promise<BaseContent[]> {
  const base = process.env.VITE_SITE_URL ?? "http://localhost:14514";

  const normalize = (p: string) => {
    if (/^https?:\/\//.test(p)) return p;
    return `${base.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;
  };

  const configRes = await fetch(normalize("/data/config/yamlUrl.json"));
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
        const parsed = yaml.load(text);

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
}
