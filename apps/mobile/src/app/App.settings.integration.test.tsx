import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { termsSections } from "../screens/terms/terms-sections";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import type { SettingsEventSink } from "../screens/settings/settings.contract";
// LIB-261 (integration-design) §9.5: `renderApp` 헬퍼의 토큰 스텁·타이머 값.
import { authTokenStorageKey } from "../lib/auth-token";
import { entrySplashDurationMs } from "../lib/entry-flow";

// LIB-259 integration 계층: 설정 탭 → 프로필/약관 push와 `설정으로` 복귀 · **토글이
// 실제로 듣기 화면에 닿는 경로**(설정 화면과 듣기 화면이 한 트리에 함께 서야
// 한다 — `ui`가 원리적으로 못 만드는 트리) · 이벤트 넷의 발생 경계와 순서 · 설정
// 탭 스택 보존 · 영속 없음.
// 계획 정본: .agent-harness/work/lib-259/test-plan.md integration §
// `App.settings.integration.test.tsx`(IT1~IT13). 목킹하지 않는다(외부 IO 없음).
// sink는 App prop으로 직접 주입한다(계약 §7.3) — 순서를 보는 케이스는 공용 로그
// 배열 하나에 여러 sink가 push하게 한다(`App.notifications.integration.test.tsx`
// 선례 형태).
//
// 기대 red(test-plan.md 「integration red 기대」): 이 시점의 App은 이동 항목·
// 토글 콜백이 no-op(`() => undefined`)이고 sink가 결선되지 않았으며,
// `ListeningScreen`에 `sessionOptions={initialSessionOptions}`가 고정값으로
// 간다. 그래서 IT2·IT3·IT4·IT5·IT6·IT7·IT9·IT10·IT13이 빨갛다 — import·수집
// 실패가 아니라 요소 부재/단언 실패다. IT1(설정 화면은 이미 그려졌고 App이
// 초기값을 넘긴다) · IT8(앵커 — 오늘 동작) · IT11(토글이 no-op이라 초기값에서
// 움직인 적이 없어 공허하게 통과 — 구현 뒤에야 비공허) · IT12(가드)는 이 시점에도
// 그대로 녹색이다.

// 여정 탭 → 스텝 tap → 시트 `시작` tap. `App.heading-trait.integration.test.tsx` ·
// `App.integration.test.tsx`의 동명 헬퍼와 같은 형태다(파일이 다르므로 다시
// 선언한다).
function startStep(stepId: JourneyStepId): void {
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId(`journey-step-node-${stepId}`), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

function openSettingsTab(): void {
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});
}

// LIB-261 (integration-design) §9.5: 기존 `render` 직접 호출 자리를 대신하는 공용
// 헬퍼(`renderApp`). 토큰이 있는 상태를 스텁하고 가짜 타이머로
// `entrySplashDurationMs`만큼 전진시켜 진입 스플래시를 건너뛴다. 이 파일이 이미
// 세운 `NativeModules` 스텁(있으면, `stubHost()`의 오디오 모듈)을 지우지 않고
// `StorageModule`만 얹는다.
//
// ⭐ 이 헬퍼는 **이 시점(App이 아직 initialNav를 쓴다)에는 무동작**이다 — 스플래시
// 자체가 없어 타이머가 앞으로 밀 것이 없다. `integration-implementation`이 App을
// `entryInitialNav`로 바꾼 뒤에야 스플래시를 실제로 건너뛴다. 이 교체로 이 파일의
// 기존 단언은 한 줄도 바뀌지 않는다(계약 §9.5).
function renderApp(ui: Parameters<typeof render>[0]) {
  const previousNativeModules = (globalThis as { NativeModules?: unknown }).NativeModules;
  const tokenStore = new Map<string, string>();
  tokenStore.set(authTokenStorageKey, "existing-token");
  vi.stubGlobal("NativeModules", {
    ...(typeof previousNativeModules === "object" && previousNativeModules !== null
      ? previousNativeModules
      : {}),
    StorageModule: {
      get: (key: string) => tokenStore.get(key) ?? null,
      set: (key: string, value: string) => void tokenStore.set(key, value),
      remove: (key: string) => void tokenStore.delete(key),
    },
  });
  vi.useFakeTimers();
  const result = render(ui);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  vi.useRealTimers();
  return result;
}

// 오디오 호스트 경계 대역 — `App.integration.test.tsx`의 `stubHost()`와 같은
// 형태다(파일이 다르므로 다시 선언한다, 계약 §9.9(a)·(c)). `lib/audio.ts`를
// `vi.mock`하지 않는다 — 대역을 두는 자리는 호스트 경계 하나다(test-plan.md
// 「integration — 파일과 케이스」 도입부). `done`을 호출하지 않아 재생이 그대로
// `"playing"`에 머문다 — IT5~IT8이 필요한 것은 재생 여부(호출 수)와 컨트롤
// 라벨뿐이다.
type HostCall = { source: string };

