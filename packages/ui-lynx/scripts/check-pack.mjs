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
  {
    subpath: "button",
    directory: "button",
    component: "Button",
    modules: ["button.contract"],
    css: "button.css",
  },
  {
    subpath: "back-header",
    directory: "back-header",
    component: "BackHeader",
    modules: ["back-header.contract"],
    css: "back-header.css",
  },
  {
    subpath: "status-indicator",
    directory: "status-indicator",
    component: "StatusIndicator",
    modules: ["status-indicator.contract"],
    css: "status-indicator.css",
  },
  {
    subpath: "round-button",
    directory: "round-button",
    component: "RoundButton",
    modules: ["round-button.contract"],
    css: "round-button.css",
  },
  {
    subpath: "progress-header",
    directory: "progress-header",
    component: "ProgressHeader",
    modules: ["progress-header.contract"],
    css: "progress-header.css",
  },
  {
    subpath: "page-indicator",
    directory: "page-indicator",
    component: "PageIndicator",
    modules: ["page-indicator.contract"],
    css: "page-indicator.css",
  },
  {
    subpath: "bottom-navigator",
    directory: "bottom-navigator",
    component: "BottomNavigator",
    modules: ["bottom-navigator.contract"],
    css: "bottom-navigator.css",
  },
  {
    subpath: "step-indicator",
    directory: "step-indicator",
    component: "StepIndicator",
    modules: ["step-indicator.contract"],
    css: "step-indicator.css",
  },
  {
    subpath: "dialog",
    directory: "dialog",
    component: "Dialog",
    modules: ["dialog.contract"],
    css: "dialog.css",
  },
  {
    subpath: "overlay",
    directory: "overlay",
    component: "Overlay",
    modules: ["overlay.contract"],
    css: "overlay.css",
  },
  {
    subpath: "answer-label",
    directory: "answer-label",
    component: "AnswerLabel",
    modules: ["answer-label.contract"],
    css: "answer-label.css",
  },
  {
    subpath: "avatar",
    directory: "avatar",
    component: "Avatar",
    modules: ["avatar.contract"],
    css: "avatar.css",
  },
  {
    subpath: "card",
    directory: "card",
    component: "Card",
    modules: ["card.contract"],
    css: "card.css",
  },
  {
    subpath: "compact-numeric-input",
    directory: "compact-numeric-input",
    component: "CompactNumericInput",
    modules: ["compact-numeric-input.contract"],
    css: "compact-numeric-input.css",
  },
  {
    subpath: "fog",
    directory: "fog",
    component: "Fog",
    modules: ["fog.contract"],
    css: "fog.css",
  },
  {
    subpath: "bottom-sheet",
    directory: "bottom-sheet",
    component: "BottomSheet",
    modules: ["bottom-sheet.contract"],
    css: "bottom-sheet.css",
  },
  {
    subpath: "chat-bubble",
    directory: "chat-bubble",
    component: "ChatBubble",
    modules: ["chat-bubble.contract"],
    css: "chat-bubble.css",
  },
  {
    subpath: "text-field",
    directory: "text-field",
    component: "TextField",
    modules: ["text-field.contract"],
    css: "text-field.css",
  },
  {
    subpath: "visual-novel-dialog",
    directory: "visual-novel-dialog",
    component: "VisualNovelDialog",
    modules: ["visual-novel-dialog.contract"],
    css: "visual-novel-dialog.css",
  },
  {
    subpath: "tooltip",
    directory: "tooltip",
    component: "Tooltip",
    modules: ["tooltip.contract"],
    css: "tooltip.css",
  },
];
const required = [
  "package/package.json",
  "package/README.md",
  "package/docs/component-file-conventions.md",
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/styles.css",
];

for (const { directory, component, modules, css } of components) {
  required.push(
    `package/dist/${directory}/index.js`,
    `package/dist/${directory}/index.d.ts`,
    `package/dist/${directory}/${component}.jsx`,
    `package/dist/${directory}/${component}.d.ts`,
    `package/dist/${directory}/${css}`,
  );
  for (const module of modules) {
    required.push(
      `package/dist/${directory}/${module}.js`,
      `package/dist/${directory}/${module}.d.ts`,
    );
  }
}

for (const file of required) {
  if (!files.includes(file)) throw new Error(`packed artifact is missing ${file}`);
}

