import type { ParseContext, ParseStackNode, TextToken } from "./types";
import { createToken } from "./createToken";
import { emitI18nError } from "./errors";

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
    const node = ctx.stack.pop() as ParseStackNode;
    emitI18nError(
      "richTextInlineNotClosed",
      { i: node.openPos },
      ctx.silent,
      ctx.text,
      node.openPos,
      node.openLen,
    );

    pushTextToCurrent(ctx, ctx.text.slice(node.openPos, node.openPos + node.openLen));

    node.tokens.forEach((t) => {
      if (t.type === "text" && typeof t.value === "string") {
        pushTextToCurrent(ctx, t.value);
      } else {
        getCurrentTokens(ctx).push(t);
      }
    });
  }
};
