import { u01OpenSeed } from "./test-helpers/progress-seed";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";
import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { chooseLearnerCountry, continueLearnerName } from "./test-helpers/learner-signup";
// `authTokenStorageKey`는 토큰 스텁의 유일한 키입니다. `entrySplashDurationMs`는
// 스플래시 전이 시각입니다.
import { entrySplashDurationMs } from "../lib/entry-flow";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// 기존 `render` 직접 호출 자리를 대신하는 공용 헬퍼(`renderApp`)입니다. 토큰이 있는
// 상태를 스텁하고 가짜 타이머로 `entrySplashDurationMs`만큼 전진시켜 진입
// 스플래시를 건너뜁니다.
// 설정 항목 셀입니다. 셀은 ui-lynx `SettingsGroup`이 그리고, 항목은 그룹이 싣는
// `ui-lynx-settings-group-item-{id}` 상자로 가려 집습니다(`id`는 이동 대상 · 옵션 키).
function settingsCell(id: string): HTMLElement {
  return within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );
}

// 제목 축에 오른 자리를 트리 순서대로 앵커로 냅니다. `data-testid`가 없는
// 요소는 클래스명으로 찍습니다 — 게이트가 배제한 자리 중에는 `data-testid`가 없는
// 것이 있고, `null`로 찍히면 러너 출력이 어느 자리인지 말하지 못합니다
// (`.culture-screen-exit-label` · `.assessment-screen-verdict-label`).
// `getAttribute("class")` 갈래는 발명이 아닙니다 — `ListeningPrompt.ui.test.tsx`가
// 클래스 목록을 같은 방식으로 대조한 선례를 따릅니다.
//
// ⚠ 이 `class` 갈래는 속성 **전체**를 찍습니다. 이 저장소는 상태 클래스를 base
// 클래스 뒤에 **더해** 붙이므로(예: `BottomNavigator`의 선택된 탭 라벨 —
// `bottom-navigator-label bottom-navigator-label-selected`), 그런 잎에 `header`가
// 새면 같은 자리가 상태에 따라 서로 다른 문자열로 찍힐 수 있습니다. 첫 토큰만 쓰는
// 정규화는 **하지 않습니다** — 상태 정보가 러너 출력에서 사라지는 대가가 더 큽니다.
//
// ⚠ 셀렉터를 `[accessibility-traits="header"]`에서 `[accessibility-traits]`로
// 넓히고 값을 쉼표로 갈라 `header`를 포함하는 것만 남깁니다. 벤더된 Pod
// (`LynxConverter+UI.m`)의 `toAccessibilityTraits:`가 값을 쉼표로 split해 OR로
// 합치므로, `accessibility-traits="button,header"`도 iOS에서 실제로 머리말
// 역할을 싣습니다 — 좁은 셀렉터는 그 형태를 못 봅니다. `ADR-0016 D2`가 이 속성에
// 단일 값을 요구하므로 오늘 이 저장소에 쉼표 복수값은 0건이고, 이 갈래는 그
// 형태가 새로 생겨도 잡히게 하는 방어입니다. 조작 단위 축(`button`·`tab` 단독)은
// 여전히 안 섞입니다 — `header`를 포함하지 않으면 필터가 버립니다.
function headingAxis(container: HTMLElement): readonly (string | null)[] {
  return [...container.querySelectorAll("[accessibility-traits]")]
    .filter((el) => (el.getAttribute("accessibility-traits") ?? "").split(",").includes("header"))
    .map((el) => el.getAttribute("data-testid") ?? el.getAttribute("class"));
}

// 홈 탭이 걷혔으므로 알림은 여정 탭에서 엽니다. 알림 버튼은 제목이 아니므로
// 여기서도 제목 축엔 알림 화면 제목만 오릅니다.
test("[I3] 제목 축 닫힌 집합이 상태 notifications에서 계약이 고정한 목록과 정확히 같다", async () => {
  const { container } = await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});
  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["notifications-screen-title"]);
});

