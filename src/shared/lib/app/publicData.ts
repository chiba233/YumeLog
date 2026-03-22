const normalizePublicPath = (resourcePath: string): string => resourcePath.replace(/^\/+/, "");
const shouldUseNodePublicRead = (): boolean =>
  Boolean(import.meta.env?.SSR) || typeof window === "undefined";

export const resolvePublicResourceUrl = (resourcePath: string): string => {
  const normalizedPath = normalizePublicPath(resourcePath);
  const baseUrl = import.meta.env?.BASE_URL || "/";
  return `${baseUrl}${normalizedPath}`;
};

export const loadPublicText = async (resourcePath: string): Promise<string> => {
  const normalizedPath = normalizePublicPath(resourcePath);

  if (shouldUseNodePublicRead()) {
    const [{ readFile }, pathModule] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    const filePath = pathModule.join(process.cwd(), "public", normalizedPath);
    return await readFile(filePath, "utf8");
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
