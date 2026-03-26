// Block DSL directive syntax
export const BLOCK_PREFIX = "@";
export const BLOCK_END = "end";
export const ESCAPE_CHAR = "\\";
export const BOM = "\uFEFF";
export const BLOCK_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

// Dash-list syntax
export const DASH_LIST_MARKER = "-" as const;
export const KEY_SEPARATOR = ":" as const;
export const MULTILINE_INDICATOR = "|" as const;

// Reserved keys
export const RESERVED_META_KEY_BLOCKS = "blocks" as const;

// Temp ID prefixes
export const TEMP_ID_PREFIX_NODE = "dsl-node";
export const TEMP_ID_PREFIX_CHUNK = "dsl-chunk";
export const TEMP_ID_PREFIX_ITEM = "dsl-item";
