let dslTempIdSeed = 0;

export const createDSLTempId = (
  prefix: "dsl-node" | "dsl-chunk" | "dsl-item" = "dsl-node",
): string => {
  return `${prefix}-${dslTempIdSeed++}`;
};
