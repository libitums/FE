import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dirname, "..");
const packRoot = path.join(packageRoot, ".pack");
const archives = readdirSync(packRoot).filter((name) => name.endsWith(".tgz"));

if (archives.length === 0) {
  throw new Error("pnpm pack did not produce a .tgz archive");
}

const archive = path.join(packRoot, archives.sort().at(-1));
const files = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n");
const required = [
  "package/package.json",
  "package/README.md",
  "package/dist/index.jsx",
  "package/dist/index.d.ts",
  "package/dist/styles.css",
];

for (const file of required) {
  if (!files.includes(file)) throw new Error(`packed artifact is missing ${file}`);
}

const forbidden = files.find(
  (file) => file.includes("/src/") || file.includes(".test.") || file.includes("/scripts/"),
);
if (forbidden) throw new Error(`packed artifact leaks development input: ${forbidden}`);

const runtime = execFileSync("tar", ["-xOzf", archive, "package/dist/index.jsx"], {
  encoding: "utf8",
});

if (!/<(?:view|text|svg)\b/.test(runtime)) {
  throw new Error("packed runtime does not contain authored ReactLynx JSX");
}

const loweredJsx = [
  ["React.createElement(", "classic React.createElement"],
  ["jsx-runtime", "jsx-runtime import"],
  ["_jsx(", "automatic _jsx helper"],
  ["_jsxs(", "automatic _jsxs helper"],
  ["_jsxDEV(", "automatic _jsxDEV helper"],
].find(([pattern]) => runtime.includes(pattern));

if (loweredJsx) {
  throw new Error(`packed runtime lowered authored JSX via ${loweredJsx[1]}`);
}

console.log(
  `pack contract passed: ${path.basename(archive)} (${files.length} files, authored JSX preserved)`,
);