// 2026-09-27: 맵의 화면 제목 줄이 걷혔습니다. 이 상태에서 제목 축에 오르는 것은
// 에피소드 헤더 카드이고, **채워진** 에피소드마다 하나씩입니다 — 기댓값을 리터럴로 적지
// 않고 데이터(`journeyMapSections`)에서 뽑습니다. 에피소드가 늘면 이 테스트는 늘어난
// 만큼을 기대하지, 빨개지지 않습니다.
//
// ⟨2026-09-29⟩ **준비 중 에피소드는 제목을 내지 않습니다.** 그 구획은 아래가 가려져
// **읽을 내용이 없고**, 구획 전체가 낭독 요소 하나(`Episode 1. Customs., 준비 중`)입니다.
// 제목은 뒤따르는 내용이 있을 때 제목이라(ADR-0016 D4), 여기에 제목을 주면 아무 데도
// 데려가지 못하는 머리말이 축에 섭니다.
test("[I3] 제목 축 닫힌 집합이 상태 journey-map에서 계약이 고정한 목록과 정확히 같다", async () => {
  const { container } = await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  // spec §20: 띠는 스텝 말풍선이 열린 동안만 선다 - 맵만 보일 때는 제목 축이 비어 있다.
  expect(headingAxis(container)).toEqual([]);
});

test("[I3] 제목 축 닫힌 집합이 상태 roleplay-list에서 계약이 고정한 목록과 정확히 같다", async () => {
  const { container } = await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();

  // 화면 제목 뒤에 구획 머리가 에피소드마다 하나씩 섭니다. 롤플레이 항목이 있는
  // 에피소드만 구획이 되고, 오늘은 내장 본편 셋입니다(튜토리얼 롤플레이는 2026-10-20에 뺐습니다).
  expect(headingAxis(container)).toEqual([
    "roleplay-list-screen-title",
    "roleplay-list-section-header-u01-water",
    "roleplay-list-section-header-u02-checkin",
    "roleplay-list-section-header-u03-mina",
  ]);
});

test("[I3] 제목 축 닫힌 집합이 상태 settings에서 계약이 고정한 목록과 정확히 같다", async () => {
  const { container } = await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["settings-screen-title"]);
});

// 시트 열림 — `ui-lynx-learning-unit-<stepId>` tap 직후, `시작`은 아직 안 눌렀습니다.
// 에피소드 헤더와 시트 제목이 같은 트리에 함께 섭니다. 헤더는 맵 컨테이너 안이라
// `accessibility-elements-hidden`을 함께 받지만, 그 속성은 조작 단위 축이고 제목 축은
// 따로 삽니다 — 그래서 축에서 사라지지 않습니다.
test("[I3] 제목 축 닫힌 집합이 상태 step-sheet-open에서 계약이 고정한 목록과 정확히 같다", async () => {
  const { container } = await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(catalogNodeTestId("u01-water", "S1")), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  // spec §20: 말풍선이 열려 있는 동안 띠는 하나(열린 스텝의 구획)다.
  expect(headingAxis(container)).toEqual(["ui-lynx-episode-header", "step-sheet-title"]);
});

test("[HT1] 제목 축 닫힌 집합이 상태 profile에서 계약이 고정한 목록과 정확히 같다", async () => {
  const { container } = await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  fireEvent.tap(settingsCell("profile"), {});
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["profile-screen-title"]);
});

// HT-E1: 진입 상태 여섯의 제목 축 닫힌 집합입니다 — 스플래시는 `header`가 0개,
// 나머지 다섯은 각각 1개입니다. 위 `[I3]`·`[HT1]`과 같은 도구
// (`headingAxis` → `toEqual` 닫힌 집합)를 여섯 상태에 순서대로 씁니다 — 이 파일이
// 이미 세운 방식을 새로 발명하지 않습니다.
//
// **토큰을 스텁하지 않습니다** — 위 `renderApp` 헬퍼는 토큰이 **있는** 상태를
// 만들어 스플래시를 건너뛰는 용도라 이 케이스와 반대입니다. 여기는 스플래시
// 자체와 그 뒤 다섯 상태를 순서대로 관찰해야 하므로 토큰 없는 상태에서 가짜
// 타이머만 직접 전진시킵니다.
//
// 여섯 상태를 **한 케이스 안에서** 순서대로 잇습니다 — 상태마다 별도 `test`로
// 쪼개면 기대 수가 달라집니다.
function emptyStorageStub(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
}

// 코드 칸 넷(CompactNumericInput)에 한 자리씩 넣습니다 — `VerificationCodeScreen.ui.test.tsx`의
// `typeCode`와 같은 형태입니다(파일이 다르므로 다시 선언합니다).
function typeVerificationCode(value: string): void {
  const EventConstructor = document.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  Array.from(value).forEach((digit, index) => {
    const ref = lynx
      .createSelectorQuery()
      .select(`.verification-code-screen-digit-${index} .ui-lynx-compact-numeric-input`);
    fireEvent(
      ref as unknown as Element,
      new EventConstructor("bindEvent:input", { detail: { value: digit } }),
    );
  });
}

