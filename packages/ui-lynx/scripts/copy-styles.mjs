import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(packageRoot, "src");
const outputRoot = path.join(packageRoot, "dist");

async function copyCss(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await copyCss(source);
      continue;
    }
    if (!entry.name.endsWith(".css")) continue;
    const relative = path.relative(sourceRoot, source);
    const target = path.join(outputRoot, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target);
  }
}

await copyCss(sourceRoot);