for (const { directory } of components) {
  for (const generic of ["contract.js", "contract.d.ts", "logic.js", "logic.d.ts"]) {
    const leaked = `package/dist/${directory}/${generic}`;
    if (files.includes(leaked)) {
      throw new Error(`packed artifact contains forbidden generic component module: ${leaked}`);
    }
  }
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

const bottomNavigatorStylesExport = packedPackageJson.exports?.["./bottom-navigator/styles.css"];
if (bottomNavigatorStylesExport !== "./dist/bottom-navigator/bottom-navigator.css") {
  throw new Error("packed package has an invalid ./bottom-navigator/styles.css export");
}
if (!files.includes(`package/${bottomNavigatorStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the BottomNavigator CSS export target");
}

const stepIndicatorStylesExport = packedPackageJson.exports?.["./step-indicator/styles.css"];
if (stepIndicatorStylesExport !== "./dist/step-indicator/step-indicator.css") {
  throw new Error("packed package has an invalid ./step-indicator/styles.css export");
}

const dialogStylesExport = packedPackageJson.exports?.["./dialog/styles.css"];
if (dialogStylesExport !== "./dist/dialog/dialog.css") {
  throw new Error("packed package has an invalid ./dialog/styles.css export");
}
if (!files.includes(`package/${dialogStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the Dialog CSS export target");
}
const overlayStylesExport = packedPackageJson.exports?.["./overlay/styles.css"];
if (overlayStylesExport !== "./dist/overlay/overlay.css") {
  throw new Error("packed package has an invalid ./overlay/styles.css export");
}
if (!files.includes(`package/${overlayStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the Overlay CSS export target");
}

const cardStylesExport = packedPackageJson.exports?.["./card/styles.css"];
if (cardStylesExport !== "./dist/card/card.css") {
  throw new Error("packed package has an invalid ./card/styles.css export");
}
if (!files.includes(`package/${cardStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the Card CSS export target");
}

const chatBubbleStylesExport = packedPackageJson.exports?.["./chat-bubble/styles.css"];
if (chatBubbleStylesExport !== "./dist/chat-bubble/chat-bubble.css") {
  throw new Error("packed package has an invalid ./chat-bubble/styles.css export");
}
if (!files.includes(`package/${chatBubbleStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the ChatBubble CSS export target");
}
const textFieldStylesExport = packedPackageJson.exports?.["./text-field/styles.css"];
if (textFieldStylesExport !== "./dist/text-field/text-field.css") {
  throw new Error("packed package has an invalid ./text-field/styles.css export");
}
if (!files.includes(`package/${textFieldStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the TextField CSS export target");
}
const visualNovelDialogStylesExport =
  packedPackageJson.exports?.["./visual-novel-dialog/styles.css"];
if (visualNovelDialogStylesExport !== "./dist/visual-novel-dialog/visual-novel-dialog.css") {
  throw new Error("packed package has an invalid ./visual-novel-dialog/styles.css export");
}
if (!files.includes(`package/${visualNovelDialogStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the VisualNovelDialog CSS export target");
}
const tooltipStylesExport = packedPackageJson.exports?.["./tooltip/styles.css"];
if (tooltipStylesExport !== "./dist/tooltip/tooltip.css") {
  throw new Error("packed package has an invalid ./tooltip/styles.css export");
}
if (!files.includes(`package/${tooltipStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the Tooltip CSS export target");
}
if (!files.includes(`package/${stepIndicatorStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the StepIndicator CSS export target");
}

const answerLabelStylesExport = packedPackageJson.exports?.["./answer-label/styles.css"];
if (answerLabelStylesExport !== "./dist/answer-label/answer-label.css") {
  throw new Error("packed package has an invalid ./answer-label/styles.css export");
}
if (!files.includes(`package/${answerLabelStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the AnswerLabel CSS export target");
}

const avatarStylesExport = packedPackageJson.exports?.["./avatar/styles.css"];
if (avatarStylesExport !== "./dist/avatar/avatar.css") {
  throw new Error("packed package has an invalid ./avatar/styles.css export");
}
if (!files.includes(`package/${avatarStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the Avatar CSS export target");
}

const compactNumericInputStylesExport =
  packedPackageJson.exports?.["./compact-numeric-input/styles.css"];
if (compactNumericInputStylesExport !== "./dist/compact-numeric-input/compact-numeric-input.css") {
  throw new Error("packed package has an invalid ./compact-numeric-input/styles.css export");
}
if (!files.includes(`package/${compactNumericInputStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the CompactNumericInput CSS export target");
}

const bottomSheetStylesExport = packedPackageJson.exports?.["./bottom-sheet/styles.css"];
if (bottomSheetStylesExport !== "./dist/bottom-sheet/bottom-sheet.css") {
  throw new Error("packed package has an invalid ./bottom-sheet/styles.css export");
}
if (!files.includes(`package/${bottomSheetStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the BottomSheet CSS export target");
}

const fogStylesExport = packedPackageJson.exports?.["./fog/styles.css"];
if (fogStylesExport !== "./dist/fog/fog.css") {
  throw new Error("packed package has an invalid ./fog/styles.css export");
}
if (!files.includes(`package/${fogStylesExport.replace(/^\.\//, "")}`)) {
  throw new Error("packed package is missing the Fog CSS export target");
}
for (const { directory, component } of components) {
  const runtime = execFileSync(
    "tar",
    ["-xOzf", archive, `package/dist/${directory}/${component}.jsx`],
    { encoding: "utf8" },
  );
  if (!/<(?:view|text|svg|input)\b/.test(runtime)) {
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
  if (runtime.includes("replaceAll(")) {
    throw new Error(`${component} packed runtime uses unsupported String.prototype.replaceAll`);
  }
}

console.log(
  `pack contract passed: ${path.basename(archive)} (${files.length} files, authored JSX preserved)`,
);
