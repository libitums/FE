import { journeySeedBefore } from "./test-helpers/journey-seed";
import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { readFinalStory } from "./test-helpers/final-story";
import { App } from "./App";
import type { AppJourneySeed } from "./App";
import { hangulIn, hangulOutside } from "./test-helpers/hangul";
import type { ContentTestId } from "./test-helpers/hangul";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import type { StorageModuleDouble } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import type { EntryEvent } from "../lib/entry-flow";
import type { LearningForm } from "../lib/learning-form";
import { uiLanguageStorageKey } from "../lib/ui-language";
import { journeySteps } from "../screens/journey-map/journey-map";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import { questionsForStep } from "../screens/listening/listening";

// UI 언어 문구표의 App 수준 협력을 봅니다(ADR-0006 D4). 이 파일이 재는 것은 두 갈래입니다.
//
// 1) 저장 — 언어 선택 → `entry-wiring` → `saveUiLanguage`(IL3~IL5), 부팅 → `loadUiLanguage` →
//    Provider(IL1 · IL2 · IL4). 경계는 `NativeModules.StorageModule`(기록하는 맵 저장소) ·
//    `fetch` · `WebAuthenticationModule`뿐입니다.
// 2) 영어 표면 — 화면을 실제 트리로 열어 한글이 **학습 콘텐츠 자리에만** 있음을 봅니다(IL6 · IL7).
//    `hangulIn` · `hangulOutside`는 `test-helpers/hangul.ts`입니다.
//
// IL9(이벤트 불변)는 새 케이스가 아니라 기존 `App.analytics` · 화면별 이벤트 단언이 **값 그대로**
// 초록인 것이 증인입니다 — 이 파일은 그 값을 다시 적지 않습니다.

// 서사 표지를 이미 끝낸 채로 부팅합니다 — 이 파일이 보는 것은 표지 뒤의 흐름입니다(표지는 IL7이 따로 엽니다).
const completedIntros = ["tutorial-intro"] as const;

const formStub = vi.hoisted(() => ({ current: null as LearningForm | null }));

// 배정표만 부분 대역합니다(`App.learning-form.integration.test.tsx`와 같은 형태) — 학습 화면 여섯을
// 같은 스텝에서 골라 열기 위해서입니다. 나머지 export는 그대로 통과해 맵 · 진행이 실물로 돕니다.
vi.mock("../screens/journey-map/journey-map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../screens/journey-map/journey-map")>();
  // 튜토리얼 배정과 독립적으로 범용 학습형을 여는 회귀 픽스처입니다.
  const fixture = await import("./test-helpers/learning-route-fixture");
  return {
    ...actual,
    learningFormsForStep: (id: JourneyStepId) =>
      formStub.current === null ? fixture.learningFormsForStep(id) : ([formStub.current] as const),
    learningFormAt: (id: JourneyStepId, index: number) =>
      formStub.current === null
        ? fixture.learningFormAt(id, index)
        : index === 0
          ? formStub.current
          : undefined,
  };
});

