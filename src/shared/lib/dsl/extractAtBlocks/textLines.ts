export const splitTextLines = (text: string): string[] => {
  return text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
};

export const trimTrailingEmptyLines = (lines: string[]): string[] => {
  let end = lines.length;

  while (end > 0 && lines[end - 1] === "") {
    end--;
  }

  return lines.slice(0, end);
};
