import type { TextToken } from "@/shared/lib/dsl/BlogRichText/types";
import type { PostBlock } from "@/shared/types/blog.ts";

export interface LazyBlockInitialState {
  tokens: TextToken[];
  parsed: boolean;
}

export const getLazyBlockTextContent = (block?: PostBlock): string | null => {
  if (!block || block.type !== "text") {
    return null;
  }

  return block.content;
};

export const resolveLazyBlockInitialState = (
  block: PostBlock | undefined,
  ssr: boolean,
  cachedTokens: TextToken[],
  parseTokens: (content: string) => TextToken[],
): LazyBlockInitialState => {
  if (cachedTokens.length > 0) {
    return {
      tokens: cachedTokens,
      parsed: true,
    };
  }

  if (Array.isArray(block?.tokens) && block.tokens.length > 0) {
    return {
      tokens: block.tokens,
      parsed: true,
    };
  }

  if (!ssr) {
    return {
      tokens: [],
      parsed: false,
    };
  }

  const content = getLazyBlockTextContent(block);
  if (!content) {
    return {
      tokens: [],
      parsed: false,
    };
  }

  return {
    tokens: parseTokens(content),
    parsed: true,
  };
};
