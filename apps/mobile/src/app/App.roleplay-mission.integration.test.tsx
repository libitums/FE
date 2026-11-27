import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { cleanup } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedRecord } from "./test-helpers/progress-seed";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { resetPushWiringForTests } from "./push-wiring";
import { setRoleplayMissionForTest } from "./roleplay-mission-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { missionListFixture } from "../screens/roleplay-mission/mission-fixture";
import {
  createFakeMissionSource,
  type FakeMissionOptions,
} from "../screens/roleplay-mission/mission-fake-source";
import { createFakeAudioDevice } from "../screens/roleplay-mission/mission-fake-voice";
import {
  id,
  maybe,
  tapButton,
  tapDialogAction,
  tapRound,
  typeInto,
} from "../screens/roleplay-mission/mission-ui.test-support";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";

// 롤플레이 미션(ADR-0160 · ADR-0177)을 App 한 트리에서 봅니다 — 스위치 · 목록 항목 · 미리보기 → 대화 → 성공 카드 · 끝내기 → 채점 →
// 리포트 → 다시 하기 / 목록, 그만두기(필수 전 · 성공 뒤), 채점 실패 → 다시 시도, 채점 대기 판, 음성 한 턴. 출처 · 기기 음성은
// 가짜(계약 fixture)이고 대역은 경계뿐입니다 — `StorageModule` · `fetch`.

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const accessToken = `${base64Url({ alg: "none" })}.${base64Url({
  sub: "u",
  app_metadata: { provider: "google", providers: ["google"] },
})}.sig`;
const refreshed = JSON.stringify({
  access_token: accessToken,
  refresh_token: "refreshed",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "u" },
});

const u01Complete = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"];
// 테스트 번들에는 에피소드 1 ~ 3만 있어, 가짜가 돌리는 6화 미션을 1화 구획에 붙인 목록을 씁니다(미션 값은 계약 fixture 그대로).
const cafe = missionListFixture.missions[1];
if (cafe === undefined) throw new Error("fixture");
const testList = { ...missionListFixture, missions: [{ ...cafe, episodeId: "u01-water" }] };
const store = new Map<string, string>();

async function flush(): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }
}

