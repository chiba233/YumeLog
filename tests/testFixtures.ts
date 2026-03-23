import fs from "node:fs/promises";
import path from "node:path";

export const loadTestJsonFixture = async <T>(relativePath: string): Promise<T> => {
  const filePath = path.resolve(process.cwd(), "tests", "fixtures", relativePath);
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text) as T;
};
