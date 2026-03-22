import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { registerHooks } from "node:module";
import fs from "node:fs";

const workspaceRoot = process.cwd();
const srcRoot = path.join(workspaceRoot, "src");
const setupLangPath = path.join(srcRoot, "shared", "lib", "app", "setupLang.ts");
const msgUtilsPath = path.join(srcRoot, "shared", "lib", "app", "msgUtils.ts");

const resolveWithKnownExtensions = (basePath) => {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.json`,
    `${basePath}.js`,
    path.join(basePath, "index.ts"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }

  return null;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const resolved = resolveWithKnownExtensions(path.join(srcRoot, specifier.slice(2)));
      if (resolved) {
        return {
          shortCircuit: true,
          url: resolved,
        };
      }
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:")
    ) {
      const parentPath = fileURLToPath(context.parentURL);
      const resolved = resolveWithKnownExtensions(
        path.resolve(path.dirname(parentPath), specifier),
      );
      if (resolved) {
        return {
          shortCircuit: true,
          url: resolved,
        };
      }
    }

    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (typeof specifier === "string" && !specifier.endsWith(".js")) {
        return nextResolve(`${specifier}.js`, context);
      }
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (url === pathToFileURL(setupLangPath).href) {
      return {
        format: "module",
        shortCircuit: true,
        source:
          'export const lang = { value: "en" }; export const formatTime = () => ""; export const formatDate = () => ""; export const langMap = { value: [] };',
      };
    }

    if (url === pathToFileURL(msgUtilsPath).href) {
      return {
        format: "module",
        shortCircuit: true,
        source: "export const $message = { error() {}, warning() {}, success() {} };",
      };
    }

    if (url.endsWith(".json")) {
      const source = fs.readFileSync(new URL(url), "utf8");
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${source};`,
      };
    }

    return nextLoad(url, context);
  },
});

