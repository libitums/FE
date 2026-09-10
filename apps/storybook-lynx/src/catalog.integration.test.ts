import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

const appRoot = path.resolve(import.meta.dirname, "..");

async function readOutput(relativePath: string): Promise<string> {
  return readFile(path.join(appRoot, relativePath), "utf8");
}

async function readBinaryOutput(relativePath: string): Promise<Buffer> {
  return readFile(path.join(appRoot, relativePath));
}

describe("Storybook Lynx build outputs", () => {
  test.each(["button", "back-header", "status-indicator"])(
    "%s story는 Rspeedy Lynx Web bundle을 갖는다",
    async (entry) => {
      const bundle = await readBinaryOutput(`dist/lynx/${entry}.web.bundle`);
      expect(bundle.byteLength).toBeGreaterThan(1_000);
      expect(bundle.subarray(0, 8).toString("ascii")).toBe("SDRAWROF");
    },
  );

  test("정적 Storybook shell과 세 컴포넌트 story index를 갖는다", async () => {
    expect(await readOutput("dist/storybook/index.html")).toContain("storybook-root");

    const index = await readOutput("dist/storybook/index.json");
    expect(index).toContain("components-button--default");
    expect(index).toContain("components-back-header--default");
    expect(index).toContain("components-status-indicator--completed");
  });
});
