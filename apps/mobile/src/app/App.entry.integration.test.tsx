import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { authTokenStorageKey } from "../lib/auth-token";
import { entryLoginMethods, entrySplashDurationMs } from "../lib/entry-flow";
import type { EntryEvent, EntryLoginMethod } from "../lib/entry-flow";
import { entryLanguageLabel } from "../lib/entry-language";

// `integration` 계층: 진입 흐름 여섯 화면이 **한 트리에서** 실제로 이어지는지를
// 본다(ADR-0006 D4) — `ui`가 화면을 고립 렌더해서는 볼 수 없는 것(부팅 화면 선택 ·
// 스택 전이 · 토큰 분기 · 세션 상태의 수명 · 바텀 네비게이션의 등장 시점)이 무대다.
// 목킹하지 않는다(외부 IO 없음) — 저장소 경계만 `vi.stubGlobal("NativeModules", …)`로
// 세운다(`App.settings.integration.test.tsx`의 `stubHost()`와 같은 형태, 대역 자리는
// 호스트 경계 하나).
//
// 계약: .agent-harness/work/lib-261/spec.md §5(네비게이션 경계) · §6(상태 경계) ·
//       §7(측정 이벤트).
// 계획: .agent-harness/work/lib-261/test-plan.md integration § `App.entry.integration.test.tsx`
//       IE1~IE14.
//
// 기대 red(test-plan.md 「integration red 기대」): 이 시점의 App은 여전히
// `initialNav`로 시작하고(§9.3) 진입 `case` 여섯이 `null`이며 sink·토큰 저장이
// 결선되지 않았다 — 렌더 즉시 여정 맵(바텀 네비게이션 포함)이 선다. 그래서
// IE1~IE14 전부가 요소 부재·단언 실패로 빨갛다(import·수집 실패가 아니다).
// ⭐ IE1은 갈래가 반대다 — 오늘 App이 바텀 네비게이션을 **조건 없이** 렌더하므로
// 「진입 중에는 안 보인다」쪽이 오히려 확실히 빨갛다(test-plan.md ⚠).

// ------------------------------------------------------------ 저장소 스텁 헬퍼
//
// `lib/auth-token.unit.test.ts`의 `stubHost()`와 같은 형태다(파일이 다르므로 다시
// 선언한다) — `StorageModule`의 `get`/`set`/`remove`만 흉내 낸다.
function emptyStorageStub(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  return store;
}

// IE10 · IE14(재실행 경로) — 토큰이 **이미 있는** 상태를 스텁한다. 값 자체는
// `createTemporaryAuthToken()`의 실물과 같을 필요가 없다 — `hasAuthToken()`은
// 키 존재만 본다(계약 §2.3).
function tokenPresentStorageStub(): Map<string, string> {
  const store = emptyStorageStub();
  store.set(authTokenStorageKey, "existing-token");
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function advanceSplash(): void {
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
}

// `VerificationCodeScreen.ui.test.tsx`의 `dispatchTextFieldInput`·`typeCode`와 같은
// 형태다(파일이 다르므로 다시 선언한다).
function typeVerificationCode(value: string): void {
  const field = screen.getByTestId("verification-code-screen-input");
  const input = within(field).getByTestId("ui-lynx-text-field-input");
  const EventConstructor = input.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

function submitVerificationCode(value: string): void {
  typeVerificationCode(value);
  fireEvent.tap(screen.getByTestId("verification-code-screen-submit"), {});
}

// 온보딩 세 스텝을 끝까지 넘긴다(0→1→2→onComplete). `onboarding-screen-next`는
// 스텝마다 같은 testid다(계약 §4.5) — 세 번 누르면 로그인에 닿는다.
function completeOnboarding(): void {
  fireEvent.tap(screen.getByTestId("onboarding-screen-next"), {});
  fireEvent.tap(screen.getByTestId("onboarding-screen-next"), {});
  fireEvent.tap(screen.getByTestId("onboarding-screen-next"), {});
}

function selectLoginMethod(method: EntryLoginMethod): void {
  fireEvent.tap(screen.getByTestId(`login-screen-method-${method}`), {});
}

function selectLanguage(language: string): void {
  fireEvent.tap(screen.getByTestId(`language-select-option-${language}`), {});
}

function continueLanguageSelect(): void {
  fireEvent.tap(screen.getByTestId("language-select-screen-next"), {});
}

function startJourney(): void {
  fireEvent.tap(screen.getByTestId("journey-entry-screen-start"), {});
}

// ---------------------------------------------------------------------- IE1
//
// 갈래가 반대인 대조(test-plan.md ⚠) — 스플래시 존재 앵커(부재 쪽으로 빨갛다)와
// 바텀 네비게이션 부재(오늘 App이 조건 없이 그려서 존재 쪽으로 빨갛다)가 같은
// 케이스 안에서 서로 다른 이유로 빨개진다. `.bottom-navigator`는 `BottomNavigator`의
// 유일한 루트 클래스다(`data-testid`가 없어 클래스로 짓는다 — `App.heading-trait
// .integration.test.tsx`의 `headingAxis` 클래스 대체 선례와 같은 근거).
test("[IE1] 앱을 켜면 스플래시가 서고 바텀 네비게이션이 없다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  const { container } = render(<App />);

  expect(screen.getByTestId("splash-screen-logo")).toBeInTheDocument();
  expect(container.querySelector(".bottom-navigator")).toBeNull();
});

// ---------------------------------------------------------------------- IE2
test("[IE2] 토큰 없이 고정 시간이 지나면 온보딩이 선다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App />);

  advanceSplash();

  expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
});

