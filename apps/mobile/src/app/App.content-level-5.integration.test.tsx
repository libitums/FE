import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import { CONTENT_MANIFEST_KEY, contentEpisodeKey } from "../lib/episode-cache";
import { sha256Hex, utf8Bytes } from "../lib/sha256";
import { resetApp } from "./test-helpers/episode-format-harness";
import { tutorialDoneProgress } from "./test-helpers/progress-seed";
import { bootTutorialApp, flushAsync } from "./test-helpers/tutorial-boot";

// `integration` 계층: 콘텐츠 수준 5(ADR-0137) — 앱이 `manifests/level-5.json`을 먼저 받고, staging 2026-11-10판
// 모양(`why_wrong` 객체 · 빈 TURN_ORDER `context` · `tiles_gloss` 없는 RP)의 본문을 검증 · 저장한다.
// 디코드에 실패한 본문은 저장되지 않고 잠깁니다. 대역은 경계뿐입니다(저장소 · fetch).

afterEach(resetApp);

const U01 = "u01-water";
type Json = Record<string, unknown>;

/** 내장 u01 본문을 수준 5 모양으로 바꾼 원문입니다. 바꾼 칸 수도 셉니다(공허한 통과를 막습니다). */
function level5Body(overrides: Json = {}): {
  text: string;
  changed: { whyWrong: number; turnOrder: number; roleplay: number };
} {
  const body = JSON.parse(
    readFileSync(resolve(process.cwd(), "content/episodes/u01-water.json"), "utf8"),
  ) as Json & { steps: Array<{ items?: Json[] }> };
  if (typeof overrides.titleEn === "string") body.title_en = overrides.titleEn;
  const changed = { whyWrong: 0, turnOrder: 0, roleplay: 0 };
  for (const step of body.steps) {
    for (const item of step.items ?? []) {
      for (const option of (item.options as Json[] | undefined) ?? []) {
        if (typeof option.why_wrong === "string") {
          option.why_wrong = { ko: option.why_wrong, en: "Not the right word here." };
          changed.whyWrong += 1;
        }
      }
      if (item.type === "TURN_ORDER") {
        item.context = null;
        changed.turnOrder += 1;
      }
      if (item.type === "ROLEPLAY_TURN") {
        const roleplay = item.roleplay as Json;
        delete roleplay.tiles_gloss;
        roleplay.tiles_kind = "syllable";
        changed.roleplay += 1;
      }
    }
  }
  return { text: JSON.stringify(body), changed };
}

function manifestOf(level: number, text: string, url: string): string {
  return JSON.stringify({
    schema: "manifest-1",
    generated_at: "2026-11-13T00:00:00Z",
    min_client_level: level,
    episodes: [
      {
        id: U01,
        order: 1,
        title: "물 사기",
        schema: "delivery-2",
        version: "2099-01-01.1",
        sha256: sha256Hex(utf8Bytes(text)),
        bytes: utf8Bytes(text).length,
        url,
      },
    ],
  });
}

const progressSeed = { catalogProgress: tutorialDoneProgress() };

test("CI1. 수준 5 매니페스트를 먼저 받고, 새 모양 본문을 잠그지 않고 저장한다", async () => {
  const { text, changed } = level5Body();
  expect(changed.whyWrong).toBeGreaterThan(0);
  expect(changed.turnOrder).toBeGreaterThan(0);
  expect(changed.roleplay).toBeGreaterThan(0);
  const url = `episodes/level-5/${U01}.json`;
  const manifest = manifestOf(5, text, url);
  const { urls, store } = await bootTutorialApp({
    serve: { manifest, episodes: {}, files: { "manifests/level-5.json": manifest, [url]: text } },
    progressSeed,
  });
  await flushAsync();

  const manifestCalls = urls.filter((called) => called.includes("manifest"));
  expect(manifestCalls[0]).toContain("manifests/level-5.json");
  expect(urls.some((called) => called.includes(url))).toBe(true);
  expect(store.get(contentEpisodeKey(U01))).toBe(text);
});

test("CI2. 수준 5 매니페스트가 없으면 지금처럼 수준 4 매니페스트를 쓴다", async () => {
  const text = readFileSync(resolve(process.cwd(), "content/episodes/u01-water.json"), "utf8");
  const url = `episodes/level-4/${U01}.json`;
  const manifest = manifestOf(4, text, url);
  const { urls, store } = await bootTutorialApp({
    serve: { manifest, episodes: {}, files: { "manifests/level-4.json": manifest, [url]: text } },
    progressSeed,
  });
  await flushAsync();

  const manifestCalls = urls.filter((called) => called.includes("manifest"));
  expect(
    manifestCalls
      .slice(0, 2)
      .map((called) => called.replace(/\?.*$/, "").split("/").slice(-2).join("/")),
  ).toEqual(["manifests/level-5.json", "manifests/level-4.json"]);
  expect(store.get(contentEpisodeKey(U01))).toBe(text);
});

test("CI3. 저장된 수준 5 매니페스트와 새 모양 본문으로 켜면 내장판이 아니라 그 본문이 화면에 선다", async () => {
  // 원격 본문이 디코드에 실패하면 카탈로그는 내장판으로 물러납니다(잠기지 않음) — 그래서 제목으로 어느 판인지 가립니다.
  const { text } = level5Body({ titleEn: "Buying Water (level 5)" });
  const manifest = manifestOf(5, text, `episodes/level-5/${U01}.json`);
  await bootTutorialApp({
    offline: true,
    progressSeed: {
      catalogProgress: {
        ...tutorialDoneProgress(),
        [U01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
      },
    },
    preStore: { [CONTENT_MANIFEST_KEY]: manifest, [contentEpisodeKey(U01)]: text },
  });

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  expect(screen.getByTestId(`roleplay-list-item-title-story-${U01}`).textContent).toBe(
    "Buying Water (level 5)",
  );
});
