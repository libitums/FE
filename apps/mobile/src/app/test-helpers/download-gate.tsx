import { vi } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "../App";
import { legacyPassedSeed, type ProgressSeedShape } from "./progress-seed";
import { renderSignedInApp, signedInBootSession } from "./signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../../lib/auth-session";
import { learningItemGuideSeenStorageKey } from "../../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../../lib/learning-item-guide.test-support";
import { bundledCatalogInput } from "../../lib/episode-bundled.test-support";
import { contentCommonAssetsKey, contentUnitAssetsKey } from "../../lib/episode-asset-groups-sync";

// 받기 문지기 · 설정 통합 테스트의 공용 지원입니다 — 제품 코드가 import하지 않습니다.

export const U01 = "u01-water";

/** 부팅 — `network`는 호스트의 연결 문자열(null이면 옛 호스트), `initial`은 기기 저장소 시드입니다. */
export async function bootDownloadApp(
  network: string | null,
  initial: Record<string, string> = {},
  seed: ProgressSeedShape = legacyPassedSeed,
) {
  if (network !== null) {
    vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => network } });
  }
  const store = new Map<string, string>([
    [authSessionStorageKey, serializeAuthSession(signedInBootSession)],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ...Object.entries(initial),
  ]);
  const module = {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: string) => void store.set(key, value),
    remove: (key: string) => void store.delete(key),
  };
  await renderSignedInApp(<App progressSeed={seed} />, { storageModule: module });
  return store;
}

export const tap = (element: Element) => fireEvent.tap(element, {});
export const tapCover = (id: string) =>
  tap(screen.getByTestId(`ui-lynx-special-unit-catalog-cover-${id}`));
export const sheetAction = (id: string) =>
  within(screen.getByTestId(`ui-lynx-bottom-sheet-action-${id}`)).getByTestId("ui-lynx-button");
export const sheetActionIds = () =>
  screen
    .queryAllByTestId(/^ui-lynx-bottom-sheet-action-/)
    .map((element) =>
      element.getAttribute("data-testid")?.replace("ui-lynx-bottom-sheet-action-", ""),
    );
export const sheetTitle = () => screen.getByTestId("ui-lynx-bottom-sheet-title");
export const coverScreenShown = () => screen.queryByTestId("episode-intro-screen-next") !== null;

/** 유닛 노드를 누르고(말풍선) `Start`를 누릅니다 — 문지기가 막으면 시트가 섭니다. */
export function tapUnit(episodeId: string, unitKey: string) {
  tap(screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-${episodeId}-${unitKey}`));
  tap(screen.getByTestId("step-sheet-start"));
}
/** 학습 화면이 서고 맵이 사라졌는가. */
export const unitOpened = () => screen.queryByTestId("journey-map-screen") === null;

const u01Sha = (): string => {
  const entry = bundledCatalogInput.manifest.episodes.find((candidate) => candidate.id === U01);
  if (entry === undefined) throw new Error("u01 not in bundled manifest");
  return entry.sha256;
};
const marker = () => JSON.stringify({ sha256: u01Sha(), missing: [] });

/** 「받음」 표시 시드 — 공통 묶음 · 지정한 유닛들(편 표시는 두지 않는다). */
export function downloadedSeed(unitKeys: readonly string[]): Record<string, string> {
  return {
    [contentCommonAssetsKey(U01)]: marker(),
    ...Object.fromEntries(unitKeys.map((key) => [contentUnitAssetsKey(U01, key), marker()])),
  };
}