function tapVerificationSubmit(): void {
  fireEvent.tap(
    within(screen.getByTestId("verification-code-screen-submit")).getByTestId("ui-lynx-button"),
    {},
  );
}

// 전화번호 경로가 네트워크를 타므로(spec §3 · test-plan §4.1) 로그인 · 코드 화면
// 사이를 옮기려면 대역이 필요합니다 — `App.entry.integration.test.tsx`의
// `stubSupabase`와 같은 형태입니다(파일이 다르므로 다시 선언합니다). 이 파일이
// 보는 것은 제목 축뿐이라 경로 하나(otp 성공 · verify 성공)만 있으면 됩니다.
type SupabaseRouteResponse = { readonly status: number; readonly body: string };
type SupabaseRoutes = {
  otp?: SupabaseRouteResponse;
  verify?: SupabaseRouteResponse;
};
type SupabaseCallInit = {
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: string;
};

function routeFor(url: string, routes: SupabaseRoutes): SupabaseRouteResponse | undefined {
  if (url.endsWith("/auth/v1/otp")) return routes.otp;
  if (url.endsWith("/auth/v1/verify")) return routes.verify;
  return undefined;
}

function stubSupabase(routes: SupabaseRoutes): void {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, _init: SupabaseCallInit) => {
      const route = routeFor(url, routes);
      if (route === undefined) {
        throw new Error(`stubSupabase: unstubbed route for ${url}`);
      }
      return { status: route.status, text: async () => route.body };
    }),
  );
}

const otpSentBody = "{}";

function sessionResponseBody(): string {
  return JSON.stringify({
    access_token: "access-token-1",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 9999999999,
    refresh_token: "refresh-token-1",
    user: { id: "user-1" },
  });
}

async function advanceTimersAsync(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function typePhoneNumber(value: string): void {
  const field = screen.getByTestId("login-screen-phone-field");
  const EventConstructor = field.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

async function submitPhoneNumber(value: string): Promise<void> {
  typePhoneNumber(value);
  fireEvent.tap(
    within(screen.getByTestId("login-screen-method-phone")).getByTestId("ui-lynx-button"),
    {},
  );
  await advanceTimersAsync(0);
}

async function submitVerificationCode(value: string): Promise<void> {
  typeVerificationCode(value);
  tapVerificationSubmit();
  await advanceTimersAsync(0);
}

// HT-E1 개정(test-plan §4.2) — 전화번호 경로가 네트워크를 타므로 번호 입력 +
// `stubSupabase`를 거쳐야 코드 화면 · 언어 선택에 닿습니다. 제목 축 기대 목록
// 자체는 그대로입니다(경로만 바뀝니다).
test("[HT-E1] 제목 축 닫힌 집합이 진입 상태 여덟 각각에서 계약이 고정한 목록과 정확히 같다", async () => {
  emptyStorageStub();
  stubSupabase({
    otp: { status: 200, body: otpSentBody },
    verify: { status: 200, body: sessionResponseBody() },
  });
  vi.useFakeTimers();
  const { container } = render(<App progressSeed={u01OpenSeed} phoneSignIn="visible" />);

  // 상태 splash — 화면 제목이 다섯뿐이고 스플래시 서비스 이름은 `header`가
  // 아니므로 닫힌 집합이 비어 있습니다. 앵커로 먼저 스플래시 자신을 짓습니다 —
  // 그래야 이 빈 배열이 「스플래시 상태에서 실제로 0개」이지 「아직 아무 화면도
  // 없어서 0개」가 아니라고 말할 수 있습니다(공허하게 통과할 수 있는 자리입니다).
  expect(screen.getByTestId("splash-screen-logo")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual([]);

  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });

  // 상태 onboarding
  expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["onboarding-screen-title"]);

  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );

  // 상태 login
  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["login-screen-title"]);

  await submitPhoneNumber("10 1234 5678");

  // 상태 verification-code
  expect(screen.getByTestId("verification-code-screen-title")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["verification-code-screen-title"]);

  await submitVerificationCode("123456");

  // 상태 ① 이름 · ② 나라 — 가입 직후 화면도 제목 하나(heading)만 갖습니다.
  expect(screen.getByTestId("learner-name-screen-title")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["learner-name-screen-title"]);
  continueLearnerName();
  expect(screen.getByTestId("learner-country-screen-title")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["learner-country-screen-title"]);
  chooseLearnerCountry();

  // 상태 language-select
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["language-select-screen-title"]);

  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );

  // 상태 journey-entry
  expect(screen.getByTestId("journey-entry-screen-title")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["journey-entry-screen-title"]);
});
