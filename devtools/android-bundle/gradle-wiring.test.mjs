import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const gradle = await readFile(join(root, "apps/android/app/build.gradle"), "utf8");

// 주석 줄은 결선이 아니다 — 지운 뒤 본문만 본다.
const body = gradle
  .split("\n")
  .filter((line) => !line.trim().startsWith("//"))
  .join("\n");

test("GW1: host audio is not wired through the legacy sourceSets assets.srcDir", () => {
  assert.doesNotMatch(
    body,
    /assets\.srcDir\(/,
    "build.gradle still registers a generated dir with sourceSets assets.srcDir(...): that path never carries the sync task dependency to merge<V>Assets/bundle",
  );
});

test("GW2: variants add the generated dir via addGeneratedSourceDirectory from both ios sources", () => {
  assert.match(body, /addGeneratedSourceDirectory/, "addGeneratedSourceDirectory is not used");
  assert.match(body, /ios\/Host\/audio/, "ios/Host/audio is not a source of the generated assets");
  assert.match(body, /ios\/Host\/sfx/, "ios/Host/sfx is not a source of the generated assets");
});

test("GW3: m4a and mp3 are both kept uncompressed (openFd needs STORED entries)", () => {
  const match = body.match(/noCompress\s*\+?=\s*\[([^\]]*)\]/);
  assert.ok(match, "androidResources.noCompress is not declared");
  assert.match(match[1], /['"]m4a['"]/, "noCompress lacks 'm4a'");
  assert.match(match[1], /['"]mp3['"]/, "noCompress lacks 'mp3'");
});
