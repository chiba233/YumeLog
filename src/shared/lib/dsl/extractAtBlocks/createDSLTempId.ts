import { TEMP_ID_PREFIX_CHUNK, TEMP_ID_PREFIX_ITEM, TEMP_ID_PREFIX_NODE } from "./constants.ts";

let dslTempIdSeed = 0;

export const createDSLTempId = (
  prefix:
    | typeof TEMP_ID_PREFIX_NODE
    | typeof TEMP_ID_PREFIX_CHUNK
    | typeof TEMP_ID_PREFIX_ITEM = TEMP_ID_PREFIX_NODE,
): string => {
  return `${prefix}-${dslTempIdSeed++}`;
};
