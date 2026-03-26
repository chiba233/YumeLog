// noinspection ES6PreferShortImport

import type { ImageContent, PostBlock } from "../../../types/blog.ts";
import { TEMP_ID_PREFIX_NODE } from "./constants.ts";
import { createDSLTempId } from "./createDSLTempId.ts";
import type { DSLError } from "./dslError.ts";
import { parseTypedDashObjectList } from "./parseDashList.ts";
import type { DSLBlockName } from "./types.ts";

export type BlockTransformMode = "metadata" | "block" | "chunked-text";

export interface BlockHandler {
  nestable?: boolean;
  transform: BlockTransformMode;
  buildBlock?: (content: string, tempId: string, onError?: (error: DSLError) => void) => PostBlock;
}

const createStringBlock =
  (type: "text" | "divider"): NonNullable<BlockHandler["buildBlock"]> =>
  (content, tempId) => ({ type, content, temp_id: tempId });

export const BLOCK_HANDLERS: Record<DSLBlockName, BlockHandler> = {
  meta: {
    transform: "metadata",
  },
  text: {
    nestable: true,
    transform: "chunked-text",
    buildBlock: createStringBlock("text"),
  },
  image: {
    transform: "block",
    buildBlock: (content, tempId, onError) => ({
      type: "image",
      content: parseTypedDashObjectList<ImageContent>(content, { onError }),
      temp_id: tempId,
    }),
  },
  divider: {
    transform: "block",
    buildBlock: createStringBlock("divider"),
  },
};

export const NESTABLE_BLOCK_NAMES: readonly string[] = (
  Object.entries(BLOCK_HANDLERS) as [DSLBlockName, BlockHandler][]
)
  .filter(([, h]) => h.nestable)
  .map(([name]) => name);

export const createFallbackTextBlock = (content: string): PostBlock => ({
  type: "text",
  content,
  temp_id: createDSLTempId(TEMP_ID_PREFIX_NODE),
});
