import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

import { bundledContentAudioIds, bundledContentAudioSource } from "./bundled-content-audio";

// `unit` 계층: 앱에 실은 튜토리얼 음성 표(버킷 상대 경로 → 호스트 번들 음성 이름). 호스트는 `apps/ios/Host/audio/<이름>.m4a`를
// 두 플랫폼에 싣고(Android는 같은 폴더를 복사), 이름은 `/`가 없는 조각 하나만 받습니다(`AudioAssetPath` · `resolve`).

const root = join(__dirname, "..", "..", "..", "..");
const tutorialJson = readFileSync(
  join(root, "apps/mobile/content/episodes/u00-tutorial.json"),
  "utf8",
);
const tutorialAudioIds = [
  ...new Set(
    [
      ...tutorialJson.matchAll(/"(?:audio_url|example_audio_url|player_audio_url)": "([^"]+)"/g),
    ].map((match) => match[1] ?? ""),
  ),
].filter((id) => id !== "");

test("BA1. 표는 내장 튜토리얼이 쓰는 음성 id 전부와 같다", () => {
  expect(tutorialAudioIds.length).toBeGreaterThan(0);
  expect(new Set(bundledContentAudioIds)).toEqual(new Set(tutorialAudioIds));
});

test("BA2. 표의 각 음성은 호스트 음성 폴더에 파일이 있다", () => {
  for (const id of bundledContentAudioIds) {
    const name = bundledContentAudioSource(`audio/${id}.m4a`);
    expect(name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(existsSync(join(root, "apps/ios/Host/audio", `${String(name)}.m4a`))).toBe(true);
  }
});

test("BA3. 경로는 `/`를 `-`로 이은 이름이 되고, 표에 없거나 형식이 다르면 null이다", () => {
  expect(bundledContentAudioSource("audio/level-3/u00-tutorial/d-01-r2.m4a")).toBe(
    "level-3-u00-tutorial-d-01-r2",
  );
  for (const bad of [
    "audio/level-3/u01-water/d-01.m4a",
    "level-3/u00-tutorial/d-01-r2",
    "audio/level-3/u00-tutorial/d-01-r2.mp3",
    "content/audio/level-3/u00-tutorial/d-01-r2.m4a",
    "",
  ]) {
    expect(bundledContentAudioSource(bad)).toBeNull();
  }
});
