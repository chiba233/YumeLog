import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const targetFiles = [];

const collectIfExists = (filePath) => {
  if (fs.existsSync(filePath)) targetFiles.push(filePath);
};

const findPnpmViteSsgDist = () => {
  const pnpmRoot = path.join(projectRoot, "node_modules", ".pnpm");
  if (!fs.existsSync(pnpmRoot)) return;

  for (const name of fs.readdirSync(pnpmRoot)) {
    if (!name.startsWith("vite-ssg@")) continue;
    collectIfExists(path.join(pnpmRoot, name, "node_modules", "vite-ssg", "dist", "index.mjs"));
    collectIfExists(path.join(pnpmRoot, name, "node_modules", "vite-ssg", "bin", "vite-ssg.js"));
  }
};

const findViteCacheFiles = () => {
  const viteDepsDir = path.join(projectRoot, "node_modules", ".vite", "deps");
  if (!fs.existsSync(viteDepsDir)) return;

  for (const name of fs.readdirSync(viteDepsDir)) {
    if (!name.startsWith("vite-ssg") || !name.endsWith(".js")) continue;
    collectIfExists(path.join(viteDepsDir, name));
  }
};

findPnpmViteSsgDist();
findViteCacheFiles();

const transform = (text) => {
  return text.replace(
    /router\.beforeEach\(\(to, from, next\) => \{\s+if \(isFirstRoute \|\| entryRoutePath && entryRoutePath === to\.path\) \{\s+isFirstRoute = false;\s+entryRoutePath = to\.path;\s+to\.meta\.state = context\.initialState;\s+\}\s+next\(\);\s+\}\);/g,
    `router.beforeEach((to, from) => {\n      if (isFirstRoute || entryRoutePath && entryRoutePath === to.path) {\n        isFirstRoute = false;\n        entryRoutePath = to.path;\n        to.meta.state = context.initialState;\n      }\n    });`,
  );
};

let changed = 0;

for (const file of targetFiles) {
  const original = fs.readFileSync(file, "utf8");
  const updated = transform(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
    changed += 1;
    console.log(`[patch-vite-ssg] patched: ${path.relative(projectRoot, file)}`);
  }
}

if (changed === 0) {
  console.log("[patch-vite-ssg] no changes needed.");
}
