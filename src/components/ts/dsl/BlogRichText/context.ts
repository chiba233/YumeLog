import type { ParseContext, TextToken } from "./types";
import { TAG_OPEN, TAG_PREFIX } from "./constants";
import { createToken } from "./createToken";

export const getCurrentTokens = (ctx: ParseContext): TextToken[] => {
  return ctx.stack.length ? ctx.stack[ctx.stack.length - 1].tokens : ctx.root;
};
export const pushTextToCurrent = (ctx: ParseContext, str: string) => {
  if (!str) return;

  const tokens = getCurrentTokens(ctx);
  const last = tokens[tokens.length - 1];

  if (last?.type === "text" && typeof last.value === "string") {
    last.value += str;
  } else {
    tokens.push(createToken({ type: "text", value: str }));
  }
};
export const flushBuffer = (ctx: ParseContext) => {
  if (!ctx.buffer) return;
  pushTextToCurrent(ctx, ctx.buffer);
  ctx.buffer = "";
};
export const finalizeUnclosedTags = (ctx: ParseContext) => {
  while (ctx.stack.length) {
    const node = ctx.stack.pop()!;
    pushTextToCurrent(ctx, TAG_PREFIX + node.tag + TAG_OPEN);

    node.tokens.forEach((t) => {
      if (t.type === "text" && typeof t.value === "string") {
        pushTextToCurrent(ctx, t.value);
      } else {
        getCurrentTokens(ctx).push(t);
      }
    });
  }
};