function stubHost(): { audio: HostCall[] } {
  const audio: HostCall[] = [];
  vi.stubGlobal("NativeModules", {
    AudioPlaybackModule: {
      play: (source: string, _done: (result: unknown) => void) => void audio.push({ source }),
      stop: () => void audio.push({ source: "<stop>" }),
    },
  });
  return { audio };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ------------------------------------------------------------------------- IT1

test("[IT1] 설정 탭을 열면 이동 항목 둘·토글 항목 둘이 계약 순서로 서고 토글 둘 다 기본값이 켜짐이다", () => {
  renderApp(<App />);
  openSettingsTab();

  const list = screen.getByTestId("settings-screen-list");
  const itemTestIds = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(itemTestIds).toEqual([
    "settings-nav-item-profile",
    "settings-nav-item-terms",
    "settings-toggle-item-auto-play-audio",
    "settings-toggle-item-show-transcript",
  ]);

  expect(screen.getByTestId("settings-toggle-item-state-auto-play-audio")).toHaveTextContent(
    "켜짐",
  );
  expect(screen.getByTestId("settings-toggle-item-state-show-transcript")).toHaveTextContent(
    "켜짐",
  );
});

// ------------------------------------------------------------------------- IT2

test("[IT2] 사용자 프로필 항목을 tap하면 프로필 화면이 서고 탭은 설정 그대로다", () => {
  renderApp(<App />);
  openSettingsTab();
  fireEvent.tap(screen.getByTestId("settings-nav-item-profile"), {});

  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.queryAllByTestId(/^bottom-navigator-tab-/)).toHaveLength(3);
});

// ------------------------------------------------------------------------- IT3

test("[IT3] 프로필의 설정으로를 tap하면 설정 화면으로 돌아가고 프로필 화면이 사라진다", () => {
  renderApp(<App />);
  openSettingsTab();
  fireEvent.tap(screen.getByTestId("settings-nav-item-profile"), {});
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("profile-screen-exit"), {});

  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("profile-screen-title")).not.toBeInTheDocument();
});

// ------------------------------------------------------------------------- IT4

test("[IT4] 개인정보 보호 및 약관 항목을 tap하면 약관 화면이 서고 절 수가 termsSections().length와 같으며 설정으로 돌아온다(데이터 앵커)", () => {
  const sections = termsSections();
  renderApp(<App />);
  openSettingsTab();
  fireEvent.tap(screen.getByTestId("settings-nav-item-terms"), {});

  expect(screen.getByTestId("terms-screen-title")).toBeInTheDocument();
  const content = screen.getByTestId("terms-screen-content");
  expect(content.children).toHaveLength(sections.length);

  fireEvent.tap(screen.getByTestId("terms-screen-exit"), {});

  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("terms-screen-title")).not.toBeInTheDocument();
});

// ------------------------------------------------------------------------- IT5

test("[IT5] 설정에서 자동 재생을 끈 뒤 듣기 화면을 열면 재생 컨트롤이 '듣기'다(자동 재생이 일어나지 않았다) — 이 경로는 ui가 원리적으로 못 만든다", () => {
  const { audio } = stubHost();
  renderApp(<App />);
  openSettingsTab();
  fireEvent.tap(screen.getByTestId("settings-toggle-item-auto-play-audio"), {});
  expect(screen.getByTestId("settings-toggle-item-state-auto-play-audio")).toHaveTextContent(
    "꺼짐",
  );

  startStep("ordering");

  expect(audio).toHaveLength(0);
  expect(screen.getByTestId("listening-prompt-playback")).toHaveAttribute(
    "accessibility-label",
    "듣기",
  );
});

// ------------------------------------------------------------------------- IT6

test("[IT6] 설정에서 대본 표시를 끈 뒤 듣기 화면을 열면 listening-prompt-text가 없다", () => {
  stubHost();
  renderApp(<App />);
  openSettingsTab();
  fireEvent.tap(screen.getByTestId("settings-toggle-item-show-transcript"), {});
  expect(screen.getByTestId("settings-toggle-item-state-show-transcript")).toHaveTextContent(
    "꺼짐",
  );

  startStep("ordering");

  expect(screen.queryByTestId("listening-prompt-text")).not.toBeInTheDocument();
});

// ------------------------------------------------------------------------- IT7

test("[IT7] IT5 상태(자동 재생 끔)에서 재생 컨트롤을 tap하면 라벨이 '멈춤'으로 갈린다(듣기를 눌러야 들린다 — 수용 기준 5)", () => {
  const { audio } = stubHost();
  renderApp(<App />);
  openSettingsTab();
  fireEvent.tap(screen.getByTestId("settings-toggle-item-auto-play-audio"), {});

  startStep("ordering");
  expect(audio).toHaveLength(0);
  expect(screen.getByTestId("listening-prompt-playback")).toHaveAttribute(
    "accessibility-label",
    "듣기",
  );

  fireEvent.tap(screen.getByTestId("listening-prompt-playback"), {});

  expect(screen.getByTestId("listening-prompt-playback")).toHaveAttribute(
    "accessibility-label",
    "멈춤",
  );
});

// ------------------------------------------------------------------------- IT8