afterEach(() => {
  formStub.current = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ------------------------------------------------------------ 저장소 · 호스트 대역

type RecordedStorage = {
  readonly store: Map<string, string>;
  readonly gets: { readonly key: string; readonly value: string | null }[];
  readonly sets: { readonly key: string; readonly value: string }[];
  readonly removes: string[];
  readonly module: StorageModuleDouble;
};

/** 호출을 기록하는 맵 저장소입니다. `initial`이 부팅 전에 들어 있는 값입니다. */
function recordedStorage(initial: Record<string, string> = {}): RecordedStorage {
  const store = new Map<string, string>(Object.entries(initial));
  const gets: { key: string; value: string | null }[] = [];
  const sets: { key: string; value: string }[] = [];
  const removes: string[] = [];
  return {
    store,
    gets,
    sets,
    removes,
    module: {
      get: (key) => {
        const value = store.get(key) ?? null;
        gets.push({ key, value });
        return value;
      },
      set: (key, value) => {
        sets.push({ key, value });
        store.set(key, value);
      },
      remove: (key) => {
        removes.push(key);
        store.delete(key);
      },
    },
  };
}

/** 세션이 이미 든 설치의 저장소입니다 — 재방문자입니다. */
function sessionStorageWith(extra: Record<string, string> = {}): RecordedStorage {
  return recordedStorage({
    [authSessionStorageKey]: serializeAuthSession(signedInBootSession),
    ...extra,
  });
}

function keysOf(storage: RecordedStorage): readonly string[] {
  return Array.from(storage.store.keys()).sort();
}

function languageKeyCalls(storage: RecordedStorage): {
  readonly gets: number;
  readonly sets: readonly string[];
  readonly removes: number;
} {
  return {
    gets: storage.gets.filter((call) => call.key === uiLanguageStorageKey).length,
    sets: storage.sets
      .filter((call) => call.key === uiLanguageStorageKey)
      .map((call) => call.value),
    removes: storage.removes.filter((key) => key === uiLanguageStorageKey).length,
  };
}

// spec `entry` 계약의 고정 16진(32바이트)입니다 — 웹 인증의 `randomBytes` 대역이 돌려줍니다.
const fixedRandomBytesHex = "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79";

const exchangeBody = JSON.stringify({
  access_token: "access-token-1",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 9999999999,
  refresh_token: "refresh-token-1",
  user: { id: "user-1" },
});

// 새 설치 부팅 — 구글(웹 인증) 경로가 코드 검증 없이 언어 선택에 닿는 가장 짧은 성공 경로입니다.
function stubFreshInstallHost(storage: RecordedStorage): void {
  vi.stubGlobal("NativeModules", {
    StorageModule: storage.module,
    WebAuthenticationModule: {
      start: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "completed", callbackUrl: "duru://auth-callback?code=abc" }),
      randomBytes: () => fixedRandomBytesHex,
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubGlobal("fetch", async () => ({ status: 200, text: async () => exchangeBody }));
}

async function advanceTimersAsync(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function tapButtonIn(testId: string): void {
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});
}

/**
 * 새 설치 → 온보딩 → 구글 로그인 → 언어 선택까지 흘립니다. `pickLanguage`가 참이면 언어 선택에서
 * 영어를 **누르고**, 거짓이면 아무것도 고르지 않은 채 남깁니다. 어느 쪽이든 `Continue` → 여정 입장
 * → 입장까지 가 여정 맵에 닿습니다.
 */
async function walkEntryFlow(
  storage: RecordedStorage,
  options: { readonly pickLanguage: boolean },
): Promise<EntryEvent[]> {
  stubFreshInstallHost(storage);
  vi.useFakeTimers();
  const events: EntryEvent[] = [];
  render(
    <App
      journeySeed={journeySeedBefore("ordering")}
      phoneSignIn="visible"
      entryEventSink={(event) => events.push(event)}
    />,
  );
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  for (let index = 0; index < 3; index += 1) tapButtonIn("onboarding-screen-next");
  tapButtonIn("login-screen-method-google");
  await advanceTimersAsync(0);
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();

  if (options.pickLanguage) {
    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-en"), {});
  }
  tapButtonIn("language-select-screen-next");
  tapButtonIn("journey-entry-screen-start");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  return events;
}

function expectEnglishJourneyTabs(): void {
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "accessibility-label",
    "Journey, selected",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "accessibility-label",
    "Roleplay",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
    "accessibility-label",
    "Settings",
  );
}

// ------------------------------------------------------------ IL1 · IL2 · 부팅 읽기

test("[IL1] ⭐ 저장된 언어가 vi인 재방문자는 부팅 중에 그 키를 읽고, 여정 맵에 영어 탭으로 선다", async () => {
  const storage = sessionStorageWith({ [uiLanguageStorageKey]: "vi" });

  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
    {
      storageModule: storage.module,
    },
  );

  // 부팅이 언어 키를 실제로 읽었다 — 읽지 않았다면 아래 영어는 「기본값이 영어라서」 우연히 참이다.
  expect(languageKeyCalls(storage).gets).toBeGreaterThanOrEqual(1);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  // vi는 열리지 않은 언어라 표가 영어로 채운다(AC3) — 던지지 않고 영어 탭이 선다.
  expectEnglishJourneyTabs();
});

