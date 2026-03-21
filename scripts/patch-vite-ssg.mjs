import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const pnpmRoot = path.join(projectRoot, "node_modules", ".pnpm");

const oldSnippet = `router.beforeEach((to, from, next) => {
      if (isFirstRoute || entryRoutePath && entryRoutePath === to.path) {
        isFirstRoute = false;
        entryRoutePath = to.path;
        to.meta.state = context.initialState;
      }
      next();
    });`;

const newSnippet = `router.beforeEach((to, from) => {
      if (isFirstRoute || entryRoutePath && entryRoutePath === to.path) {
        isFirstRoute = false;
        entryRoutePath = to.path;
        to.meta.state = context.initialState;
      }
    });`;

if (!fs.existsSync(pnpmRoot)) {
  console.warn("[patch-vite-ssg] .pnpm directory not found, skipping.");
  process.exit(0);
}

const viteSsgDir = fs
  .readdirSync(pnpmRoot)
  .find((name) => name.startsWith("vite-ssg@28.3.0"));

if (!viteSsgDir) {
  console.warn("[patch-vite-ssg] vite-ssg@28.3.0 not found, skipping.");
  process.exit(0);
}

const distFile = path.join(
  pnpmRoot,
  viteSsgDir,
  "node_modules",
  "vite-ssg",
  "dist",
  "index.mjs",
);

if (!fs.existsSync(distFile)) {
  console.warn("[patch-vite-ssg] vite-ssg dist file not found, skipping.");
  process.exit(0);
}

const text = fs.readFileSync(distFile, "utf8");

if (text.includes(newSnippet)) {
  console.log("[patch-vite-ssg] vite-ssg already patched.");
  process.exit(0);
}

if (!text.includes(oldSnippet)) {
  console.warn("[patch-vite-ssg] target snippet not found, skipping.");
  process.exit(0);
}

fs.writeFileSync(distFile, text.replace(oldSnippet, newSnippet), "utf8");
console.log(`[patch-vite-ssg] applied local compatibility patch: ${viteSsgDir}`);
