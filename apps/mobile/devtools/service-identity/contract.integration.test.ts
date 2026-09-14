import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const infoPlist = readFileSync(resolve(repositoryRoot, "apps/ios/Host/Info.plist"), "utf8");
const projectFile = readFileSync(resolve(repositoryRoot, "apps/ios/Host.xcodeproj/project.pbxproj"), "utf8");

test("Host source bundle metadata declares the exact Duru display name", () => {
  expect(infoPlist.match(/<key>CFBundleDisplayName<\/key>/g) ?? []).toHaveLength(1);
  expect(infoPlist).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>Duru<\/string>/);
});

test("Debug and Release Host configurations retain the plist, bundle ID, and Host product", () => {
  const hostList = projectFile.match(/2B94A3D92D6613740060892C \/\* Build configuration list for PBXNativeTarget "Host" \*\/ = \{[\s\S]*?\n\t\t\};/)?.[0];
  expect(hostList).toBeDefined();
  expect(hostList?.match(/\/\* (Debug|Release) \*\//g) ?? []).toHaveLength(2);
  for (const [id, name] of [["2B94A3DA2D6613740060892C", "Debug"], ["2B94A3DB2D6613740060892C", "Release"]]) {
    const configuration = projectFile.match(new RegExp(`${id} /\\* ${name} \\*/ = \\{[\\s\\S]*?\\n\\t\\t\\};`))?.[0];
    expect(configuration).toBeDefined();
    expect(configuration).toContain('INFOPLIST_FILE = "Host/Info.plist";');
    expect(configuration).toContain('PRODUCT_BUNDLE_IDENTIFIER = "com.libitum.host";');
    expect(configuration).toContain('PRODUCT_NAME = "$(TARGET_NAME)";');
  }
  expect(projectFile).toMatch(/name = "Host";\s*productName = "Host";/);
});

test("the source-to-built metadata handoff remains an explicit manual boundary", () => {
  expect(projectFile).toContain("GENERATE_INFOPLIST_FILE = YES;");
  expect(projectFile).toContain('INFOPLIST_FILE = "Host/Info.plist";');
});
