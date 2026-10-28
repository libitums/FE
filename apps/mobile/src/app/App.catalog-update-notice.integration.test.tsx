import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { emptyJourneyProgress, learningProgressSnapshotFrom } from "./learning-progress";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { TUTORIAL_LESSON_KEYS } from "./test-helpers/progress-seed";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { catalogUpdateNoticeStorageKey } from "../lib/catalog-update-notice";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { catalogUpdateNoticeTestIds as ids } from "../screens/catalog-update/catalog-update-notice.contract";

// `integration` 계층: 진행 조회 → 완료한 에피소드(u00)에 안 끝낸 유닛(S5)이 있으면 지도 위 안내 → 닫기 →
// 기기 저장소 기록 → 같은 상태로 다시 켜면 안 뜸. 대역은 경계뿐입니다(저장소 · fetch). 판정 · 기록 모듈은 실물입니다.

const token = `e30.${btoa(JSON.stringify({ sub: "learner" })).replace(/=+$/, "")}.sig`;
const empty = learningProgressSnapshotFrom(emptyJourneyProgress);
const U00 = "u00-tutorial";
const updatedProgress = {
  ...empty,
  catalogProgress: {
    [U00]: ["intro", ...TUTORIAL_LESSON_KEYS.filter((key) => key !== "S5"), "RP"],
  },
};
type Reply = { status: number; body: string };

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function boot(store: Map<string, string>, load: () => Promise<Reply>) {
  store.set(authSessionStorageKey, serializeAuthSession(signedInBootSession));
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  await renderSignedInApp(<App />, {
    refreshedAccessToken: token,
    keepFakeTimers: true,
    loadProgress: load,
    storageModule: {
      get: (key) => store.get(key) ?? null,
      set: (key, value) => void store.set(key, value),
      remove: (key) => void store.delete(key),
    },
  });
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
  }
}
const loaded = async (): Promise<Reply> => ({ status: 200, body: JSON.stringify(updatedProgress) });
const dialog = () => screen.queryByTestId(ids.dialog);

const record = (store: Map<string, string>) =>
  JSON.parse(store.get(catalogUpdateNoticeStorageKey) ?? "{}") as {
    versions: Record<string, string> | null;
    muted: boolean;
  };

test("UNI1. 끝낸 에피소드에 새 유닛이 있고 기록이 없으면 안내가 서고, 닫으면 지금 버전을 적어 다시 켜도 안 뜬다", async () => {
  const store = new Map<string, string>();
  await boot(store, loaded);
  expect(dialog()).toBeInTheDocument();
  fireEvent.tap(within(screen.getByTestId(ids.confirm)).getByTestId("ui-lynx-button"), {});
  expect(dialog()).toBeNull();
  expect(record(store).muted).toBe(false);
  expect(typeof record(store).versions?.[U00]).toBe("string");
  cleanup();
  await boot(store, loaded);
  expect(dialog()).toBeNull();
});

test("UNI4. 버전이 그대로면 진행이 바뀌어도(유닛을 끝내 새 유닛이 줄어도) 안 뜨고, 그 에피소드 버전이 올라가면 한 번 뜬다", async () => {
  const store = new Map<string, string>();
  await boot(store, loaded);
  fireEvent.tap(within(screen.getByTestId(ids.confirm)).getByTestId("ui-lynx-button"), {});
  const seen = record(store);
  cleanup();
  const fewer = async (): Promise<Reply> => ({
    status: 200,
    body: JSON.stringify({
      ...updatedProgress,
      catalogProgress: {
        [U00]: [
          "intro",
          ...TUTORIAL_LESSON_KEYS.filter((key) => key !== "S5" && key !== "S6"),
          "RP",
        ],
      },
    }),
  });
  await boot(store, fewer);
  expect(dialog()).toBeNull();
  cleanup();
  store.set(
    catalogUpdateNoticeStorageKey,
    JSON.stringify({ ...seen, versions: { ...seen.versions, [U00]: "2000-01-01.1" } }),
  );
  await boot(store, loaded);
  expect(dialog()).toBeInTheDocument();
});

test("UNI2. 체크하고 닫으면 끈 것으로 적고, 껐으면 새 상태에도 안 뜬다", async () => {
  const store = new Map<string, string>();
  await boot(store, loaded);
  fireEvent.tap(screen.getByTestId(ids.mute), {});
  fireEvent.tap(within(screen.getByTestId(ids.confirm)).getByTestId("ui-lynx-button"), {});
  expect(record(store).muted).toBe(true);
  cleanup();
  store.set(catalogUpdateNoticeStorageKey, JSON.stringify({ versions: null, muted: true }));
  await boot(store, loaded);
  expect(dialog()).toBeNull();
});

test("UNI3. 진행 조회가 끝나기 전이나 실패하면 뜨지 않는다", async () => {
  await boot(new Map(), () => new Promise<Reply>(() => {}));
  expect(dialog()).toBeNull();
  cleanup();
  await boot(new Map(), async () => ({ status: 503, body: "" }));
  expect(dialog()).toBeNull();
});
