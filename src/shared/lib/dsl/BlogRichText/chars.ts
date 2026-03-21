export const isTagStartChar = (c: string) =>
  (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
export const isTagChar = (c: string) =>
  (c >= "a" && c <= "z") ||
  (c >= "A" && c <= "Z") ||
  (c >= "0" && c <= "9") ||
  c === "_" ||
  c === "-";
export const getLineEnd = (text: string, pos: number): number => {
  const end = text.indexOf("\n", pos);
  if (end === -1) return text.length;
  if (end > pos && text[end - 1] === "\r") return end - 1;
  return end;
};
export const isLineStart = (text: string, pos: number): boolean => {
  return pos === 0 || text[pos - 1] === "\n";
};
export const isWholeLineToken = (text: string, pos: number, token: string): boolean => {
  if (!isLineStart(text, pos)) return false;
  if (!text.startsWith(token, pos)) return false;
  const lineEnd = getLineEnd(text, pos);
  return pos + token.length === lineEnd;
};
