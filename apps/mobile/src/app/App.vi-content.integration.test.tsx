import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { legacyPassedRecord } from "./test-helpers/progress-seed";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { u01TitleId, u01TitleVi } from "../lib/episode-bundled.vi.test-support";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { uiLanguageStorageKey } from "../lib/ui-language";

// `integration` 계층: 콘텐츠 번역표가 UI 언어를 따라 화면까지 닿는다(ADR-0091 D2) — 베트남어 사용자는 u01의
// 영어 제목 대신 번역을, 영어 사용자는 원문을 본다. 롤플레이 목록의 에피소드 제목이 `titleEn`을 그린다.

vi.mock("../lib/episode-bundled", () => import("../lib/episode-bundled.vi.test-support"));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const u01Complete = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"];
const seed = learningProgressSnapshotFrom({
  legacyTutorial: legacyPassedRecord,
  catalogProgress: { "u01-water": u01Complete },
});

function storageWith(language: string) {
  const store = new Map<string, string>([
    [authSessionStorageKey, serializeAuthSession(signedInBootSession)],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    [uiLanguageStorageKey, language],
  ]);
  return {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: string) => void store.set(key, value),
    remove: (key: string) => void store.delete(key),
  };
}

async function roleplayTitle(language: string): Promise<string> {
  await renderSignedInApp(<App progressSeed={seed} />, { storageModule: storageWith(language) });
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  return screen.getByTestId("roleplay-list-item-title-story-u01-water").textContent ?? "";
}

test("[IV1] 베트남어 사용자는 번역표의 제목을 본다", async () => {
  expect(await roleplayTitle("vi")).toBe(u01TitleVi);
});

test("[IV3] 인도네시아어 사용자는 id 표의 제목을 본다(ADR-0093)", async () => {
  expect(await roleplayTitle("id")).toBe(u01TitleId);
});

test("[IV2] 영어 사용자는 같은 콘텐츠에서 영어 원문을 본다", async () => {
  expect(await roleplayTitle("en")).toBe("Buying Water");
});
