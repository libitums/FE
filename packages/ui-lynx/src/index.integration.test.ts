import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, test } from "vitest";

import * as root from "./index";
import * as button from "./button/index";
import * as backHeader from "./back-header/index";
import * as statusIndicator from "./status-indicator/index";
import * as roundButton from "./round-button/index";
import * as compactNumericInput from "./compact-numeric-input/index";
import * as fog from "./fog/index";
import * as progressHeader from "./progress-header/index";
import * as pageIndicator from "./page-indicator/index";
import * as bottomNavigator from "./bottom-navigator/index";
import * as bottomSheet from "./bottom-sheet/index";
import * as stepIndicator from "./step-indicator/index";
import * as overlay from "./overlay/index";
import * as answerLabel from "./answer-label/index";
import * as card from "./card/index";
import * as chatBubble from "./chat-bubble/index";
import * as textField from "./text-field/index";
import * as tooltip from "./tooltip/index";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(import.meta.dirname, "..");
const componentArtifacts = {
  "answer-label": { implementation: "AnswerLabel.jsx", css: "answer-label.css" },
  button: { implementation: "Button.jsx", css: "button.css" },
  "back-header": { implementation: "BackHeader.jsx", css: "back-header.css" },
  "status-indicator": { implementation: "StatusIndicator.jsx", css: "status-indicator.css" },
  "round-button": { implementation: "RoundButton.jsx", css: "round-button.css" },
  "compact-numeric-input": {
    implementation: "CompactNumericInput.jsx",
    css: "compact-numeric-input.css",
  },
  fog: { implementation: "Fog.jsx", css: "fog.css" },
  "progress-header": { implementation: "ProgressHeader.jsx", css: "progress-header.css" },
  "page-indicator": { implementation: "PageIndicator.jsx", css: "page-indicator.css" },
  "bottom-navigator": { implementation: "BottomNavigator.jsx", css: "bottom-navigator.css" },
  "bottom-sheet": { implementation: "BottomSheet.jsx", css: "bottom-sheet.css" },
  "step-indicator": { implementation: "StepIndicator.jsx", css: "step-indicator.css" },
  overlay: { implementation: "Overlay.jsx", css: "overlay.css" },
  card: { implementation: "Card.jsx", css: "card.css" },
  "chat-bubble": { implementation: "ChatBubble.jsx", css: "chat-bubble.css" },
  "text-field": { implementation: "TextField.jsx", css: "text-field.css" },
  tooltip: { implementation: "Tooltip.jsx", css: "tooltip.css" },
} as const;

const componentEntries = {
  "answer-label": "AnswerLabel",
  button: "Button",
  "back-header": "BackHeader",
  "status-indicator": "StatusIndicator",
  "round-button": "RoundButton",
  "compact-numeric-input": "CompactNumericInput",
  fog: "Fog",
  "progress-header": "ProgressHeader",
  "page-indicator": "PageIndicator",
  "bottom-navigator": "BottomNavigator",
  "bottom-sheet": "BottomSheet",
  "step-indicator": "StepIndicator",
  overlay: "Overlay",
  card: "Card",
  "chat-bubble": "ChatBubble",
  "text-field": "TextField",
  tooltip: "Tooltip",
} as const;

async function readPackageJson() {
  return JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8")) as {
    main: string;
    module: string;
    types: string;
    exports: Record<string, string | { import?: string; default?: string; types?: string }>;
  };
}

