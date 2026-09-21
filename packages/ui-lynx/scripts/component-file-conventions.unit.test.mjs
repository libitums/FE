import { readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { findComponentFileConventionViolations } from "./component-file-conventions.mjs";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../src");

const entry = (directory, files) => ({ directory, files: [...files].sort() });

describe("findComponentFileConventionViolations", () => {
  test("normalizes empty directory segments without undefined in expected names", () => {
    const violations = findComponentFileConventionViolations([
      entry("foo--bar", []),
      entry("foo-", []),
    ]);

    expect(violations).toEqual([
      { code: "invalid-directory", directory: "foo-" },
      { code: "missing-component", directory: "foo-", expected: "Foo.tsx" },
      { code: "missing-contract", directory: "foo-", expected: "foo-.contract.ts" },
      { code: "missing-css", directory: "foo-", expected: "foo-.css" },
      { code: "missing-index", directory: "foo-", expected: "index.ts" },
      { code: "missing-ui-test", directory: "foo-", expected: "Foo.ui.test.tsx" },
      { code: "missing-unit-test", directory: "foo-", expected: "Foo.unit.test.ts" },
      { code: "invalid-directory", directory: "foo--bar" },
      { code: "missing-component", directory: "foo--bar", expected: "FooBar.tsx" },
      {
        code: "missing-contract",
        directory: "foo--bar",
        expected: "foo--bar.contract.ts",
      },
      { code: "missing-css", directory: "foo--bar", expected: "foo--bar.css" },
      { code: "missing-index", directory: "foo--bar", expected: "index.ts" },
      { code: "missing-ui-test", directory: "foo--bar", expected: "FooBar.ui.test.tsx" },
      { code: "missing-unit-test", directory: "foo--bar", expected: "FooBar.unit.test.ts" },
    ]);
    expect(
      violations.every(
        ({ expected = "", actual = "" }) => !`${expected}${actual}`.includes("undefined"),
      ),
    ).toBe(true);
  });

  test("reports every rule with deterministic directory, code, and actual values", () => {
    const entries = [
      entry("button", [
        "Button.tsx",
        "button.contract.ts",
        "button.css",
        "index.ts",
        "Button.ui.test.tsx",
        "index.ui.test.tsx",
        "Button.unit.test.ts",
        "button.unit.test.ts",
      ]),
      entry("bad-name", ["BadName.tsx", "bad-name.css", "index.ts"]),
      entry("page-indicator", ["PageIndicator.tsx", "PageIndicator.unit.test.ts"]),
    ];

    expect(findComponentFileConventionViolations(entries)).toEqual([
      { code: "missing-contract", directory: "bad-name", expected: "bad-name.contract.ts" },
      { code: "missing-ui-test", directory: "bad-name", expected: "BadName.ui.test.tsx" },
      { code: "missing-unit-test", directory: "bad-name", expected: "BadName.unit.test.ts" },
      {
        code: "noncanonical-ui-test",
        directory: "button",
        expected: "Button.ui.test.tsx",
        actual: "index.ui.test.tsx",
      },
      {
        code: "noncanonical-unit-test",
        directory: "button",
        expected: "Button.unit.test.ts",
        actual: "button.unit.test.ts",
      },
      {
        code: "missing-contract",
        directory: "page-indicator",
        expected: "page-indicator.contract.ts",
      },
      { code: "missing-css", directory: "page-indicator", expected: "page-indicator.css" },
      { code: "missing-index", directory: "page-indicator", expected: "index.ts" },
      {
        code: "missing-ui-test",
        directory: "page-indicator",
        expected: "PageIndicator.ui.test.tsx",
      },
    ]);
  });

  test("does not mutate input and collects all violations", () => {
    const entries = [entry("button", ["Button.tsx", "button.css"]), entry("bad", [])];
    const before = structuredClone(entries);

    const violations = findComponentFileConventionViolations(entries);

    expect(entries).toEqual(before);
    expect(violations.length).toBeGreaterThan(1);
    expect(violations.map(({ directory }) => directory)).toEqual(
      [...violations.map(({ directory }) => directory)].sort(),
    );
    expect(findComponentFileConventionViolations([...entries].reverse())).toEqual(violations);
  });

  test("the nineteen public component directories are canonical", async () => {
    const directories = (await readdir(sourceRoot, { withFileTypes: true }))
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .sort();
    const entries = await Promise.all(
      directories.map(async (directory) =>
        entry(directory, await readdir(resolve(sourceRoot, directory))),
      ),
    );

    expect(directories).toEqual([
      "answer-label",
      "back-header",
      "bottom-navigator",
      "bottom-sheet",
      "button",
      "card",
      "chat-bubble",
      "compact-numeric-input",
      "dialog",
      "fog",
      "overlay",
      "page-indicator",
      "progress-header",
      "round-button",
      "status-indicator",
      "step-indicator",
      "text-field",
      "tooltip",
      "visual-novel-dialog",
    ]);
    expect(findComponentFileConventionViolations(entries)).toEqual([]);
  });
});
