import type { TextToken } from "./types";

const blockTokenCache = new Map<string, TextToken[]>();

export const getCachedBlockTokens = (blockTempId?: string): TextToken[] | undefined => {
  if (!blockTempId) return undefined;
  return blockTokenCache.get(blockTempId);
};

export const setCachedBlockTokens = (blockTempId: string, tokens: TextToken[]): void => {
  blockTokenCache.set(blockTempId, tokens);
};

export const clearCachedBlockTokens = (): void => {
  blockTokenCache.clear();
};