// ---------------------------------------------------------------------- IE3
test("[IE3] 온보딩을 끝까지 넘기면 로그인이 선다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App />);
  advanceSplash();

  completeOnboarding();

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
});

// ---------------------------------------------------------------------- IE4
test("[IE4] 전화번호를 고르면 코드 검증이 선다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App />);
  advanceSplash();
  completeOnboarding();

  selectLoginMethod("phone");

  expect(screen.getByTestId("verification-code-screen-title")).toBeInTheDocument();
});

// ---------------------------------------------------------------------- IE5
//
// ⚠ 「3자리에서는 무동작」은 부재·무동작을 재는 칸이다(test-plan.md ⚠) — 먼저
// 코드 검증 화면이 **그대로 남아 있다**는 존재 앵커를 걸어, 언어 선택으로 못
// 간 것이 「화면 자체가 없어서」가 아니라 「제출이 무동작이라서」임을 갈라 짓는다.
test("[IE5] 코드 4자리를 채우고 확인하면 언어 선택이 선다(3자리에서는 무동작)", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App />);
  advanceSplash();
  completeOnboarding();
  selectLoginMethod("phone");

  submitVerificationCode("123");
  expect(screen.queryByTestId("language-select-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("verification-code-screen-title")).toBeInTheDocument();

  submitVerificationCode("1234");
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();
});

// ---------------------------------------------------------------------- IE6
//
// 존재 앵커: `nonPhoneMethods`가 비어 있지 않음을 먼저 확인한다(unit EF1·EL1과 같은
// 부류) — 그래야 아래 루프가 공허하게 통과하는 것이 아니라고 말할 수 있다.
test("[IE6] 구글·애플·페이스북은 코드 검증을 건너뛰고 언어 선택이 선다", () => {
  const nonPhoneMethods = entryLoginMethods.filter((method) => method !== "phone");
  expect(nonPhoneMethods.length).toBeGreaterThan(0);

  for (const method of nonPhoneMethods) {
    emptyStorageStub();
    vi.useFakeTimers();
    const { unmount } = render(<App />);
    advanceSplash();
    completeOnboarding();

    selectLoginMethod(method);

    expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();
    expect(screen.queryByTestId("verification-code-screen-title")).not.toBeInTheDocument();

    unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});

// ---------------------------------------------------------------------- IE7
//
// 픽스처는 `en`이다(초기값 `ko`가 아니다) — `ko`로 확인하면 「늘 첫 라벨이 보인다」와
// 관찰이 갈리지 않아 공허하다(test-plan.md LS-U3 픽스처 표와 같은 근거).
test("[IE7] 언어를 고르고 다음을 누르면 여정 입장에 그 언어의 라벨이 보인다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App />);
  advanceSplash();
  completeOnboarding();
  selectLoginMethod("google");

  selectLanguage("en");
  continueLanguageSelect();

  expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
    entryLanguageLabel("en"),
  );
});