describe.each([["ko"], [""]])("[IL2] 저장된 언어가 이상한 값(%j)", (stored) => {
  test("부팅이 성공하고 영어이며, 그 키를 지우거나 덮지 않는다", async () => {
    const storage = sessionStorageWith({ [uiLanguageStorageKey]: stored });

    await renderSignedInApp(
      <App
        journeySeed={journeySeedBefore("ordering")}
        completedEpisodeIntroIds={completedIntros}
      />,
      {
        storageModule: storage.module,
      },
    );

    expect(languageKeyCalls(storage).gets).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    expectEnglishJourneyTabs();
    expect(languageKeyCalls(storage)).toMatchObject({ sets: [], removes: 0 });
    expect(storage.store.get(uiLanguageStorageKey)).toBe(stored);
  });
});

// ------------------------------------------------------------ IL3 · IL4 · IL5 · 저장

test("[IL3] ⭐ 언어 선택의 Continue가 고른 언어를 1회 저장하고, 분석 이벤트는 하나도 늘지 않는다", async () => {
  // 대조군 — 같은 새 설치에서 언어를 고르지 않은 흐름의 이벤트열입니다.
  const controlStorage = recordedStorage();
  const controlEvents = await walkEntryFlow(controlStorage, { pickLanguage: false });
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();

  const storage = recordedStorage();
  const events = await walkEntryFlow(storage, { pickLanguage: true });

  expect(languageKeyCalls(storage).sets).toEqual(["en"]);
  // 고르지 않고 Continue만 누른 흐름도 확정 순간에 같은 값을 1회 저장한다(spec §5 개정 — 저장은 확정 때).
  expect(languageKeyCalls(controlStorage).sets).toEqual(["en"]);
  expect(events.length).toBeGreaterThan(0);
  expect(events.every((event) => event.name.startsWith("entry_"))).toBe(true);
  // 선택은 저장일 뿐 이벤트가 아니다 — 고르지 않은 흐름과 같은 이벤트가 같은 순서로 난다.
  expect(events).toEqual(controlEvents);
});

test("[IL4] ⭐ 고른 언어는 App을 내렸다 다시 그려도 부팅에서 읽힌다", async () => {
  const storage = recordedStorage();
  await walkEntryFlow(storage, { pickLanguage: true });
  expect(storage.store.get(uiLanguageStorageKey)).toBe("en");
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  const getsBeforeReboot = storage.gets.length;

  // 재실행 — 진입 흐름 없이 세션 갱신으로 여정 맵에 선다.
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
    {
      storageModule: storage.module,
    },
  );

  const bootReads = storage.gets
    .slice(getsBeforeReboot)
    .filter((call) => call.key === uiLanguageStorageKey);
  expect(bootReads.length).toBeGreaterThanOrEqual(1);
  expect(bootReads.every((call) => call.value === "en")).toBe(true);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expectEnglishJourneyTabs();
});

test("[IL5] 진입 흐름을 마친 뒤의 저장 키는 세션과 UI 언어 둘이다 — 언어를 누르지 않고 Continue만 눌러도 같다", async () => {
  const picked = recordedStorage();
  await walkEntryFlow(picked, { pickLanguage: true });
  expect(keysOf(picked)).toEqual([authSessionStorageKey, uiLanguageStorageKey].sort());
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();

  const skipped = recordedStorage();
  await walkEntryFlow(skipped, { pickLanguage: false });
  expect(keysOf(skipped)).toEqual([authSessionStorageKey, uiLanguageStorageKey].sort());
});

// ------------------------------------------------------------ IL6 · 탭 화면 둘러보기

function openTab(tab: "journey" | "roleplay" | "settings"): void {
  fireEvent.tap(screen.getByTestId(`ui-lynx-bottom-navigator-item-${tab}`), {});
}

function expectNoHangul(container: Element): void {
  expect(hangulIn(container)).toEqual([]);
}