describe("ui-lynx package boundaries", () => {
  test("root import preserves value identity and type-compatible subpath values", () => {
    expect(root.AnswerLabel).toBe(answerLabel.AnswerLabel);
    expect(root.Button).toBe(button.Button);
    expect(root.BackHeader).toBe(backHeader.BackHeader);
    expect(root.StatusIndicator).toBe(statusIndicator.StatusIndicator);
    expect(root.RoundButton).toBe(roundButton.RoundButton);
    expect(root.CompactNumericInput).toBe(compactNumericInput.CompactNumericInput);
    expect(root.Fog).toBe(fog.Fog);
    expect(root.ProgressHeader).toBe(progressHeader.ProgressHeader);
    expect(root.PageIndicator).toBe(pageIndicator.PageIndicator);
    expect(root.BottomNavigator).toBe(bottomNavigator.BottomNavigator);
    expect(root.BottomSheet).toBe(bottomSheet.BottomSheet);
    expect(root.StepIndicator).toBe(stepIndicator.StepIndicator);
    expect(root.Card).toBe(card.Card);
    expect(root.ChatBubble).toBe(chatBubble.ChatBubble);
    expect(root.TextField).toBe(textField.TextField);
    expect(root.Tooltip).toBe(tooltip.Tooltip);
    expect(root.getButtonContract).toBe(button.getButtonContract);
    expect(root.getCompactNumericInputContract).toBe(
      compactNumericInput.getCompactNumericInputContract,
    );
    expect(root.getCompactNumericInputValue).toBe(compactNumericInput.getCompactNumericInputValue);
    expect(root.getFogContract).toBe(fog.getFogContract);
    expect(root.getStatusIndicatorLabel).toBe(statusIndicator.getStatusIndicatorLabel);
    expect(root.getProgressHeaderProgress).toBe(progressHeader.getProgressHeaderProgress);
    expect(root.getPageIndicatorModel).toBe(pageIndicator.getPageIndicatorModel);
    expect(root.PAGE_INDICATOR_MAX_PAGE_COUNT).toBe(pageIndicator.PAGE_INDICATOR_MAX_PAGE_COUNT);
    expect(root.getBottomNavigatorContract).toBe(bottomNavigator.getBottomNavigatorContract);
    expect(root.getBottomSheetContract).toBe(bottomSheet.getBottomSheetContract);
    expect(root.shouldDismissBottomSheetDrag).toBe(bottomSheet.shouldDismissBottomSheetDrag);
    expect(root.getStepIndicatorContract).toBe(stepIndicator.getStepIndicatorContract);
    expect(root.Overlay).toBe(overlay.Overlay);
    expect(root.getOverlayContract).toBe(overlay.getOverlayContract);
    expect(root.getAnswerLabelContract).toBe(answerLabel.getAnswerLabelContract);
    expect(root.getCardContract).toBe(card.getCardContract);
    expect(root.getChatBubbleContract).toBe(chatBubble.getChatBubbleContract);
    expect(root.getTextFieldContract).toBe(textField.getTextFieldContract);
    expect(root.getTooltipContract).toBe(tooltip.getTooltipContract);
    expect(root.resolveTooltipLayout).toBe(tooltip.resolveTooltipLayout);
  });

  test("root stylesheet aggregates every component without removing existing styles", async () => {
    const styles = await readFile(path.join(packageRoot, "src/styles.css"), "utf8");
    for (const entry of Object.keys(componentArtifacts)) {
      expect(styles).toContain(
        `@import "./${entry}/${componentArtifacts[entry as keyof typeof componentArtifacts].css}"`,
      );
    }
  });

  test("each public subpath resolves to an independent source entry", async () => {
    const packageJson = await readPackageJson();
    for (const [subpath, entry] of Object.entries(
      Object.fromEntries(Object.keys(componentEntries).map((entry) => [`./${entry}`, entry])),
    )) {
      const exportMap = packageJson.exports[subpath];
      expect(exportMap).toMatchObject({
        import: `./dist/${entry}/index.js`,
        default: `./dist/${entry}/index.js`,
        types: `./dist/${entry}/index.d.ts`,
      });
      expect(await readFile(path.join(packageRoot, "src", entry, "index.ts"), "utf8")).toContain(
        `./${componentEntries[entry as keyof typeof componentEntries]}`,
      );
    }
    expect(packageJson.exports["./step-indicator/styles.css"]).toBe(
      "./dist/step-indicator/step-indicator.css",
    );
    expect(packageJson.exports["./overlay/styles.css"]).toBe("./dist/overlay/overlay.css");
    expect(packageJson.exports["./answer-label/styles.css"]).toBe(
      "./dist/answer-label/answer-label.css",
    );
    expect(packageJson.exports["./card/styles.css"]).toBe("./dist/card/card.css");
    expect(packageJson.exports["./compact-numeric-input/styles.css"]).toBe(
      "./dist/compact-numeric-input/compact-numeric-input.css",
    );
    expect(packageJson.exports["./fog/styles.css"]).toBe("./dist/fog/fog.css");
    expect(packageJson.exports["./bottom-sheet/styles.css"]).toBe(
      "./dist/bottom-sheet/bottom-sheet.css",
    );
    expect(packageJson.exports["./chat-bubble/styles.css"]).toBe(
      "./dist/chat-bubble/chat-bubble.css",
    );
    expect(packageJson.exports["./text-field/styles.css"]).toBe("./dist/text-field/text-field.css");
    expect(packageJson.exports["./tooltip/styles.css"]).toBe("./dist/tooltip/tooltip.css");
    expect(packageJson.exports["./styles.css"]).toBe("./dist/styles.css");
  });

  test("package entry fields and dist outputs are component-specific", async () => {
    const packageJson = await readPackageJson();
    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.module).toBe("./dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");

    for (const [entry, artifacts] of Object.entries(componentArtifacts)) {
      for (const file of ["index.js", artifacts.implementation, "index.d.ts", artifacts.css]) {
        await expect(readFile(path.join(packageRoot, "dist", entry, file))).resolves.toBeDefined();
      }
    }
  });

  test("aggregate stylesheet exposes BottomNavigator without source-path imports", async () => {
    const packageJson = await readPackageJson();
    const styles = await readFile(path.join(packageRoot, "src/styles.css"), "utf8");
    expect(styles).toContain('@import "./bottom-navigator/bottom-navigator.css"');
    expect(packageJson.exports["./bottom-navigator/styles.css"]).toBe(
      "./dist/bottom-navigator/bottom-navigator.css",
    );
  });

  test("published tarball contains root and component artifacts with preserved JSX", async () => {
    const packDir = path.join(packageRoot, ".pack");
    const archives = (await readdir(packDir)).filter((file) => file.endsWith(".tgz"));
    expect(archives.length).toBeGreaterThan(0);
    const { stdout } = await execFileAsync("tar", ["-tzf", path.join(packDir, archives[0]!)]);
    for (const file of [
      "package/dist/index.js",
      "package/dist/index.d.ts",
      "package/dist/styles.css",
      "package/dist/answer-label/index.js",
      `package/dist/answer-label/${componentArtifacts["answer-label"].implementation}`,
      "package/dist/answer-label/index.d.ts",
      `package/dist/answer-label/${componentArtifacts["answer-label"].css}`,
      "package/dist/button/index.js",
      `package/dist/button/${componentArtifacts.button.implementation}`,
      "package/dist/button/index.d.ts",
      `package/dist/button/${componentArtifacts.button.css}`,
      "package/dist/back-header/index.js",
      `package/dist/back-header/${componentArtifacts["back-header"].implementation}`,
      "package/dist/back-header/index.d.ts",
      `package/dist/back-header/${componentArtifacts["back-header"].css}`,
      "package/dist/status-indicator/index.js",
      `package/dist/status-indicator/${componentArtifacts["status-indicator"].implementation}`,
      "package/dist/status-indicator/index.d.ts",
      `package/dist/status-indicator/${componentArtifacts["status-indicator"].css}`,
      "package/dist/round-button/index.js",
      `package/dist/round-button/${componentArtifacts["round-button"].implementation}`,
      "package/dist/round-button/index.d.ts",
      `package/dist/round-button/${componentArtifacts["round-button"].css}`,
      "package/dist/compact-numeric-input/index.js",
      `package/dist/compact-numeric-input/${componentArtifacts["compact-numeric-input"].implementation}`,
      "package/dist/compact-numeric-input/index.d.ts",
      `package/dist/compact-numeric-input/${componentArtifacts["compact-numeric-input"].css}`,
      "package/dist/fog/index.js",
      `package/dist/fog/${componentArtifacts.fog.implementation}`,
      "package/dist/fog/index.d.ts",
      "package/dist/fog/Fog.d.ts",
      "package/dist/fog/fog.contract.js",
      "package/dist/fog/fog.contract.d.ts",
      `package/dist/fog/${componentArtifacts.fog.css}`,
      "package/dist/progress-header/index.js",
      `package/dist/progress-header/${componentArtifacts["progress-header"].implementation}`,
      "package/dist/progress-header/index.d.ts",
      `package/dist/progress-header/${componentArtifacts["progress-header"].css}`,
      "package/dist/page-indicator/index.js",
      `package/dist/page-indicator/${componentArtifacts["page-indicator"].implementation}`,
      "package/dist/page-indicator/index.d.ts",
      `package/dist/page-indicator/${componentArtifacts["page-indicator"].css}`,
      "package/dist/bottom-navigator/index.js",
      `package/dist/bottom-navigator/${componentArtifacts["bottom-navigator"].implementation}`,
      "package/dist/bottom-navigator/index.d.ts",
      `package/dist/bottom-navigator/${componentArtifacts["bottom-navigator"].css}`,
      "package/dist/bottom-sheet/index.js",
      `package/dist/bottom-sheet/${componentArtifacts["bottom-sheet"].implementation}`,
      "package/dist/bottom-sheet/index.d.ts",
      `package/dist/bottom-sheet/${componentArtifacts["bottom-sheet"].css}`,
      "package/dist/step-indicator/index.js",
      `package/dist/step-indicator/${componentArtifacts["step-indicator"].implementation}`,
      "package/dist/step-indicator/index.d.ts",
      "package/dist/step-indicator/StepIndicator.d.ts",
      "package/dist/step-indicator/step-indicator.contract.js",
      "package/dist/step-indicator/step-indicator.contract.d.ts",
      `package/dist/step-indicator/${componentArtifacts["step-indicator"].css}`,
      "package/dist/overlay/index.js",
      "package/dist/overlay/Overlay.jsx",
      "package/dist/overlay/index.d.ts",
      "package/dist/overlay/Overlay.d.ts",
      "package/dist/overlay/overlay.contract.js",
      "package/dist/overlay/overlay.contract.d.ts",
      `package/dist/overlay/${componentArtifacts.overlay.css}`,
      "package/dist/card/index.js",
      `package/dist/card/${componentArtifacts.card.implementation}`,
      "package/dist/card/index.d.ts",
      "package/dist/card/card.contract.js",
      "package/dist/card/card.contract.d.ts",
      `package/dist/card/${componentArtifacts.card.css}`,
      "package/dist/chat-bubble/index.js",
      `package/dist/chat-bubble/${componentArtifacts["chat-bubble"].implementation}`,
      "package/dist/chat-bubble/index.d.ts",
      "package/dist/chat-bubble/ChatBubble.d.ts",
      "package/dist/chat-bubble/chat-bubble.contract.js",
      "package/dist/chat-bubble/chat-bubble.contract.d.ts",
      `package/dist/chat-bubble/${componentArtifacts["chat-bubble"].css}`,
      "package/dist/text-field/index.js",
      `package/dist/text-field/${componentArtifacts["text-field"].implementation}`,
      "package/dist/text-field/index.d.ts",
      "package/dist/text-field/TextField.d.ts",
      "package/dist/text-field/text-field.contract.js",
      "package/dist/text-field/text-field.contract.d.ts",
      `package/dist/text-field/${componentArtifacts["text-field"].css}`,
      "package/dist/tooltip/index.js",
      `package/dist/tooltip/${componentArtifacts.tooltip.implementation}`,
      "package/dist/tooltip/index.d.ts",
      "package/dist/tooltip/Tooltip.d.ts",
      "package/dist/tooltip/tooltip.contract.js",
      "package/dist/tooltip/tooltip.contract.d.ts",
      `package/dist/tooltip/${componentArtifacts.tooltip.css}`,
    ]) {
      expect(stdout).toContain(file);
    }

    for (const directory of Object.keys(componentEntries)) {
      expect(stdout).toContain(`package/dist/${directory}/${directory}.contract.js`);
      expect(stdout).toContain(`package/dist/${directory}/${directory}.contract.d.ts`);
      expect(stdout).not.toContain(`package/dist/${directory}/contract.js`);
      expect(stdout).not.toContain(`package/dist/${directory}/contract.d.ts`);
      expect(stdout).not.toContain(`package/dist/${directory}/logic.js`);
      expect(stdout).not.toContain(`package/dist/${directory}/logic.d.ts`);
    }

    for (const runtime of [
      "package/dist/round-button/RoundButton.jsx",
      "package/dist/compact-numeric-input/CompactNumericInput.jsx",
      "package/dist/bottom-navigator/BottomNavigator.jsx",
    ]) {
      const { stdout: source } = await execFileAsync("tar", [
        "-xOzf",
        path.join(packDir, archives[0]!),
        runtime,
      ]);
      expect(source).not.toContain("replaceAll(");
    }
  });
});