// ---------------------------------------------------------------------- IE8
test("[IE8] 여정 입장에서 진행하면 여정 맵이 서고 바텀 네비게이션이 그때 처음 보인다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  const { container } = render(<App />);
  advanceSplash();
  completeOnboarding();
  selectLoginMethod("google");
  selectLanguage("en");
  continueLanguageSelect();

  // 진입 흐름 내내 바텀 네비게이션이 없었다 — 「그때 처음」의 대조.
  expect(screen.getByTestId("journey-entry-screen-title")).toBeInTheDocument();
  expect(container.querySelector(".bottom-navigator")).toBeNull();

  startJourney();

  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(container.querySelector(".bottom-navigator")).not.toBeNull();
});

// ---------------------------------------------------------------------- IE9
//
// ⭐ 수용 기준 4. 수단 넷 전부를 순회해 「저장된 키가 그 하나뿐」을 짓는다
// (`lib/auth-token.unit.test.ts` AT3와 같은 성질을 결선된 트리에서 다시 본다).
test("[IE9] 어느 수단으로 진행해도 토큰이 저장되고 저장된 키가 그 하나뿐이다", () => {
  expect(entryLoginMethods.length).toBeGreaterThan(0);

  for (const method of entryLoginMethods) {
    const store = emptyStorageStub();
    vi.useFakeTimers();
    const { unmount } = render(<App />);
    advanceSplash();
    completeOnboarding();
    selectLoginMethod(method);
    if (method === "phone") {
      submitVerificationCode("1234");
    }
    selectLanguage("en");
    continueLanguageSelect();
    startJourney();

    expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
    expect(Array.from(store.keys())).toEqual([authTokenStorageKey]);

    unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});

// --------------------------------------------------------------------- IE10
//
// ⚠ 존재 앵커가 먼저 필요하다 — 실측 결과, 앵커 없이 짜면 이 케이스가 **스캐폴드
// 에서 이미 통과한다**: 오늘 App은 토큰을 읽지 않고 `initialNav`로 곧장 여정 맵을
// 그리므로 「온보딩·로그인 부재」·「여정 맵 존재」가 토큰 분기와 무관하게 우연히
// 참이 된다(IE5·IE14·HT-E1과 같은 부류 — test-plan.md ⚠). 그래서 **먼저 스플래시가
// 실제로 섰다는 것**을 앵커로 걸어, 「스플래시를 실제로 거친 뒤 토큰 분기로 여정
// 맵에 닿았다」를 「토큰과 무관하게 처음부터 여정 맵이었다」와 갈라 짓는다.
test("[IE10] 토큰이 있는 상태로 켜면 스플래시 뒤 바로 여정 맵이고 온보딩·로그인을 거치지 않는다", () => {
  tokenPresentStorageStub();
  vi.useFakeTimers();
  render(<App />);

  expect(screen.getByTestId("splash-screen-logo")).toBeInTheDocument();

  advanceSplash();

  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("onboarding-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("login-screen-title")).not.toBeInTheDocument();
});

// --------------------------------------------------------------------- IE11
//
// ⭐ `back` 대 `backToRoot`(계약 §5.3). 진입 스택의 첫 화면은 온보딩이라
// `backToRoot`였다면 온보딩으로 접혔을 것이다 — 로그인(한 겹 위)에 닿는 것으로
// 그 갈림을 짓는다.
test("[IE11] 코드 검증에서 로그인으로를 누르면 로그인이 선다(온보딩이 아니다)", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App />);
  advanceSplash();
  completeOnboarding();
  selectLoginMethod("phone");

  fireEvent.tap(screen.getByTestId("verification-code-screen-exit"), {});

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("onboarding-screen")).not.toBeInTheDocument();
});

