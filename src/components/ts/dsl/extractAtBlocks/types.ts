export const DSL_BLOCK_NAMES = ["image", "meta", "divider", "text"] as const;
export type DSLBlockName = (typeof DSL_BLOCK_NAMES)[number];

export interface DSLTextChunk {
  type: "text";
  value: string;
  temp_id: string;
}

export interface DSLChildChunk<Name extends string = string> {
  type: "child";
  node: DSLNode<Name>;
  temp_id: string;
}

export type DSLChunk<Name extends string = string> = DSLTextChunk | DSLChildChunk<Name>;

export interface DSLNode<Name extends string = string> {
  name: Name;
  content: string;
  children: DSLNode<Name>[];
  chunks: DSLChunk<Name>[];
  depth: number;
  lineStart: number;
  lineEnd: number;
  temp_id: string;
}

export type DSLTree<Name extends string = string> = DSLNode<Name>[];