test("[IL6] ⭐ 영어 부팅의 탭 화면과 계정 화면에는 한글이 한 글자도 없다", async () => {
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  const body = screen.getByTestId("journey-map-screen").ownerDocument.body;
  const root = (): Element => body;

  // 여정 맵 · 머리 · 바텀 네비게이션 — 화면 전체(머리와 탭 포함)를 한 번에 봅니다.
  openTab("journey");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expectNoHangul(root());

  // 스텝 말풍선 — 스텝 제목 · 설명은 영어 콘텐츠입니다.
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expectNoHangul(root());
  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  // 알림
  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});
  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();
  expectNoHangul(root());
  fireEvent.tap(
    within(screen.getByTestId("notifications-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );

  // 롤플레이 목록 — 플러스 항목 · 잠김 표기 포함
  openTab("roleplay");
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expectNoHangul(root());

  // 설정 · 프로필 · 약관
  openTab("settings");
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expectNoHangul(root());

  const settingsCell = (id: string): HTMLElement =>
    within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
      "ui-lynx-settings-cell",
    );

  fireEvent.tap(settingsCell("profile"), {});
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();
  expectNoHangul(root());
  fireEvent.tap(
    within(screen.getByTestId("profile-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );
});

// ------------------------------------------------------------ IL7 · 학습 · 이야기 화면

// 학습 콘텐츠 자리 — 배우는 언어(한국어)가 그대로 있어야 하는 곳의 **기존** test-id입니다.
// 이 밖의 자리(제목 · 버튼 · 안내 · 접근성 이름)는 영어여야 합니다.
type ScreenCase = {
  readonly name: string;
  readonly open: () => Promise<void> | void;
  readonly screenTestId: string;
  readonly content: readonly ContentTestId[];
};

function startStep(stepId: JourneyStepId): void {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${stepId}`), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

async function bootJourney(seed?: AppJourneySeed, introDone = true): Promise<void> {
  await renderSignedInApp(
    <App
      journeySeed={journeySeedBefore("ordering")}
      {...(introDone ? { completedEpisodeIntroIds: completedIntros } : {})}
      {...(seed === undefined ? {} : { journeySeed: seed })}
    />,
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
}

async function openLearningForm(form: LearningForm): Promise<void> {
  formStub.current = form;
  await bootJourney();
  startStep("ordering");
}

const readyForFinal: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: [],
};

const screenCases: readonly ScreenCase[] = [
  {
    name: "듣기",
    open: async () => {
      await bootJourney();
      startStep("ordering");
    },
    screenTestId: "listening-screen-content",
    content: [/^listening-prompt/, /^listening-choice-/],
  },
  {
    name: "낱말 고르기",
    open: () => openLearningForm("word-choice"),
    screenTestId: "word-choice-screen-content",
    content: [/^word-choice-/],
  },
  {
    name: "문장 순서",
    open: () => openLearningForm("sentence-order"),
    screenTestId: "sentence-order-screen-content",
    // 표현을 짚는 조작 안내도 문항의 학습 콘텐츠입니다.
    content: [/^sentence-order-/, /^learning-shell-instruction$/],
  },
  {
    name: "말하기",
    open: () => openLearningForm("speaking"),
    screenTestId: "speaking-screen-content",
    content: [/^speaking-/],
  },
  {
    name: "쓰기",
    open: () => openLearningForm("writing"),
    screenTestId: "writing-screen-content",
    content: [/^writing-/],
  },
  {
    name: "문화",
    open: () => openLearningForm("culture"),
    screenTestId: "culture-screen-title",
    content: [/^culture-screen-(body|paragraph|note)/],
  },
  {
    name: "문화 퀴즈",
    open: async () => {
      await openLearningForm("culture");
      fireEvent.tap(screen.getByTestId("culture-screen-quiz"), {});
    },
    screenTestId: "culture-quiz-screen-title",
    content: [/^culture-quiz-screen-(prompt|choice)/],
  },
  {
    name: "평가(미통과)",
    open: async () => {
      // 문항 0개의 학습 화면은 결과 보기 하나로 평가로 넘어가고, 평가는 학습 완료 화면 하나로 선다.
      await openLearningForm("word-choice");
      fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
    },
    screenTestId: "lesson-complete-screen-title",
    content: [],
  },
  {
    name: "학습 완료(통과)",
    open: async () => {
      await bootJourney();
      startStep("ordering");
      questionsForStep("ordering").forEach((question) => {
        fireEvent.tap(screen.getByTestId(`listening-choice-${question.answerIndex}`), {});
        fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
      });
      fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
    },
    screenTestId: "lesson-complete-screen-title",
    content: [],
  },
  {
    name: "에피소드 표지",
    open: async () => {
      await bootJourney(undefined, false);
      fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-tutorial-intro"), {});
    },
    screenTestId: "episode-intro-screen-title",
    content: [],
  },
  {
    name: "에피소드 서사",
    open: async () => {
      await bootJourney(undefined, false);
      fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-tutorial-intro"), {});
      tapButtonIn("episode-intro-screen-next");
    },
    screenTestId: "episode-narrative-screen-title",
    content: [/^episode-narrative-/],
  },
  {
    name: "메신저",
    open: async () => {
      await bootJourney(journeySeedBefore("appointment-confirmation"));
      fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
    },
    screenTestId: "messenger-screen-title",
    content: [
      /^messenger-message-/,
      /^messenger-key-/,
      /^messenger-choice-/,
      "messenger-composer-text",
    ],
  },
  {
    name: "전화",
    open: async () => {
      await bootJourney(journeySeedBefore("appointment-confirmation-phone-call"));
      fireEvent.tap(
        screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
        {},
      );
    },
    screenTestId: "phone-call-screen",
    content: [/^phone-call-transcript-/],
  },
  {
    name: "비주얼 노벨",
    open: async () => {
      await bootJourney(journeySeedBefore("cafe-arrival-visual-novel"));
      fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-cafe-arrival-visual-novel"), {});
    },
    screenTestId: "visual-novel-screen",
    content: [/^visual-novel-scene-/, /^visual-novel-dialogue-content-/],
  },
  {
    name: "최종 테스트",
    open: async () => {
      await bootJourney(readyForFinal);
      fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-tutorial-final-test"), {});
      readFinalStory("introduction");
    },
    screenTestId: "episode-final-screen-title",
    content: [/^episode-final-screen-(line|option|prompt|question)/],
  },
];

describe.each(screenCases)("[IL7] $name 화면", ({ open, screenTestId, content }) => {
  test("한글은 학습 콘텐츠 자리에만 있다", async () => {
    await open();

    const anchor = screen.getByTestId(screenTestId);
    // 앵커 하나가 아니라 화면 전체(머리 · 탭 · 모달 포함)를 봅니다.
    expect(hangulOutside(anchor.ownerDocument.body, content)).toEqual([]);
  });
});

// ------------------------------------------------------------ IL8 · 나가기 목적지 라벨

const specialUnits = [
  { name: "메신저", unitId: "appointment-confirmation", exitTestId: "messenger-screen-exit" },
  {
    name: "전화",
    unitId: "appointment-confirmation-phone-call",
    exitTestId: "phone-call-exit-button",
  },
  {
    name: "비주얼 노벨",
    unitId: "cafe-arrival-visual-novel",
    exitTestId: "visual-novel-exit-button",
  },
] as const;

const finishedTutorial: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

describe.each(specialUnits)("[IL8] $name의 나가기", ({ unitId, exitTestId }) => {
  test("여정에서 연 화면은 Back to map이고 누르면 여정 맵으로 돌아간다", async () => {
    await bootJourney(journeySeedBefore(unitId));
    fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${unitId}`), {});

    expect(screen.getByTestId(exitTestId)).toHaveAttribute("accessibility-label", "Back to map");
    fireEvent.tap(screen.getByTestId(exitTestId), {});
    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  });

  test("롤플레이에서 연 화면은 Back to list이고 누르면 롤플레이 목록으로 돌아간다", async () => {
    await bootJourney(finishedTutorial);
    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
    fireEvent.tap(screen.getByTestId(`roleplay-list-item-${unitId}`), {});

    expect(screen.getByTestId(exitTestId)).toHaveAttribute("accessibility-label", "Back to list");
    fireEvent.tap(screen.getByTestId(exitTestId), {});
    expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  });
});
