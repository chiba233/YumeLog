const normalizePublicPath = (resourcePath: string): string => resourcePath.replace(/^\/+/, "");
const shouldUseNodePublicRead = (): boolean =>
  Boolean(import.meta.env?.SSR) || typeof window === "undefined";

type NodeFsPromisesModule = typeof import("node:fs/promises");
type NodePathModule = typeof import("node:path");

const loadServerPublicText = async (resourcePath: string): Promise<string> => {
  const [fsModule, pathModule]: [NodeFsPromisesModule, NodePathModule] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ]);
  const filePath = pathModule.join(process.cwd(), "public", resourcePath);
  return await fsModule.readFile(filePath, "utf8");
};

export const resolvePublicResourceUrl = (resourcePath: string): string => {
  const normalizedPath = normalizePublicPath(resourcePath);
  const baseUrl = import.meta.env?.BASE_URL || "/";
  return `${baseUrl}${normalizedPath}`;
};

export const loadPublicText = async (resourcePath: string): Promise<string> => {
  const normalizedPath = normalizePublicPath(resourcePath);

  if (shouldUseNodePublicRead()) {
    return await loadServerPublicText(normalizedPath);
  }

  const response = await fetch(resolvePublicResourceUrl(normalizedPath));
  if (!response.ok) {
    throw new Error(`Failed to fetch public resource: ${resourcePath} (${response.status})`);
  }

  return await response.text();
};

export const loadPublicJson = async <T>(resourcePath: string): Promise<T | null> => {
  try {
    return JSON.parse(await loadPublicText(resourcePath)) as T;
  } catch {
    return null;
  }
};