// --------------------------------------------------------------------- IE12
//
// ⭐ 수용 기준 5의 유일한 판정자(test-plan.md). 앞쪽 절반(세션 안 유지)은 IE7과
// 같은 관찰이고, 뒤쪽 절반(새 App은 초기값)이 이 케이스의 몫이다 — 두 번째
// `render`에서 언어를 고르지 않고 곧장 `다음`을 눌러, 여정 입장에 초기값
// (`entryLanguages[0]` = `ko`)의 라벨이 보이는 것으로 「영속 0」을 짓는다.
test("[IE12] 언어가 진입 흐름 동안 유지되고, 새로 렌더한 App은 초기값이다(영속 0)", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App />);
  advanceSplash();
  completeOnboarding();
  selectLoginMethod("google");
  selectLanguage("en");
  continueLanguageSelect();

  expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
    entryLanguageLabel("en"),
  );

  vi.useRealTimers();
  vi.unstubAllGlobals();

  // `render()`는 단일 전역 `__root`에 동작해, `cleanup()` 없이 다시 부르면 새
  // 마운트가 아니라 기존 인스턴스의 리렌더가 되어 `useReducer`/`useState`
  // 초기값이 버려지지 않는다 — `App.integration.test.tsx` 494행 등 같은 파일
  // 밖 선례와 같은 이유로 여기서도 명시적으로 부른다.
  cleanup();

  // 새로 렌더한 App — 언어를 고르지 않고 곧장 다음을 누른다.
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App />);
  advanceSplash();
  completeOnboarding();
  selectLoginMethod("google");
  continueLanguageSelect();

  expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
    entryLanguageLabel("ko"),
  );
});

// --------------------------------------------------------------------- IE13
//
// `phone` 경로를 고른다 — `EntryViewedScreenName`(다섯) 전부를 한 경로 안에서
// 겪는 유일한 수단이다(온보딩 · 로그인 · 코드 검증 · 언어 선택 · 여정 입장).
// `toEqual`이 다섯 값을 정확히 요구하므로 빈 배열이어도 참이 되는 공허함이 없다
// (스플래시 부재는 이 배열 안에 "splash"가 없다는 것으로 직접 확인한다).
test("[IE13] entry_screen_viewed가 화면 다섯에 대해 각 전이 직전 1회씩 순서대로 나고 스플래시에는 나지 않는다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  const events: EntryEvent[] = [];
  render(<App entryEventSink={(event) => events.push(event)} />);
  advanceSplash();
  completeOnboarding();
  selectLoginMethod("phone");
  submitVerificationCode("1234");
  continueLanguageSelect();

  const viewedScreens = events
    .filter(
      (event): event is Extract<EntryEvent, { name: "entry_screen_viewed" }> =>
        event.name === "entry_screen_viewed",
    )
    .map((event) => event.screen);

  expect(viewedScreens).toEqual([
    "onboarding",
    "login",
    "verification-code",
    "language-select",
    "journey-entry",
  ]);
  expect(viewedScreens).not.toContain("splash");
});

// --------------------------------------------------------------------- IE14
//
// ⚠ 「토큰 재실행 경로에서 0회」는 부재·무동작을 재는 칸이다(test-plan.md ⚠) —
// (b)에서 먼저 `journey-map-screen-title` 존재 앵커를 걸어, 0회가 「화면 전이
// 자체가 안 일어나서」가 아니라 「완주가 아니라서」임을 갈라 짓는다.
test("[IE14] entry_login_method_selected가 수단과 함께 1회이고, entry_completed는 여정 입장 진행에서만 1회다(토큰 재실행 경로에서는 0회)", () => {
  // (a) 신규 진입 경로 — apple 선택 → 언어 선택 → 여정 시작.
  emptyStorageStub();
  vi.useFakeTimers();
  const events: EntryEvent[] = [];
  render(<App entryEventSink={(event) => events.push(event)} />);
  advanceSplash();
  completeOnboarding();
  selectLoginMethod("apple");
  selectLanguage("en");
  continueLanguageSelect();
  startJourney();

  const selected = events.filter(
    (event): event is Extract<EntryEvent, { name: "entry_login_method_selected" }> =>
      event.name === "entry_login_method_selected",
  );
  const completed = events.filter((event) => event.name === "entry_completed");

  expect(selected).toEqual([{ name: "entry_login_method_selected", method: "apple" }]);
  expect(completed).toHaveLength(1);

  vi.useRealTimers();
  vi.unstubAllGlobals();

  // (b) 토큰 재실행 경로 — 완주가 아니므로 entry_completed·entry_login_method_selected가
  // 0회다.
  tokenPresentStorageStub();
  vi.useFakeTimers();
  const reentryEvents: EntryEvent[] = [];
  render(<App entryEventSink={(event) => reentryEvents.push(event)} />);
  advanceSplash();
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();

  expect(reentryEvents.filter((event) => event.name === "entry_completed")).toHaveLength(0);
  expect(
    reentryEvents.filter((event) => event.name === "entry_login_method_selected"),
  ).toHaveLength(0);
});