async function boot(mission: FakeMissionOptions | null): Promise<void> {
  setRoleplayMissionForTest(
    mission === null
      ? null
      : {
          enabled: true,
          source: createFakeMissionSource({
            schedule: (task) => void Promise.resolve().then(task),
            list: testList,
            ...mission,
          }),
          device: createFakeAudioDevice({ schedule: () => undefined }),
        },
  );
  store.clear();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  const body = JSON.stringify(
    learningProgressSnapshotFrom({
      legacyTutorial: legacyPassedRecord,
      catalogProgress: { "u01-water": u01Complete },
    }),
  );
  vi.stubGlobal("fetch", async (url: string) => {
    if (isContentRequest(url)) return contentNotFoundResponse();
    if (url.includes("grant_type=refresh_token"))
      return { status: 200, text: async () => refreshed };
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    if (name === "load_learning_progress") return { status: 200, text: async () => body };
    if (name === "learning_streak" || name === "record_learning_days") {
      return { status: 200, text: async () => "0" };
    }
    return { status: 204, text: async () => "" };
  });
  vi.useFakeTimers();
  render(<App />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await flush();
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  await flush();
}

afterEach(() => {
  cleanup();
  setRoleplayMissionForTest(null);
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function say(text: string): Promise<void> {
  typeInto("roleplay-mission-input", text);
  fireEvent.tap(id("roleplay-mission-send"), {});
  await flush();
  await flush();
}

async function openAndStart(): Promise<void> {
  fireEvent.tap(id("roleplay-list-item-mission-u06-cafe"), {});
  await flush();
  tapButton("roleplay-mission-preview-start");
  await flush();
}

test("[MI1] 스위치가 꺼져 있으면 목록에 미션 항목이 없다 — 대본형 항목은 그대로", async () => {
  await boot(null);
  expect(id("roleplay-list-item-story-u01-water")).toBeInTheDocument();
  expect(id("roleplay-list-section-row-u01-water").children).toHaveLength(1);
  expect(maybe("roleplay-list-item-mission-u06-cafe")).not.toBeInTheDocument();
});

test("[MI2] 목록 → 미리보기 → 대화 세 턴 → 성공 카드 → 끝내기 → 채점 → 리포트 → 다시 하기 → 목록으로", async () => {
  await boot({});
  expect(id("roleplay-list-item-form-mission-u06-cafe")).toHaveTextContent(
    "Mission · 4 goals · Best 73",
  );
  expect(id("roleplay-list-item-mission-u06-cafe")).toHaveAttribute("data-locked", "false");
  expect(maybe("roleplay-mission-report-ready-u06-cafe")).not.toBeInTheDocument();
  expect(id("roleplay-list-item-mission-u06-cafe")).toHaveAttribute(
    "accessibility-label",
    "Order a coffee, Mission · 4 goals · Best 73",
  );
  await openAndStart();
  expect(id("roleplay-mission-talk")).toHaveAttribute("data-phase", "talking");
  expect(id("roleplay-mission-log")).toHaveTextContent("반가워요. 뭐 드릴까요?");

  await say("아이스 아메리카노 한 잔 주세요.");
  expect(id("roleplay-mission-goal-order")).toHaveAttribute("data-done", "true");
  expect(id("roleplay-mission-turns-left")).toHaveTextContent("9 turns left");
  await say("가지고 가요.");
  expect(id("roleplay-mission-better-card")).toHaveAttribute("data-kind", "better");
  await say("카드로 할게요.");
  expect(id("roleplay-mission-success-card")).toHaveTextContent("Mission success!");
  expect(id("roleplay-mission-turns-left")).toHaveTextContent("7 turns left · Mission success");
  tapButton("roleplay-mission-success-finish");
  await flush();
  await flush();

  expect(id("roleplay-mission-report-outcome")).toHaveTextContent("Mission complete");
  expect(id("roleplay-mission-report-score")).toHaveTextContent("73 points");
  expect(id("roleplay-mission-report-better")).toHaveTextContent("포장이요.");
  tapButton("roleplay-mission-report-play-again");
  expect(id("roleplay-mission-preview")).toBeInTheDocument();
  tapRound("roleplay-mission-preview-back");
  await flush();
  expect(id("roleplay-list-item-mission-u06-cafe")).toBeInTheDocument();
});

test("[MI3] 그만두기 — 확인 뒤 리포트 없이 목록으로", async () => {
  await boot({});
  await openAndStart();
  tapRound("roleplay-mission-talk-quit");
  tapDialogAction("quit");
  await flush();
  expect(maybe("roleplay-mission-report")).not.toBeInTheDocument();
  expect(id("roleplay-list-item-mission-u06-cafe")).toBeInTheDocument();
});

test("[MI4] 채점 실패 → 값을 돌려줬다는 안내 → 다시 시도 → 리포트", async () => {
  await boot({ grading: "fail-once" });
  await openAndStart();
  await say("아메리카노 주세요");
  await say("카드로 할게요");
  tapButton("roleplay-mission-success-continue");
  fireEvent.tap(id("roleplay-mission-finish-button"), {});
  await flush();
  await flush();
  expect(id("roleplay-mission-report-failed")).toHaveTextContent("We gave back what you paid");
  tapButton("roleplay-mission-report-retry-grading");
  await flush();
  expect(id("roleplay-mission-report-outcome")).toHaveTextContent("Mission complete");
});

test("[MI5] 엽전이 모자라면 미리보기에 까닭이 서고 대화로 가지 않는다", async () => {
  await boot({ start: "insufficient_credits" });
  await openAndStart();
  expect(id("roleplay-mission-preview-error")).toHaveAttribute("data-code", "insufficient_credits");
  expect(maybe("roleplay-mission-talk")).not.toBeInTheDocument();
});

test("[MI6] 성공 뒤 그만두기는 끝내기 — 채점해 리포트를 보인다", async () => {
  await boot({});
  await openAndStart();
  await say("아메리카노 주세요");
  await say("카드로 할게요");
  tapRound("roleplay-mission-talk-quit");
  expect(id("roleplay-mission-quit-dialog")).toHaveTextContent("Finish this mission?");
  tapDialogAction("quit");
  await flush();
  await flush();
  expect(id("roleplay-mission-report-outcome")).toHaveTextContent("Mission complete");
});

test("[MI7] 채점 대기 판 — 미션을 열면 미리보기 대신 채점 → 리포트, 다시 하기는 미리보기", async () => {
  await boot({ pendingReport: true });
  expect(id("roleplay-mission-report-ready-u06-cafe")).toHaveTextContent("Report ready");
  expect(id("roleplay-list-item-mission-u06-cafe")).toHaveAttribute(
    "accessibility-label",
    "Order a coffee, Mission · 4 goals · Best 73, Report ready",
  );
  fireEvent.tap(id("roleplay-list-item-mission-u06-cafe"), {});
  await flush();
  await flush();
  expect(id("roleplay-mission-report-outcome")).toHaveTextContent("Mission complete");
  tapButton("roleplay-mission-report-play-again");
  expect(id("roleplay-mission-preview")).toBeInTheDocument();
});

test("[MI8] 음성 한 턴 — 마이크로 말하면 서버가 받아 적어 바로 보내고 목표가 이뤄진다", async () => {
  await boot({});
  await openAndStart();
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await flush();
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await flush();
  await flush();
  await flush();
  expect(id("roleplay-mission-log")).toHaveTextContent("아이스 아메리카노 한 잔 주세요.");
  expect(id("roleplay-mission-goal-order")).toHaveAttribute("data-done", "true");
});

test("[MI9] 채점 대기 판의 채점이 실패하면 실패 안내 → 다시 시도(채점 중) → 리포트", async () => {
  await boot({ pendingReport: true, grading: "fail-once" });
  fireEvent.tap(id("roleplay-list-item-mission-u06-cafe"), {});
  await flush();
  await flush();
  expect(id("roleplay-mission-report-failed")).toHaveTextContent("We couldn't score this");
  tapButton("roleplay-mission-report-retry-grading");
  expect(id("roleplay-mission-report-failed")).toHaveTextContent("Scoring your conversation…");
  await flush();
  await flush();
  expect(id("roleplay-mission-report-outcome")).toHaveTextContent("Mission complete");
});