test("[IT8] (앵커) 토글을 건드리지 않고 듣기 화면을 열면 오늘 동작 그대로다 — 대본이 있고 컨트롤이 '멈춤'", () => {
  const { audio } = stubHost();
  renderApp(<App />);

  startStep("ordering");

  expect(audio).toHaveLength(1);
  expect(screen.getByTestId("listening-prompt-playback")).toHaveAttribute(
    "accessibility-label",
    "멈춤",
  );
  expect(screen.getByTestId("listening-prompt-text")).toBeInTheDocument();
});

// ------------------------------------------------------------------------- IT9

test("[IT9] 설정 sink는 설정 탭 tap마다 발화하고 이미 설정 탭인데 다시 눌러도 여전히 1건이다 — 다른 탭을 다녀오면 2건이 된다(spec §7.2)", () => {
  const settingsEventSink = vi.fn<NonNullable<SettingsEventSink>>();
  renderApp(<App settingsEventSink={settingsEventSink} />);

  openSettingsTab();
  expect(settingsEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "settings_opened" },
  ]);

  // 이미 설정 탭인데 다시 누른다 — 네비게이션이 무동작이라 발화하지 않는다.
  openSettingsTab();
  expect(settingsEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "settings_opened" },
  ]);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  openSettingsTab();
  expect(settingsEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "settings_opened" },
    { name: "settings_opened" },
  ]);
});

// ------------------------------------------------------------------------ IT10

test("[IT10] 공용 로그 — 설정 → 프로필 → 설정으로 → 약관 → 설정으로 → 자동 재생 토글 → 대본 토글의 순서가 정확히 계약대로다('설정으로' 복귀는 settings_opened를 내지 않는다)", () => {
  const log: unknown[] = [];
  const settingsEventSink: NonNullable<SettingsEventSink> = (event) => log.push(event);
  renderApp(<App settingsEventSink={settingsEventSink} />);

  openSettingsTab();
  fireEvent.tap(screen.getByTestId("settings-nav-item-profile"), {});
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("profile-screen-exit"), {});
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("settings-nav-item-terms"), {});
  expect(screen.getByTestId("terms-screen-title")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("terms-screen-exit"), {});
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("settings-toggle-item-auto-play-audio"), {});
  fireEvent.tap(screen.getByTestId("settings-toggle-item-show-transcript"), {});

  expect(log).toEqual([
    { name: "settings_opened" },
    { name: "profile_opened" },
    { name: "terms_opened" },
    { name: "session_option_changed", option: "auto-play-audio", value: false },
    { name: "session_option_changed", option: "show-transcript", value: false },
  ]);
});

// ------------------------------------------------------------------------ IT11

test("[IT11] 앱을 다시 켠 것 — 토글 둘을 끈 뒤 unmount하고 새로 render하면 토글 둘이 다시 켜짐이다(저장하지 않는다 — 수용 기준 7)", () => {
  const { unmount } = renderApp(<App />);
  openSettingsTab();
  fireEvent.tap(screen.getByTestId("settings-toggle-item-auto-play-audio"), {});
  fireEvent.tap(screen.getByTestId("settings-toggle-item-show-transcript"), {});
  unmount();

  renderApp(<App />);
  openSettingsTab();

  expect(screen.getByTestId("settings-toggle-item-state-auto-play-audio")).toHaveTextContent(
    "켜짐",
  );
  expect(screen.getByTestId("settings-toggle-item-state-show-transcript")).toHaveTextContent(
    "켜짐",
  );
});

// ------------------------------------------------------------------------ IT12

test("[IT12] (가드) sink 없이 render(<App />) — 탭·토글·항목 tap이 던지지 않는다", () => {
  expect(() => renderApp(<App />)).not.toThrow();

  expect(() => {
    openSettingsTab();
  }).not.toThrow();

  expect(() => {
    fireEvent.tap(screen.getByTestId("settings-nav-item-profile"), {});
  }).not.toThrow();

  expect(() => {
    const exit = screen.queryByTestId("profile-screen-exit");
    if (exit !== null) fireEvent.tap(exit, {});
  }).not.toThrow();

  expect(() => {
    const nav = screen.queryByTestId("settings-nav-item-terms");
    if (nav !== null) fireEvent.tap(nav, {});
  }).not.toThrow();

  expect(() => {
    const exit = screen.queryByTestId("terms-screen-exit");
    if (exit !== null) fireEvent.tap(exit, {});
  }).not.toThrow();

  expect(() => {
    const toggle = screen.queryByTestId("settings-toggle-item-auto-play-audio");
    if (toggle !== null) fireEvent.tap(toggle, {});
  }).not.toThrow();

  expect(() => {
    const toggle = screen.queryByTestId("settings-toggle-item-show-transcript");
    if (toggle !== null) fireEvent.tap(toggle, {});
  }).not.toThrow();
});

// ------------------------------------------------------------------------ IT13

test("[IT13] 설정 탭 스택 보존 — 프로필을 연 채 여정 탭을 다녀오면 설정 탭에 프로필이 그대로 서 있다(ADR-0007 D3)", () => {
  renderApp(<App />);
  openSettingsTab();
  fireEvent.tap(screen.getByTestId("settings-nav-item-profile"), {});
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();

  openSettingsTab();
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("profile-screen-exit"), {});
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
});
