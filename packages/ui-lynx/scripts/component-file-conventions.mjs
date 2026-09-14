export function findComponentFileConventionViolations(entries) {
  const violations = [];
  for (const entry of entries) {
    const { directory, files } = entry;
    const component = directory
      .split("-")
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join("");
    const has = (name) => files.includes(name);
    const add = (code, actual, expected) =>
      violations.push({
        directory,
        code,
        ...(actual === undefined ? {} : { actual }),
        ...(expected === undefined ? {} : { expected }),
      });
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(directory)) add("invalid-directory");
    if (!has(`${component}.tsx`)) add("missing-component", undefined, `${component}.tsx`);
    if (!has(`${directory}.contract.ts`))
      add(
        "missing-contract",
        has("contract.ts") ? "contract.ts" : undefined,
        `${directory}.contract.ts`,
      );
    if (has("contract.ts"))
      add("forbidden-generic-contract", "contract.ts", `${directory}.contract.ts`);
    if (has("logic.ts")) add("forbidden-logic", "logic.ts", `${directory}.contract.ts`);
    if (!has(`${directory}.css`)) add("missing-css", undefined, `${directory}.css`);
    if (!has("index.ts")) add("missing-index", undefined, "index.ts");
    const uiTests = files.filter((file) => file.endsWith(".ui.test.tsx"));
    if (!has(`${component}.ui.test.tsx`))
      add("missing-ui-test", uiTests[0], `${component}.ui.test.tsx`);
    for (const actual of uiTests) {
      if (actual !== `${component}.ui.test.tsx`)
        add("noncanonical-ui-test", actual, `${component}.ui.test.tsx`);
    }
    const unitTests = files.filter((file) => file.endsWith(".unit.test.ts"));
    if (unitTests.length === 0 && component !== "BackHeader")
      add("missing-unit-test", undefined, `${component}.unit.test.ts`);
    for (const actual of unitTests) {
      if (actual !== `${component}.unit.test.ts`)
        add("noncanonical-unit-test", actual, `${component}.unit.test.ts`);
    }
  }
  violations.sort(
    (a, b) =>
      a.directory.localeCompare(b.directory) ||
      a.code.localeCompare(b.code) ||
      (a.actual ?? "").localeCompare(b.actual ?? "") ||
      (a.expected ?? "").localeCompare(b.expected ?? ""),
  );
  const seen = new Set();
  return violations.filter((violation) => {
    const key = [
      violation.directory,
      violation.code,
      violation.actual ?? "",
      violation.expected ?? "",
    ].join("\u0000");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
