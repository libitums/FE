import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

// SB-CR1: OptionSelector 이야기의 로마자 줄. 이야기가 index에 서고, 이야기 인자 `withRomanization`이
// 실제로 보기의 `romanization`으로 이어지는지(렌더러가 인자를 무시하지 않는지)를 봅니다.

const appRoot = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string): Promise<string> =>
  readFile(path.join(appRoot, relativePath), "utf8");

describe("OptionSelector 로마자 이야기", () => {
  test("SB-CR1. index.json에 WithRomanization · WithRomanizationAndMeaning 이야기가 있다", async () => {
    const index = JSON.parse(await read("dist/storybook/index.json")) as {
      entries: Record<string, unknown>;
    };
    expect(Object.keys(index.entries)).toContain("components-option-selector--with-romanization");
    expect(Object.keys(index.entries)).toContain(
      "components-option-selector--with-romanization-and-meaning",
    );
  });

  test("SB-CR1. 두 이야기가 withRomanization 인자를 켠다", async () => {
    const source = await read("src/OptionSelector.stories.ts");
    expect(source).toMatch(/export\s+const\s+WithRomanization\b[^;]*withRomanization:\s*true/s);
    expect(source).toMatch(
      /export\s+const\s+WithRomanizationAndMeaning\b[^;]*withRomanization:\s*true[^;]*withMeaning:\s*true/s,
    );
  });

  test("SB-CR1. Lynx 엔트리가 withRomanization 인자로 보기에 romanization을 싣는다", async () => {
    const source = await read("src/lynx/option-selector.tsx");
    expect(source).toContain("args.withRomanization");
    expect(source).toMatch(/romanization\s*:/);
  });
});
