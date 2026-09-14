import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dirname, "..");
const packRoot = path.join(packageRoot, ".pack");
const archives = readdirSync(packRoot).filter((name) => name.endsWith(".tgz"));

if (archives.length === 0) throw new Error("pnpm pack did not produce a .tgz archive");

const archive = path.join(packRoot, archives.sort().at(-1));
const files = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n");
const components = [
  { subpath: "button", directory: "button", component: "Button", css: "button.css" },
  {
    subpath: "back-header",
    directory: "back-header",
    component: "BackHeader",
    css: "back-header.css",
  },
  {
    subpath: "status-indicator",
    directory: "status-indicator",
    component: "StatusIndicator",
    css: "status-indicator.css",
  },
  {
    subpath: "round-button",
    directory: "round-button",
    component: "RoundButton",
    css: "round-button.css",
  },
  {
    subpath: "progress-header",
    directory: "progress-header",
    component: "ProgressHeader",
    css: "progress-header.css",
  },
  {
    subpath: "page-indicator",
    directory: "page-indicator",
    component: "PageIndicator",
    css: "page-indicator.css",
  },
];
const required = [
  "package/package.json",
  "package/README.md",
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/styles.css",
];

for (const { directory, component, css } of components) {
  required.push(
    `package/dist/${directory}/index.js`,
    `package/dist/${directory}/index.d.ts`,
    `package/dist/${directory}/${component}.jsx`,
    `package/dist/${directory}/${component}.d.ts`,
    `package/dist/${directory}/${css}`,
  );
}

for (const file of required) {
  if (!files.includes(file)) throw new Error(`packed artifact is missing ${file}`);
}

const forbidden = files.find(
  (file) =>
    file.includes("/src/") ||
    file.includes(".test.") ||
    file.includes("/scripts/") ||
    components.some(({ directory }) =>
      [`package/dist/${directory}.jsx`, `package/dist/${directory}.d.ts`].includes(file),
    ),
);
if (forbidden) throw new Error(`packed artifact leaks development input: ${forbidden}`);

const packedPackageJson = JSON.parse(
  execFileSync("tar", ["-xOzf", archive, "package/package.json"], { encoding: "utf8" }),
);
for (const { subpath, directory } of components) {
  const componentExport = packedPackageJson.exports?.[`./${subpath}`];
  if (!componentExport || typeof componentExport !== "object") {
    throw new Error(`packed package is missing the ./${subpath} export`);
  }
  for (const target of [componentExport.import, componentExport.default, componentExport.types]) {
    const expected = target.endsWith(".d.ts")
      ? `./dist/${directory}/index.d.ts`
      : `./dist/${directory}/index.js`;
    if (target !== expected)
      throw new Error(`./${subpath} must resolve ${expected}, got ${target}`);
    const packedTarget = `package/${target.replace(/^\.\//, "")}`;
    if (!files.includes(packedTarget)) {
      throw new Error(`./${subpath} export target is missing from packed artifact: ${target}`);
    }
  }
}

for (const { directory, component } of components) {
  const runtime = execFileSync(
    "tar",
    ["-xOzf", archive, `package/dist/${directory}/${component}.jsx`],
    { encoding: "utf8" },
  );
  if (!/<(?:view|text|svg)\b/.test(runtime)) {
    throw new Error(`${component} packed runtime does not contain authored ReactLynx JSX`);
  }
  const loweredJsx = [
    ["React.createElement(", "classic React.createElement"],
    ["jsx-runtime", "jsx-runtime import"],
    ["_jsx(", "automatic _jsx helper"],
    ["_jsxs(", "automatic _jsxs helper"],
    ["_jsxDEV(", "automatic _jsxDEV helper"],
  ].find(([pattern]) => runtime.includes(pattern));
  if (loweredJsx) {
    throw new Error(`${component} packed runtime lowered authored JSX via ${loweredJsx[1]}`);
  }
}

console.log(
  `pack contract passed: ${path.basename(archive)} (${files.length} files, authored JSX preserved)`,
);
