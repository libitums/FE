import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { authFailureMessage } from "../lib/auth-failure";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import type { AuthSession } from "../lib/auth-session.contract";
import { entryLoginMethods, entrySplashDurationMs } from "../lib/entry-flow";
import type { EntryEvent, EntryLoginMethod } from "../lib/entry-flow";
import { entryLanguageLabel, initialEntryLanguage } from "../lib/entry-language";

// `integration` 계층: 진입 흐름 여섯 화면이 **한 트리에서** 실제로 이어지는지를
// 봅니다(ADR-0006 D4) — `ui`가 화면을 고립 렌더해서는 볼 수 없는 것(부팅 화면 선택 ·
// 스택 전이 · 토큰 분기 · 세션 상태의 수명 · 바텀 네비게이션의 등장 시점)이
// 무대입니다. 저장소 경계만 `vi.stubGlobal("NativeModules", …)`로 세웁니다
// (`App.settings.integration.test.tsx`의 `stubHost()`와 같은 형태). 전화번호
// 경로는 이제 네트워크를 실제로 타므로(spec §3 · test-plan §4) 그 경계는
// `vi.stubGlobal("fetch", …)` + `vi.stubEnv("PUBLIC_SUPABASE_*", …)`로 섭니다
// (test-plan §6 — msw 없음).

// ------------------------------------------------------------ 저장소 스텁 헬퍼
//
// `App.settings.integration.test.tsx`의 `stubHost()`와 같은 형태입니다(파일이 다르므로
// 다시 선언합니다) — `StorageModule`의 `get`/`set`/`remove`만 흉내 냅니다.
//
// `storageModuleFor`로 뽑아 둔 이유는 IS9(소셜로 로그인한 저장소를 그대로 들고 새로
// 렌더)가 **같은 `store`를 새 `NativeModules` 객체에 다시 실어야** 해서입니다 — 이
// 함수가 없으면 `emptyStorageStub`이 매번 새 store를 만들어 재사용할 수 없습니다.
function storageModuleFor(
  store: Map<string, string>,
  gets?: string[],
): {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
} {
  return {
    get: (key: string) => {
      gets?.push(key);
      return store.get(key) ?? null;
    },
    set: (key: string, value: string) => void store.set(key, value),
    remove: (key: string) => void store.delete(key),
  };
}

function emptyStorageStub(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", { StorageModule: storageModuleFor(store) });
  return store;
}

// IA7~IA10 — 세션이 **이미 있는** 상태를 스텁합니다(test-plan §4.1). 값은 실물
// 직렬화(`serializeAuthSession`)를 거칩니다 — `parseAuthSession`의 왕복을 믿습니다.
function sessionPresentStorageStub(session: AuthSession): Map<string, string> {
  const store = emptyStorageStub();
  store.set(authSessionStorageKey, serializeAuthSession(session));
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function advanceSplash(): void {
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
}

// 가짜 타이머 아래에서 미세 작업(네트워크 응답의 `.then` 체인)을 흘려보냅니다
// (test-plan §4.1). 케이스 안에서 이 헬퍼 하나로 통일합니다.
async function advanceTimersAsync(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

// ------------------------------------------------------------ Supabase 대역
//
// test-plan §4.1의 `stubSupabase(routes)`입니다. `vi.stubEnv` 둘 뒤
// `vi.stubGlobal("fetch", fn)`을 세웁니다. `fn`은 URL 경로로 응답을 고르고 호출을
// `{ url, init }` 배열로 기록합니다. `routes`는 참조로 잡히므로, 같은 케이스
// 안에서 재시도의 응답을 바꾸려면 반환값이 아니라 넘긴 `routes` 객체 자체의
// 필드를 다시 쓰면 됩니다(IE14c).
type SupabaseRouteResponse = { readonly status: number; readonly body: string };
type SupabaseRoutes = {
  otp?: SupabaseRouteResponse;
  verify?: SupabaseRouteResponse;
  refresh?: SupabaseRouteResponse;
  // 신규(test-plan §5.1) — PKCE 교환 경로입니다. `grant_type`으로 `refresh`와
  // 가릅니다 — 둘 다 `/auth/v1/token`을 공유합니다.
  pkce?: SupabaseRouteResponse;
  // 신규(test-plan §5.1) — Apple ID 토큰 교환 경로입니다(`grant_type=id_token`).
  idToken?: SupabaseRouteResponse;
};
type SupabaseCallInit = {
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: string;
};
type SupabaseCall = { readonly url: string; readonly init: SupabaseCallInit };

function routeFor(url: string, routes: SupabaseRoutes): SupabaseRouteResponse | undefined {
  if (url.endsWith("/auth/v1/otp")) return routes.otp;
  if (url.endsWith("/auth/v1/verify")) return routes.verify;
  if (url.includes("grant_type=pkce")) return routes.pkce;
  if (url.includes("grant_type=id_token")) return routes.idToken;
  if (url.includes("grant_type=refresh_token")) return routes.refresh;
  return undefined;
}

function stubSupabase(routes: SupabaseRoutes): SupabaseCall[] {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  const calls: SupabaseCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: SupabaseCallInit) => {
      calls.push({ url, init });
      const route = routeFor(url, routes);
      if (route === undefined) {
        throw new Error(`stubSupabase: unstubbed route for ${url}`);
      }
      return { status: route.status, text: async () => route.body };
    }),
  );
  return calls;
}

// 응답 픽스처 — Supabase Auth 공개 문서 · evidence의 실서버 왕복(external-probe) 모양
// 그대로입니다(test-plan §4.1). `user` · `expires_at`을 일부러 넣어 파서가 버리는지
// 봅니다(IA4).
const otpSentBody = "{}";

function sessionResponseBody(
  overrides: { accessToken?: string; refreshToken?: string } = {},
): string {
  return JSON.stringify({
    access_token: overrides.accessToken ?? "access-token-1",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 9999999999,
    refresh_token: overrides.refreshToken ?? "refresh-token-1",
    user: { id: "user-1" },
  });
}

const invalidCodeBody = JSON.stringify({
  code: 403,
  error_code: "otp_expired",
  msg: "Token has expired or is invalid",
});

const refreshRejectedBody = JSON.stringify({
  code: 400,
  error_code: "refresh_token_not_found",
  msg: "Invalid Refresh Token: Refresh Token Not Found",
});

// 신규(test-plan §5.1) — PKCE 교환 거절, 공개 문서 모양의 오류 픽스처입니다(IS4).
const flowStateNotFoundBody = JSON.stringify({
  code: 400,
  error_code: "flow_state_not_found",
  msg: "Invalid flow state, no valid flow state found",
});

// 신규(test-plan §5.1) — ID 토큰 교환 거절입니다. ⚠ `code` · `error_code` 값은 **지어낸
// 것**입니다(spec §0 ⚠) — 계약이 값에 기대지 않으므로 단언은 문구만 봅니다.
const badJwtBody = JSON.stringify({
  code: 400,
  error_code: "bad_jwt",
  msg: "Invalid JWT",
});

// ------------------------------------------------------------ 웹 인증 대역
//
// test-plan §5.1의 `stubWebAuthentication(respond)`입니다. **`NativeModules`는 한
// 번에 한 객체로만 선다**는 메모(spec §5.1) 때문에, `StorageModule`과
// `WebAuthenticationModule`을 **같은 객체**에 싣는 헬퍼 하나로 통일합니다 — 기존
// `emptyStorageStub` · `tokenPresentStorageStub`(저장소만 선다)의 호출부는 그대로
// 둡니다. 저장소가 필요 없는 케이스는 이 헬퍼가 만든 `store`를 그냥 무시합니다.
type WebAuthenticationStartArgs = { readonly url: string; readonly callbackScheme: string };
// `respond`가 값을 바로 돌려주면 콜백이 **즉시** 불리고, Promise를 돌려주면 그
// Promise가 풀릴 때 불립니다(deferred) — IS1 · IS8이 후자를 씁니다.
type WebAuthenticationRespond = (args: WebAuthenticationStartArgs) => unknown | Promise<unknown>;

// spec §3 RFC 7636 부록 B의 32바이트를 16진으로 편 것입니다. **고정값**이라야
// authorize 주소의 `code_challenge`가 결정적입니다(test-plan §7) — verifier는
// `dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk`, challenge는
// `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM`입니다.
const fixedRandomBytesHex = "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79";

function stubHostWithWebAuthentication(respond: WebAuthenticationRespond): {
  readonly store: Map<string, string>;
  readonly starts: WebAuthenticationStartArgs[];
  readonly randomByteCounts: number[];
} {
  const store = new Map<string, string>();
  const starts: WebAuthenticationStartArgs[] = [];
  const randomByteCounts: number[] = [];
  vi.stubGlobal("NativeModules", {
    StorageModule: storageModuleFor(store),
    WebAuthenticationModule: {
      start: (args: WebAuthenticationStartArgs, callback: (payload: unknown) => void) => {
        starts.push(args);
        const payload = respond(args);
        if (payload instanceof Promise) {
          void payload.then(callback);
        } else {
          callback(payload);
        }
      },
      randomBytes: (count: number) => {
        randomByteCounts.push(count);
        return fixedRandomBytesHex;
      },
    },
  });
  return { store, starts, randomByteCounts };
}

// ------------------------------------------------------------ Apple 시트 대역
//
// test-plan §5.1 — `StorageModule` · `WebAuthenticationModule` · `AppleSignInModule`을
// **한 객체**에 싣습니다(호스트 경계 하나 — 따로 `stubGlobal`하면 서로 지웁니다). 웹
// 쪽 `start`도 기록해 「apple 탭이 웹 창을 열지 않는다」 · 「웹 탭이 시트를 열지
// 않는다」를 같은 대역으로 셉니다. `randomBytes`는 웹 대역과 같은 고정 16진입니다.
type AppleSignInStartArgs = { readonly nonce: string };
type AppleSignInRespond = (args: AppleSignInStartArgs) => unknown | Promise<unknown>;

// 위 고정 16진의 nonce 한 쌍입니다 — raw는 base64url(같은 바이트), hashed는 raw의
// ASCII 바이트를 SHA-256한 소문자 16진입니다(spec §3.2).
const fixedNonceRaw = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const fixedNonceHashed = "13d31e961a1ad8ec2f16b10c4c982e0876a878ad6df144566ee1894acb70f9c3";

function stubHostWithApple(
  respondApple: AppleSignInRespond,
  respondWeb: WebAuthenticationRespond = completedWebAuthentication,
): {
  readonly store: Map<string, string>;
  readonly appleStarts: AppleSignInStartArgs[];
  readonly webStarts: WebAuthenticationStartArgs[];
  readonly randomByteCounts: number[];
} {
  const store = new Map<string, string>();
  const appleStarts: AppleSignInStartArgs[] = [];
  const webStarts: WebAuthenticationStartArgs[] = [];
  const randomByteCounts: number[] = [];
  vi.stubGlobal("NativeModules", {
    StorageModule: storageModuleFor(store),
    WebAuthenticationModule: {
      start: (args: WebAuthenticationStartArgs, callback: (payload: unknown) => void) => {
        webStarts.push(args);
        const payload = respondWeb(args);
        if (payload instanceof Promise) {
          void payload.then(callback);
        } else {
          callback(payload);
        }
      },
      randomBytes: (count: number) => {
        randomByteCounts.push(count);
        return fixedRandomBytesHex;
      },
    },
    AppleSignInModule: {
      start: (args: AppleSignInStartArgs, callback: (payload: unknown) => void) => {
        appleStarts.push(args);
        const payload = respondApple(args);
        if (payload instanceof Promise) {
          void payload.then(callback);
        } else {
          callback(payload);
        }
      },
    },
  });
  return { store, appleStarts, webStarts, randomByteCounts };
}

const appleIdToken = "apple-id-token-1";

function completedAppleSignIn(): unknown {
  return { status: "completed", identityToken: appleIdToken };
}

// google · facebook(웹 경로) 공용 — 콜백이 `code=abc`로 즉시 끝나는 가장 흔한 성공
// 경로입니다. IE6 · IE7 · IE7b · IE8 · IE9 · IE12 · IE14처럼 「코드 검증 없이
// 지나간다」만 재는 케이스가 이 하나로 통일됩니다(SS8 · IS2와 같은 코드입니다).
function completedWebAuthentication(): unknown {
  return { status: "completed", callbackUrl: "duru://auth-callback?code=abc" };
}

// selectLoginMethod 뒤 대역을 풀고 흘려보내는 비동기 헬퍼입니다(test-plan §5.2 —
// IE7 · IE7b · IE8 · IE12 개정). `onSelectSocialLoginMethod`가 호스트 → 교환
// `fetch`를 거치는 비동기로 바뀌었으므로(spec §3 ⑦) 탭 뒤 미세 작업을 흘려보내야
// 언어 선택으로 넘어갑니다.
async function selectLoginMethodAsync(method: EntryLoginMethod): Promise<void> {
  selectLoginMethod(method);
  await advanceTimersAsync(0);
}

// ------------------------------------------------------------ 조작 헬퍼
//
// 전화번호 입력은 `LoginScreen.ui.test.tsx`의 `dispatchTextFieldInput`과 같은
// 형태입니다(파일이 다르므로 다시 선언합니다, test-plan §4.1).
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

function tapPhoneContinue(): void {
  fireEvent.tap(
    within(screen.getByTestId("login-screen-method-phone")).getByTestId("ui-lynx-button"),
    {},
  );
}

// 번호를 넣고 Continue를 누른 뒤, 요청(성공·실패 어느 쪽이든)이 끝날 때까지
// 미세 작업을 흘려보냅니다. `onSubmitPhoneNumber`가 비동기로 바뀌었으므로
// (spec §2.2) 이 헬퍼도 비동기입니다 — 호출부는 전부 `await`합니다.
async function submitPhoneNumber(value: string): Promise<void> {
  typePhoneNumber(value);
  tapPhoneContinue();
  await advanceTimersAsync(0);
}

// 코드 칸 여섯(CompactNumericInput)에 한 자리씩 넣습니다 — `VerificationCodeScreen.ui.test.tsx`의
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

// `onVerifyCode`도 비동기로 바뀌었으므로(spec §2.3) 제출 뒤 미세 작업을 흘려보냅니다.
async function submitVerificationCode(value: string): Promise<void> {
  typeVerificationCode(value);
  tapVerificationSubmit();
  await advanceTimersAsync(0);
}

function tapResend(): void {
  fireEvent.tap(
    within(screen.getByTestId("verification-code-screen-resend")).getByTestId("ui-lynx-button"),
    {},
  );
}

// 온보딩 세 스텝을 끝까지 넘깁니다(0→1→2→onComplete). `onboarding-screen-next`는
// 스텝마다 같은 testid입니다 — 세 번 누르면 로그인에 닿습니다.
function completeOnboarding(): void {
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
}

function selectLoginMethod(method: EntryLoginMethod): void {
  fireEvent.tap(
    within(screen.getByTestId(`login-screen-method-${method}`)).getByTestId("ui-lynx-button"),
    {},
  );
}

function selectLanguage(language: string): void {
  fireEvent.tap(screen.getByTestId(`ui-lynx-option-selector-item-${language}`), {});
}

function continueLanguageSelect(): void {
  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
}

function startJourney(): void {
  fireEvent.tap(
    within(screen.getByTestId("journey-entry-screen-start")).getByTestId("ui-lynx-button"),
    {},
  );
}

// 갈래가 반대인 대조입니다 — 스플래시 존재 앵커(부재 쪽으로 빨개짐)와 바텀
// 네비게이션 부재(App이 조건 없이 그리면 존재 쪽으로 빨개짐)가 같은 케이스 안에서
// 서로 다른 이유로 빨개집니다. 바 자체는 ui-lynx가 렌더하므로 그쪽 testid로 짓습니다.
test("[IE1] 앱을 켜면 스플래시가 서고 바텀 네비게이션이 없다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);

  expect(screen.getByTestId("splash-screen-logo")).toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-bottom-navigator")).toBeNull();
});

// ---------------------------------------------------------------------- IE2
test("[IE2] 토큰 없이 고정 시간이 지나면 온보딩이 선다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);

  advanceSplash();

  expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
});

// ---------------------------------------------------------------------- IE3
test("[IE3] 온보딩을 끝까지 넘기면 로그인이 선다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();

  completeOnboarding();

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
});

// 2026-09-21 디자인 반영 — 로그인의 뒤로가기는 진입 구간 스택에서 한 칸 뒤(온보딩)로
// 갑니다.
test("[IE3b] 로그인에서 뒤로가기를 누르면 온보딩이 선다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();

  completeOnboarding();
  fireEvent.tap(
    within(screen.getByTestId("login-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.queryByTestId("login-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
});

// ---------------------------------------------------------------------- IE4
//
// 개정(test-plan §4.2) — 전화번호는 이제 코드 화면으로 곧장 가지 않고, 번호를
// 채운 뒤 Continue가 실제로 OTP 요청을 낸 **뒤에**야 옮겨 갑니다.
test("[IE4] 번호 입력 → Continue → OTP 요청 1회 → 코드 화면에 그 번호가 보인다", async () => {
  emptyStorageStub();
  const calls = stubSupabase({ otp: { status: 200, body: otpSentBody } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await submitPhoneNumber("10 1234 5678");

  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe("https://test.supabase.co/auth/v1/otp");
  expect(calls[0]?.init.method).toBe("POST");
  expect(calls[0]?.init.headers["apikey"]).toBe("test-anon-key");
  expect(JSON.parse(calls[0]!.init.body)).toEqual({
    phone: "+821012345678",
    channel: "sms",
    create_user: true,
  });

  expect(screen.getByTestId("verification-code-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("verification-code-screen-phone")).toHaveTextContent(
    "+82 10 1234 5678",
  );
});

// -------------------------------------------------------------------- IA1
test("[IA1] OTP 요청이 500이면 로그인이 그대로이고 login-screen-error가 서며 코드 화면이 없다", async () => {
  emptyStorageStub();
  stubSupabase({ otp: { status: 500, body: "{}" } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await submitPhoneNumber("10 1234 5678");

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("verification-code-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(
    authFailureMessage("unavailable"),
  );
});

// -------------------------------------------------------------------- IA2
test("[IA2] OTP 요청 fetch가 던지면(연결 실패) 로그인이 그대로이고 network 문구가 선다", async () => {
  emptyStorageStub();
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("connection failed"))),
  );
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await submitPhoneNumber("10 1234 5678");

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("verification-code-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(authFailureMessage("network"));
});

// -------------------------------------------------------------------- IA3
test("[IA3] ⭐ 코드 화면에 서 있는 동안 저장소 키가 0개다(OTP는 성공했다)", async () => {
  const store = emptyStorageStub();
  stubSupabase({ otp: { status: 200, body: otpSentBody } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await submitPhoneNumber("10 1234 5678");

  expect(screen.getByTestId("verification-code-screen-title")).toBeInTheDocument();
  expect(Array.from(store.keys())).toEqual([]);
});

// -------------------------------------------------------------------- IA4
test("[IA4] 6자리 검증 성공 → 언어 선택. 검증 요청 본문과 저장된 세션이 계약대로다", async () => {
  const store = emptyStorageStub();
  const calls = stubSupabase({
    otp: { status: 200, body: otpSentBody },
    verify: {
      status: 200,
      body: sessionResponseBody({ accessToken: "access-1", refreshToken: "refresh-1" }),
    },
  });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await submitPhoneNumber("10 1234 5678");

  await submitVerificationCode("123456");

  expect(calls).toHaveLength(2);
  expect(calls[1]?.url).toBe("https://test.supabase.co/auth/v1/verify");
  expect(JSON.parse(calls[1]!.init.body)).toEqual({
    type: "sms",
    phone: "+821012345678",
    token: "123456",
  });
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();

  expect(Array.from(store.keys())).toEqual([authSessionStorageKey]);
  const stored = JSON.parse(store.get(authSessionStorageKey)!) as Record<string, unknown>;
  expect(Object.keys(stored).sort()).toEqual(["accessToken", "expiresAt", "refreshToken"].sort());
  expect(stored["accessToken"]).toBe("access-1");
  expect(stored["refreshToken"]).toBe("refresh-1");
});

// ---------------------------------------------------------------------- IE5
//
// 개정(test-plan §4.2) — 코드 길이가 6자리로 바뀌었습니다. 「5자리에서는 무동작」은
// 부재·무동작을 재는 칸입니다 — 먼저 코드 검증 화면이 **그대로 남아 있다**는
// 존재 앵커를 걸어, 언어 선택으로 못 간 것이 「화면 자체가 없어서」가 아니라
// 「제출이 무동작이라서」임을 갈라 짓습니다.
test("[IE5] 코드 6자리를 채우고 확인하면 언어 선택이 선다(5자리에서는 무동작)", async () => {
  emptyStorageStub();
  stubSupabase({
    otp: { status: 200, body: otpSentBody },
    verify: { status: 200, body: sessionResponseBody() },
  });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await submitPhoneNumber("10 1234 5678");

  await submitVerificationCode("12345");
  expect(screen.queryByTestId("language-select-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("verification-code-screen-title")).toBeInTheDocument();

  await submitVerificationCode("123456");
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();
});

// -------------------------------------------------------------------- IA5
test("[IA5] 검증이 403 otp_expired면 코드 화면이 그대로이고 저장소가 비고 언어 선택이 없다", async () => {
  const store = emptyStorageStub();
  stubSupabase({
    otp: { status: 200, body: otpSentBody },
    verify: { status: 403, body: invalidCodeBody },
  });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await submitPhoneNumber("10 1234 5678");

  await submitVerificationCode("123456");

  expect(screen.getByTestId("verification-code-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("language-select-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("verification-code-screen-error")).toHaveTextContent(
    authFailureMessage("invalid-code"),
  );
  expect(Array.from(store.keys())).toEqual([]);
});

// -------------------------------------------------------------------- IA6
test("[IA6] 재전송하면 OTP가 두 번째로(같은 본문) 불리고 타이머가 05:00으로 돌아간다", async () => {
  emptyStorageStub();
  const calls = stubSupabase({ otp: { status: 200, body: otpSentBody } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await submitPhoneNumber("10 1234 5678");

  expect(calls).toHaveLength(1);

  for (let tick = 0; tick < 3; tick += 1) {
    await advanceTimersAsync(1000);
  }
  expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("04:57");

  tapResend();
  await advanceTimersAsync(0);

  expect(calls).toHaveLength(2);
  expect(calls[1]?.url).toBe("https://test.supabase.co/auth/v1/otp");
  expect(JSON.parse(calls[1]!.init.body)).toEqual(JSON.parse(calls[0]!.init.body));
  expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("05:00");
});

// -------------------------------------------------------------------- IA7
test("[IA7] 세션 있는 저장소로 부팅 → 스플래시 → 갱신 성공 → 여정 맵. 세션이 새 토큰으로 회전한다", async () => {
  const initialSession: AuthSession = {
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: 1000,
  };
  const store = sessionPresentStorageStub(initialSession);
  const calls = stubSupabase({
    refresh: {
      status: 200,
      body: sessionResponseBody({ accessToken: "new-access", refreshToken: "new-refresh" }),
    },
  });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);

  advanceSplash();
  await advanceTimersAsync(0);

  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe("https://test.supabase.co/auth/v1/token?grant_type=refresh_token");
  expect(JSON.parse(calls[0]!.init.body)).toEqual({ refresh_token: "old-refresh" });

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("onboarding-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("login-screen-title")).not.toBeInTheDocument();

  expect(Array.from(store.keys())).toEqual([authSessionStorageKey]);
  const stored = JSON.parse(store.get(authSessionStorageKey)!) as Record<string, unknown>;
  expect(stored["accessToken"]).toBe("new-access");
  expect(stored["refreshToken"]).toBe("new-refresh");
});

// -------------------------------------------------------------------- IA8
//
// ⭐ `back` 대 `backToRoot`를 가릅니다(C11) — 진입 스택 밑에 온보딩을 깔아야 로그인의
// 뒤로가기가 온보딩에 닿습니다.
test("[IA8] 갱신이 거절되면 로그인이 서고 세션 키가 지워진다(로그인의 뒤로가기 → 온보딩)", async () => {
  const initialSession: AuthSession = {
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: 1000,
  };
  const store = sessionPresentStorageStub(initialSession);
  stubSupabase({ refresh: { status: 400, body: refreshRejectedBody } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);

  advanceSplash();
  await advanceTimersAsync(0);

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("onboarding-screen")).not.toBeInTheDocument();
  expect(Array.from(store.keys())).toEqual([]);

  fireEvent.tap(
    within(screen.getByTestId("login-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
});

// -------------------------------------------------------------------- IA9
test("[IA9] 갱신 fetch가 던지면 로그인이 서고 세션 키가 남아 있다", async () => {
  const initialSession: AuthSession = {
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: 1000,
  };
  const store = sessionPresentStorageStub(initialSession);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("connection failed"))),
  );
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);

  advanceSplash();
  await advanceTimersAsync(0);

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(Array.from(store.keys())).toEqual([authSessionStorageKey]);
  const stored = JSON.parse(store.get(authSessionStorageKey)!) as Record<string, unknown>;
  expect(stored["refreshToken"]).toBe("old-refresh");
});

// ------------------------------------------------------------------- IA10
test("[IA10] 갱신 응답이 오기 전에는 스플래시가 그대로 서고, 응답을 풀면 여정 맵이 선다", async () => {
  const initialSession: AuthSession = {
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: 1000,
  };
  sessionPresentStorageStub(initialSession);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  const { promise, resolve } = deferred<{ status: number; text: () => Promise<string> }>();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => promise),
  );

  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);

  advanceSplash();
  // 요청 제한 시간(10초) 안에서 스플래시 지속 시간만큼 더 흘려도 응답이 오지 않으면
  // 그대로 스플래시입니다(C6 — 애니메이션 + 요청 제한 시간의 합이 최장 체류입니다).
  await advanceTimersAsync(entrySplashDurationMs);

  expect(screen.getByTestId("splash-screen-logo")).toBeInTheDocument();

  resolve({
    status: 200,
    text: async () =>
      sessionResponseBody({ accessToken: "new-access", refreshToken: "new-refresh" }),
  });
  await advanceTimersAsync(0);

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

// ------------------------------------------------------------------- IA11
test("[IA11] 설정이 없으면 Continue를 눌러도 fetch가 0회이고 unconfigured 문구가 선다", async () => {
  emptyStorageStub();
  // spec C2 — stubEnv 없이 fetch만 세웁니다. `supabaseConfig()`가 `null`이라
  // api-client는 전송하지 않습니다.
  const fetchSpy = vi.fn<() => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await submitPhoneNumber("10 1234 5678");

  expect(fetchSpy).not.toHaveBeenCalled();
  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(
    authFailureMessage("unconfigured"),
  );
});

// 존재 앵커: `nonPhoneMethods`가 비어 있지 않음을 먼저 확인합니다 — 그래야 아래
// 루프가 공허하게 통과하는 것이 아니라고 말할 수 있습니다. 개정(test-plan §5.2
// IE6) — 소셜 셋이 이제 창 · 시트 · 교환을 거치므로(spec §3 ⑦) 코드 검증 없이도
// **비동기**로 언어 선택에 닿는지를 봅니다. google · facebook은 웹 창 · PKCE 교환,
// apple은 네이티브 시트 · id_token 교환입니다(`stubHostWithApple` · `stubSupabase`).
// 콜백의 값 자체가 화면에 노출되지 않으므로 검증은 여전히 「없다」입니다.
test("[IE6] 구글·애플·페이스북은 코드 검증을 건너뛰고 언어 선택이 선다(비동기)", async () => {
  const nonPhoneMethods = entryLoginMethods.filter((method) => method !== "phone");
  expect(nonPhoneMethods.length).toBeGreaterThan(0);

  for (const method of nonPhoneMethods) {
    const { appleStarts, webStarts } = stubHostWithApple(completedAppleSignIn);
    const calls = stubSupabase({
      pkce: { status: 200, body: sessionResponseBody() },
      idToken: { status: 200, body: sessionResponseBody() },
    });
    vi.useFakeTimers();
    const { unmount } = render(<App phoneSignIn="visible" />);
    advanceSplash();
    completeOnboarding();

    await selectLoginMethodAsync(method);

    // 수단의 호스트가 실제로 도는지까지 봅니다 — 안 그러면 옛 「탭 즉시 전이」
    // 구현에서도 이 케이스가 우연히 통과합니다(공허한 초록). apple은 시트, 나머지는
    // 웹 창이고 **다른 쪽은 0회**입니다.
    expect(appleStarts).toHaveLength(method === "apple" ? 1 : 0);
    expect(webStarts).toHaveLength(method === "apple" ? 0 : 1);
    expect(calls).toHaveLength(1);
    expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();
    expect(screen.queryByTestId("verification-code-screen-title")).not.toBeInTheDocument();

    unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});

// 픽스처는 `en`입니다(초기값 `ko`가 아닙니다) — `ko`로 확인하면 「늘 첫 라벨이
// 보인다」와 관찰이 갈리지 않아 공허합니다. 개정(test-plan §5.2 IE7) —
// `selectLoginMethod` 뒤 대역을 풀고 흘려보내는 비동기 헬퍼로 바뀝니다. 관찰은
// 그대로입니다.
test("[IE7] 언어를 고르고 다음을 누르면 여정 입장에 그 언어의 라벨이 보인다", async () => {
  const { starts } = stubHostWithWebAuthentication(completedWebAuthentication);
  const calls = stubSupabase({ pkce: { status: 200, body: sessionResponseBody() } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await selectLoginMethodAsync("google");

  // 창 · 교환이 실제로 도는지까지 봅니다(공허한 초록 방지 — IE6과 같은 이유).
  expect(starts).toHaveLength(1);
  expect(calls).toHaveLength(1);

  selectLanguage("en");
  continueLanguageSelect();

  expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
    entryLanguageLabel("en"),
  );
});

// 2026-09-21 디자인 반영 — 언어 선택의 뒤로가기는 진입 스택에서 한 칸 뒤로
// 갑니다 — 전화번호 경로면 코드 검증입니다.
test("[IE6b] 언어 선택에서 뒤로가기를 누르면 코드 검증이 선다", async () => {
  emptyStorageStub();
  stubSupabase({
    otp: { status: 200, body: otpSentBody },
    verify: { status: 200, body: sessionResponseBody() },
  });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await submitPhoneNumber("10 1234 5678");
  await submitVerificationCode("123456");
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();

  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.queryByTestId("language-select-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("verification-code-screen-title")).toBeInTheDocument();
});

// 2026-09-21 디자인 반영 — 여정 입장의 뒤로가기는 언어 선택으로 돌아갑니다.
// 개정(test-plan §5.2 IE7b) — 비동기 헬퍼로 바뀝니다.
test("[IE7b] 여정 입장에서 뒤로가기를 누르면 언어 선택이 선다", async () => {
  const { starts } = stubHostWithWebAuthentication(completedWebAuthentication);
  const calls = stubSupabase({ pkce: { status: 200, body: sessionResponseBody() } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await selectLoginMethodAsync("google");

  // 창 · 교환이 실제로 도는지까지 봅니다(공허한 초록 방지 — IE6과 같은 이유).
  expect(starts).toHaveLength(1);
  expect(calls).toHaveLength(1);

  continueLanguageSelect();
  expect(screen.getByTestId("journey-entry-screen-title")).toBeInTheDocument();

  fireEvent.tap(
    within(screen.getByTestId("journey-entry-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.queryByTestId("journey-entry-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();
});

// ---------------------------------------------------------------------- IE8
// 개정(test-plan §5.2 IE8) — 비동기 헬퍼로 바뀝니다. 관찰은 그대로입니다.
test("[IE8] 여정 입장에서 진행하면 여정 맵이 서고 바텀 네비게이션이 그때 처음 보인다", async () => {
  const { starts } = stubHostWithWebAuthentication(completedWebAuthentication);
  const calls = stubSupabase({ pkce: { status: 200, body: sessionResponseBody() } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await selectLoginMethodAsync("google");

  // 창 · 교환이 실제로 도는지까지 봅니다(공허한 초록 방지 — IE6과 같은 이유).
  expect(starts).toHaveLength(1);
  expect(calls).toHaveLength(1);

  selectLanguage("en");
  continueLanguageSelect();

  // 진입 흐름 내내 바텀 네비게이션이 없었습니다 — 「그때 처음」의 대조입니다.
  expect(screen.getByTestId("journey-entry-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-bottom-navigator")).toBeNull();

  startJourney();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-bottom-navigator")).not.toBeNull();
});

// ⭐ 수단 넷 전부를 순회해 「저장된 키가 하나뿐」을 짓습니다. 개정(test-plan §5.2
// IE9) — **어느 수단이든 `authSessionStorageKey` 하나**이고, apple은 Apple 시트
// 대역으로 돕니다.
test("[IE9] 어느 수단으로 진행해도 저장된 키가 authSessionStorageKey 하나다", async () => {
  expect(entryLoginMethods.length).toBeGreaterThan(0);

  for (const method of entryLoginMethods) {
    let store: Map<string, string>;
    if (method === "phone") {
      store = emptyStorageStub();
      stubSupabase({
        otp: { status: 200, body: otpSentBody },
        verify: { status: 200, body: sessionResponseBody() },
      });
    } else {
      store = stubHostWithApple(completedAppleSignIn).store;
      stubSupabase({
        pkce: { status: 200, body: sessionResponseBody() },
        idToken: { status: 200, body: sessionResponseBody() },
      });
    }
    vi.useFakeTimers();
    const { unmount } = render(<App phoneSignIn="visible" />);
    advanceSplash();
    completeOnboarding();
    if (method === "phone") {
      await submitPhoneNumber("10 1234 5678");
      await submitVerificationCode("123456");
    } else {
      await selectLoginMethodAsync(method);
    }
    selectLanguage("en");
    continueLanguageSelect();
    startJourney();

    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    expect(Array.from(store.keys())).toEqual([authSessionStorageKey]);

    unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});

// IT1 — ⭐ AC5(test-plan §5.2, IE10을 대체·반전). 옛 임시 토큰(`libitum.auth.token`)만
// 저장소에 남은 설치는 **이제 로그인한 것이 아닙니다**. 키는 import할 상수가 없어
// 리터럴로 씁니다. 「읽지 않았다」는 `get` 인자 기록으로, 「지우지 않았다」는 값이
// 그대로 남은 것으로 짓습니다(spec N11).
//
// ⚠ 존재 앵커: 스플래시가 실제로 선 뒤에 온보딩이 선다는 것을 함께 걸어, 「처음부터
// 온보딩이었다」와 갈라 짓습니다.
test("[IT1] ⭐ 옛 임시 토큰만 있는 저장소로 켜면 스플래시 뒤 온보딩이 서고(여정 맵 아님) fetch 0회 · 그 키를 읽지도 지우지도 않는다", () => {
  const legacyKey = "libitum.auth.token";
  const store = new Map<string, string>([[legacyKey, "existing-token"]]);
  const gets: string[] = [];
  vi.stubGlobal("NativeModules", { StorageModule: storageModuleFor(store, gets) });
  const fetchSpy = vi.fn<() => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);

  expect(screen.getByTestId("splash-screen-logo")).toBeInTheDocument();

  advanceSplash();

  expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("login-screen-title")).not.toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(gets).not.toContain(legacyKey);
  expect(store.get(legacyKey)).toBe("existing-token");
});

// --------------------------------------------------------------------- IE11
//
// ⭐ `back` 대 `backToRoot`를 가릅니다. 진입 스택의 첫 화면은 온보딩이라
// `backToRoot`였다면 온보딩으로 접혔을 것입니다 — 로그인(한 겹 위)에 닿는 것으로
// 그 갈림을 짓습니다. 개정(test-plan §4.2) — 전화번호 경로를 `stubSupabase`로
// 통과합니다.
test("[IE11] 코드 검증에서 로그인으로를 누르면 로그인이 선다(온보딩이 아니다)", async () => {
  emptyStorageStub();
  stubSupabase({ otp: { status: 200, body: otpSentBody } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await submitPhoneNumber("10 1234 5678");

  fireEvent.tap(
    within(screen.getByTestId("verification-code-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("onboarding-screen")).not.toBeInTheDocument();
});

// 앞쪽 절반(세션 안 유지)은 IE7과 같은 관찰이고, 뒤쪽 절반(새 App은 초기값)이 이
// 케이스의 몫입니다 — 두 번째 `render`에서 언어를 고르지 않고 곧장 `다음`을 눌러,
// 여정 입장에 초기값(`entryLanguages[0]` = `en`)의 라벨이 보이는 것으로 「영속 0」을
// 짓습니다.
// ⚠ 2026-09-21 디자인 반영으로 고를 수 있는 언어가 영어(= 초기값) 하나뿐이라,
// 지금은 「고른 값」과 「초기값」이 같아 이 케이스가 둘을 가르지 못합니다(공허하게
// 통과할 수 있는 자리입니다). 언어가 더 열리면 초기값이 아닌 언어를 고르도록
// 되돌립니다.
// 개정(test-plan §5.2 IE12) — `selectLoginMethod` 뒤 비동기 헬퍼로 바뀝니다(두
// 렌더 모두 창 · 교환 대역이 필요합니다). 관찰은 그대로입니다.
test("[IE12] 언어가 진입 흐름 동안 유지되고, 새로 렌더한 App은 초기값이다(영속 0)", async () => {
  const first = stubHostWithWebAuthentication(completedWebAuthentication);
  const firstCalls = stubSupabase({ pkce: { status: 200, body: sessionResponseBody() } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await selectLoginMethodAsync("google");

  // 창 · 교환이 실제로 도는지까지 봅니다(공허한 초록 방지 — IE6과 같은 이유).
  expect(first.starts).toHaveLength(1);
  expect(firstCalls).toHaveLength(1);

  selectLanguage("en");
  continueLanguageSelect();

  expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
    entryLanguageLabel("en"),
  );

  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();

  // `render()`는 단일 전역 `__root`에 동작해, `cleanup()` 없이 다시 부르면 새
  // 마운트가 아니라 기존 인스턴스의 리렌더가 되어 `useReducer`/`useState`
  // 초기값이 버려지지 않습니다 — `App.integration.test.tsx`의 같은 파일 밖
  // 선례와 같은 이유로 여기서도 명시적으로 부릅니다.
  cleanup();

  // 새로 렌더한 App — 언어를 고르지 않고 곧장 다음을 누릅니다.
  stubHostWithWebAuthentication(completedWebAuthentication);
  stubSupabase({ pkce: { status: 200, body: sessionResponseBody() } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await selectLoginMethodAsync("google");
  continueLanguageSelect();

  expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
    entryLanguageLabel(initialEntryLanguage),
  );
});

// --------------------------------------------------------------------- IE13
//
// `phone` 경로를 고릅니다 — `EntryViewedScreenName`(다섯) 전부를 한 경로 안에서
// 겪는 유일한 수단입니다(온보딩 · 로그인 · 코드 검증 · 언어 선택 · 여정 입장).
// `toEqual`이 다섯 값을 정확히 요구하므로 빈 배열이어도 참이 되는 공허함이 없습니다
// (스플래시 부재는 이 배열 안에 "splash"가 없다는 것으로 직접 확인합니다).
// 개정(test-plan §4.2) — `stubSupabase`로 경로를 통과하고 코드는 6자리입니다. 열람
// 순서 배열은 그대로입니다.
test("[IE13] entry_screen_viewed가 화면 다섯에 대해 각 전이 직전 1회씩 순서대로 나고 스플래시에는 나지 않는다", async () => {
  emptyStorageStub();
  stubSupabase({
    otp: { status: 200, body: otpSentBody },
    verify: { status: 200, body: sessionResponseBody() },
  });
  vi.useFakeTimers();
  const events: EntryEvent[] = [];
  render(<App phoneSignIn="visible" entryEventSink={(event) => events.push(event)} />);
  advanceSplash();
  completeOnboarding();
  await submitPhoneNumber("10 1234 5678");
  await submitVerificationCode("123456");
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

// ⚠ 「세션 재실행 경로에서 0회」는 부재·무동작을 재는 칸입니다 — (b)에서 먼저
// `journey-map-screen` 존재 앵커를 걸어, 0회가 「화면 전이 자체가 안
// 일어나서」가 아니라 「완주가 아니라서」임을 갈라 짓습니다.
// 개정(test-plan §5.2 IE14) — (a) apple 성공을 Apple 시트 대역으로 돌립니다(이벤트
// 시점은 교환 뒤 — spec S11 · C12). (b)는 임시 토큰이 아니라 **세션 재실행 경로**
// (저장된 세션 + 갱신 200)입니다.
test("[IE14] entry_login_method_selected가 수단과 함께 1회이고, entry_completed는 여정 입장 진행에서만 1회다(세션 재실행 경로에서는 0회)", async () => {
  // (a) 신규 진입 경로 — apple 선택 → 언어 선택 → 여정 시작입니다.
  const { appleStarts } = stubHostWithApple(completedAppleSignIn);
  const calls = stubSupabase({ idToken: { status: 200, body: sessionResponseBody() } });
  vi.useFakeTimers();
  const events: EntryEvent[] = [];
  render(<App phoneSignIn="visible" entryEventSink={(event) => events.push(event)} />);
  advanceSplash();
  completeOnboarding();
  await selectLoginMethodAsync("apple");

  // 시트 · 교환이 실제로 도는지까지 봅니다(공허한 초록 방지 — IE6과 같은 이유).
  expect(appleStarts).toHaveLength(1);
  expect(calls).toHaveLength(1);

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
  vi.unstubAllEnvs();

  // (b) 세션 재실행 경로 — 완주가 아니므로 entry_completed·entry_login_method_selected가
  // 0회입니다.
  sessionPresentStorageStub({
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: 1000,
  });
  stubSupabase({ refresh: { status: 200, body: sessionResponseBody() } });
  vi.useFakeTimers();
  const reentryEvents: EntryEvent[] = [];
  render(<App phoneSignIn="visible" entryEventSink={(event) => reentryEvents.push(event)} />);
  advanceSplash();
  await advanceTimersAsync(0);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  expect(reentryEvents.filter((event) => event.name === "entry_completed")).toHaveLength(0);
  expect(
    reentryEvents.filter((event) => event.name === "entry_login_method_selected"),
  ).toHaveLength(0);
});

// 신규(test-plan §5.2 IE14 (e)) — S11: 이벤트는 `signed-in`에서만 납니다. 취소는
// 0회이므로 「취소 뒤 재시도 성공」도 여전히 1회이고, 교환이 끝내 실패하면(성공한
// 순간이 없으므로) 0회입니다.
test("[IE14e] apple 취소 뒤 다시 성공하면 entry_login_method_selected가 1회고, 교환 실패 뒤에는 0회다", async () => {
  // (e-1) 취소 → 재시도 성공.
  let attempt = 0;
  const { appleStarts } = stubHostWithApple(() => {
    attempt += 1;
    return attempt === 1 ? { status: "cancelled" } : completedAppleSignIn();
  });
  stubSupabase({ idToken: { status: 200, body: sessionResponseBody() } });
  vi.useFakeTimers();
  const events: EntryEvent[] = [];
  render(<App phoneSignIn="visible" entryEventSink={(event) => events.push(event)} />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("apple");
  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();

  await selectLoginMethodAsync("apple");
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();

  expect(appleStarts).toHaveLength(2);
  expect(events.filter((event) => event.name === "entry_login_method_selected")).toEqual([
    { name: "entry_login_method_selected", method: "apple" },
  ]);

  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  cleanup();

  // (e-2) 교환이 끝내 실패하면 성공한 순간이 없으므로 0회입니다.
  stubHostWithApple(completedAppleSignIn);
  stubSupabase({ idToken: { status: 400, body: badJwtBody } });
  vi.useFakeTimers();
  const failureEvents: EntryEvent[] = [];
  render(<App phoneSignIn="visible" entryEventSink={(event) => failureEvents.push(event)} />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("apple");

  expect(screen.getByTestId("login-screen-error")).toBeInTheDocument();
  expect(
    failureEvents.filter((event) => event.name === "entry_login_method_selected"),
  ).toHaveLength(0);
});

// 신규(test-plan §4.2 IE14 (c)) — C12: 실패한 시도는 세지 않습니다. 성공한 요청의
// 순간에만 1회 납니다.
test("[IE14c] 전화번호 경로에서 OTP가 한 번 실패하고 두 번째에 성공하면 entry_login_method_selected가 1회다", async () => {
  emptyStorageStub();
  const routes: SupabaseRoutes = { otp: { status: 500, body: "{}" } };
  stubSupabase(routes);
  vi.useFakeTimers();
  const events: EntryEvent[] = [];
  render(<App phoneSignIn="visible" entryEventSink={(event) => events.push(event)} />);
  advanceSplash();
  completeOnboarding();

  await submitPhoneNumber("10 1234 5678");
  expect(screen.getByTestId("login-screen-error")).toBeInTheDocument();
  expect(events.filter((event) => event.name === "entry_login_method_selected")).toHaveLength(0);

  routes.otp = { status: 200, body: otpSentBody };
  await submitPhoneNumber("10 1234 5678");

  expect(screen.getByTestId("verification-code-screen-title")).toBeInTheDocument();
  const selected = events.filter(
    (event): event is Extract<EntryEvent, { name: "entry_login_method_selected" }> =>
      event.name === "entry_login_method_selected",
  );
  expect(selected).toEqual([{ name: "entry_login_method_selected", method: "phone" }]);
});

// 신규(test-plan §4.2 IE14 (d)) — C6: `refresh` 갈래는 완주가 아니므로 `entry_completed`를
// 내지 않습니다.
test("[IE14d] 세션 갱신 부팅에서 entry_completed가 0회다", async () => {
  const initialSession: AuthSession = {
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: 1000,
  };
  sessionPresentStorageStub(initialSession);
  stubSupabase({ refresh: { status: 200, body: sessionResponseBody() } });
  vi.useFakeTimers();
  const events: EntryEvent[] = [];
  render(<App phoneSignIn="visible" entryEventSink={(event) => events.push(event)} />);

  advanceSplash();
  await advanceTimersAsync(0);

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(events.filter((event) => event.name === "entry_completed")).toHaveLength(0);
});

// ======================================================================
// 소셜 로그인 경로(Supabase OAuth + PKCE) — test-plan §5.2 IS1~IS10. 위 IE* 케이스가
// 「소셜도 기존 진입 흐름에 결선돼 있다」를 재는 반면, 이 아래는 **소셜 경로 자체의
// 계약**(창 호출 인자 · 저장 시점 · 취소 · 실패 갈래 · 재실행 갱신 협력)을 잽니다.
// ======================================================================

// IS1 — 요청 창이 아직 안 끝난 사이(`deferred`)에 `start` 인자와 `randomBytes`
// 호출을 검사합니다. SS4와 같은 authorize 주소입니다(고정 challenge, §7).
test("[IS1] google 탭 → start 1회(SS4의 authorize 주소) · randomBytes(32) 1회", () => {
  const pending = deferred<unknown>();
  const { starts, randomByteCounts } = stubHostWithWebAuthentication(() => pending.promise);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  selectLoginMethod("google");

  expect(starts).toHaveLength(1);
  expect(starts[0]?.url).toBe(
    "https://test.supabase.co/auth/v1/authorize?provider=google&redirect_to=duru%3A%2F%2Fauth-callback&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=s256",
  );
  expect(starts[0]?.callbackScheme).toBe("duru");
  expect(randomByteCounts).toEqual([32]);
});

// IS2 — ⭐ 성공 경로의 저장 시점 · 저장 값입니다. 저장 키가
// `authSessionStorageKey` 하나뿐임을 짓습니다(임시 토큰 키가 나타나지 않습니다,
// C3 · C9 개정).
test("[IS2] ⭐ 콜백 code=abc → 교환 1회(정확한 본문) → 언어 선택 · 저장 키가 authSessionStorageKey 하나뿐이다", async () => {
  const { store } = stubHostWithWebAuthentication(completedWebAuthentication);
  const calls = stubSupabase({
    pkce: {
      status: 200,
      body: sessionResponseBody({ accessToken: "social-access", refreshToken: "social-refresh" }),
    },
  });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("google");

  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe("https://test.supabase.co/auth/v1/token?grant_type=pkce");
  expect(JSON.parse(calls[0]!.init.body)).toEqual({
    auth_code: "abc",
    code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  });

  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();

  expect(Array.from(store.keys())).toEqual([authSessionStorageKey]);
  const stored = JSON.parse(store.get(authSessionStorageKey)!) as Record<string, unknown>;
  expect(Object.keys(stored).sort()).toEqual(["accessToken", "expiresAt", "refreshToken"].sort());
});

// IS3 — 취소는 `idle`과 구별되지 않습니다(§5.2 상태표) — 문구 · 저장 · 이벤트가
// 전부 0입니다. 로그인 열람(온보딩 완주) 뒤로만 이벤트를 세어, 부팅 이벤트까지
// 0으로 요구하는 공허한 단언을 피합니다.
test("[IS3] 취소 → 로그인 그대로 · 오류 없음 · fetch 0 · 저장 키 0 · entry_* 이벤트가 로그인 열람 뒤로 0개", async () => {
  const { store } = stubHostWithWebAuthentication(() => ({ status: "cancelled" }));
  const fetchSpy = vi.fn<() => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.useFakeTimers();
  const events: EntryEvent[] = [];
  render(<App phoneSignIn="visible" entryEventSink={(event) => events.push(event)} />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("google");

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("login-screen-error")).not.toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(Array.from(store.keys())).toEqual([]);

  const loginViewedIndex = events.findIndex(
    (event) => event.name === "entry_screen_viewed" && event.screen === "login",
  );
  expect(loginViewedIndex).toBeGreaterThanOrEqual(0);
  expect(events.slice(loginViewedIndex + 1)).toEqual([]);
});

// IS4 — 공개 문서 모양의 교환 거절(400 flow_state_not_found)입니다. 문구는
// `authFailureMessage`로 비교해 리터럴에 매이지 않습니다(test-plan §2.5 방침과 같은
// 이유).
test("[IS4] 교환 400 flow_state_not_found → 로그인 · sign-in-incomplete 문구 · 언어 선택 없음 · 저장 키 0", async () => {
  const { store } = stubHostWithWebAuthentication(completedWebAuthentication);
  stubSupabase({ pkce: { status: 400, body: flowStateNotFoundBody } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("google");

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("language-select-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(
    authFailureMessage("sign-in-incomplete"),
  );
  expect(Array.from(store.keys())).toEqual([]);
});

// IS5 — 교환 `fetch` 자체가 던지는 경우(연결 실패)입니다. IA2 · IA9와 같은 형태의
// 대역입니다.
test("[IS5] 교환 fetch가 던지면(연결 실패) network 문구 · 저장 키 0", async () => {
  const { store } = stubHostWithWebAuthentication(completedWebAuthentication);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("connection failed"))),
  );
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("google");

  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(authFailureMessage("network"));
  expect(Array.from(store.keys())).toEqual([]);
});

// IS6 — ⭐ AC6 — `NativeModules`에 `StorageModule`만 있고 `WebAuthenticationModule`이
// 없는 환경(Lynx Explorer)입니다. `emptyStorageStub()`가 정확히 이 모양입니다 —
// `unsupported`로 끝나고 **던지지 않습니다**(ErrorBoundary 화면이 서지 않는다는
// 것을 로그인 화면이 그대로 있다는 것으로 짓습니다).
test("[IS6] ⭐ StorageModule만(웹 인증 모듈 없음) → unsupported 문구 · 던지지 않는다(로그인 화면 그대로) · fetch 0", async () => {
  emptyStorageStub();
  const fetchSpy = vi.fn<() => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("google");

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(
    authFailureMessage("unsupported"),
  );
  expect(fetchSpy).not.toHaveBeenCalled();
});

// IS7 — 콜백에 `error`가 실려 있으면(사용자가 동의 화면에서 거절해도 포함, spec
// A4) `code`보다 앞서 `sign-in-incomplete`로 끝나고 교환을 부르지 않습니다.
test("[IS7] 콜백 ?error=access_denied → sign-in-incomplete 문구 · fetch 0", async () => {
  stubHostWithWebAuthentication(() => ({
    status: "completed",
    callbackUrl: "duru://auth-callback?error=access_denied",
  }));
  const calls = stubSupabase({});
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("google");

  expect(calls).toHaveLength(0);
  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(
    authFailureMessage("sign-in-incomplete"),
  );
});

// IS8 — C10 넓힘(§5.2) — 창이 열린 채(콜백 보류) 다른 조작이 전부 무동작임을
// 짓습니다. `deferred`로 콜백을 잡아 두고, Continue · apple 탭 · 뒤로가기 순서로
// 무동작을 확인합니다. 개정 — apple 탭은 **Apple 시트를 열지 않고**(0회), 웹 창은
// 여전히 1회입니다.
test("[IS8] 콜백을 보류한 채: Continue → OTP fetch 0 · apple 탭에도 Apple start 0회(웹 start는 여전히 1회) · 뒤로가기 → 로그인 그대로", async () => {
  const pending = deferred<unknown>();
  const { appleStarts, webStarts } = stubHostWithApple(completedAppleSignIn, () => pending.promise);
  const fetchSpy = vi.fn<() => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  selectLoginMethod("google");
  expect(webStarts).toHaveLength(1);

  await submitPhoneNumber("10 1234 5678");
  expect(fetchSpy).not.toHaveBeenCalled();

  selectLoginMethod("apple");
  expect(appleStarts).toHaveLength(0);
  expect(webStarts).toHaveLength(1);

  fireEvent.tap(
    within(screen.getByTestId("login-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );
  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
});

// IS9 — ⭐ AC5 협력 — 소셜로 받은 세션이 재실행 갱신(`refresh` 갈래)을 그대로
// 탄다는 것을 짓습니다. 같은 `store`를 두 번째 렌더에도 그대로 실어(IE12와 같은
// 재렌더 형태) 갱신 요청의 `refresh_token`이 **교환 응답의 것**임을 확인합니다.
test("[IS9] ⭐ 소셜로 로그인한 저장소를 그대로 들고 App을 새로 렌더 → 스플래시 → 갱신 요청의 refresh_token이 교환 응답의 것 → 여정 맵", async () => {
  const { store } = stubHostWithWebAuthentication(completedWebAuthentication);
  stubSupabase({
    pkce: {
      status: 200,
      body: sessionResponseBody({ accessToken: "social-access", refreshToken: "social-refresh" }),
    },
  });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();
  await selectLoginMethodAsync("google");

  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();
  expect(Array.from(store.keys())).toEqual([authSessionStorageKey]);

  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  cleanup();

  // 같은 store를 새 NativeModules 객체에 다시 싣습니다 — 소셜로 저장된 세션을
  // 「그대로 들고」 재실행하는 것입니다.
  vi.stubGlobal("NativeModules", { StorageModule: storageModuleFor(store) });
  const calls = stubSupabase({
    refresh: {
      status: 200,
      body: sessionResponseBody({ accessToken: "new-access", refreshToken: "new-refresh" }),
    },
  });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  await advanceTimersAsync(0);

  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe("https://test.supabase.co/auth/v1/token?grant_type=refresh_token");
  expect(JSON.parse(calls[0]!.init.body)).toEqual({ refresh_token: "social-refresh" });
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

// IS10 — C2 그대로 — 설정이 없으면 창도 열지 않습니다(§3 ①). `stubEnv`를 부르지
// 않고 호스트 · fetch만 스텁해, 「설정 확인이 호스트 호출보다 먼저」임을
// `start` 0회로 짓습니다.
test("[IS10] 설정 없음(stubEnv 없이 호스트 · fetch만) → unconfigured 문구 · start 0회 · fetch 0회", async () => {
  const { starts } = stubHostWithWebAuthentication(completedWebAuthentication);
  const fetchSpy = vi.fn<() => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("google");

  expect(starts).toHaveLength(0);
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(
    authFailureMessage("unconfigured"),
  );
});

// ======================================================================
// 네이티브 Apple 경로(시트 + id_token 교환) — test-plan §5.2 IN1~IN7. IS*가 웹 경로
// 자체의 계약을 재듯, 이 아래는 **Apple 경로 자체의 계약**(시트 호출 인자 · 교환 본문
// · 저장 · 취소 · 실패 갈래 · 상호 배제)을 잽니다.
// ======================================================================

// IN1 — 시트가 아직 안 끝난 사이(`deferred`)에 `start` 인자와 `randomBytes` 호출을
// 검사합니다. 인자는 **`nonce` 하나**이고 값은 해시 쪽(16진 64자)입니다.
test("[IN1] apple 탭 → Apple start 1회(인자는 해시 nonce 하나) · randomBytes(32) 1회 · 웹 start 0회", () => {
  const pending = deferred<unknown>();
  const { appleStarts, webStarts, randomByteCounts } = stubHostWithApple(() => pending.promise);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  selectLoginMethod("apple");

  expect(appleStarts).toEqual([{ nonce: fixedNonceHashed }]);
  expect(randomByteCounts).toEqual([32]);
  expect(webStarts).toHaveLength(0);
});

// IN2 — ⭐ 성공 경로의 교환 본문 · 저장 시점 · 저장 값입니다. 본문의 `nonce`는 시트에
// 넘긴 해시가 아니라 **원본**입니다(서버가 해시를 다시 계산해 비교합니다).
test("[IN2] ⭐ 시트 completed → id_token 교환 1회(정확한 본문) → 언어 선택 · 저장 키가 authSessionStorageKey 하나이고 값이 세 필드다", async () => {
  const { store } = stubHostWithApple(completedAppleSignIn);
  const calls = stubSupabase({
    idToken: {
      status: 200,
      body: sessionResponseBody({ accessToken: "apple-access", refreshToken: "apple-refresh" }),
    },
  });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("apple");

  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe("https://test.supabase.co/auth/v1/token?grant_type=id_token");
  expect(calls[0]?.init.method).toBe("POST");
  expect(JSON.parse(calls[0]!.init.body)).toEqual({
    provider: "apple",
    id_token: appleIdToken,
    nonce: fixedNonceRaw,
  });

  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();

  expect(Array.from(store.keys())).toEqual([authSessionStorageKey]);
  const stored = JSON.parse(store.get(authSessionStorageKey)!) as Record<string, unknown>;
  expect(Object.keys(stored).sort()).toEqual(["accessToken", "expiresAt", "refreshToken"].sort());
  expect(stored["accessToken"]).toBe("apple-access");
  expect(stored["refreshToken"]).toBe("apple-refresh");
});

// IN3 — 취소는 `idle`과 구별되지 않습니다 — 문구 · 저장 · 이벤트가 전부 0입니다. 로그인
// 열람(온보딩 완주) 뒤로만 이벤트를 세어 부팅 이벤트까지 0으로 요구하는 공허함을
// 피합니다(IS3와 같은 형태).
test("[IN3] 시트 취소 → 로그인 그대로 · 오류 없음 · fetch 0 · 저장 키 0 · entry_* 이벤트가 로그인 열람 뒤로 0개", async () => {
  const { store } = stubHostWithApple(() => ({ status: "cancelled" }));
  const fetchSpy = vi.fn<() => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.useFakeTimers();
  const events: EntryEvent[] = [];
  render(<App phoneSignIn="visible" entryEventSink={(event) => events.push(event)} />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("apple");

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("login-screen-error")).not.toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(Array.from(store.keys())).toEqual([]);

  const loginViewedIndex = events.findIndex(
    (event) => event.name === "entry_screen_viewed" && event.screen === "login",
  );
  expect(loginViewedIndex).toBeGreaterThanOrEqual(0);
  expect(events.slice(loginViewedIndex + 1)).toEqual([]);
});

// IN4 — ⭐ AC3 — `NativeModules`에 `StorageModule` · `WebAuthenticationModule`만 있고
// `AppleSignInModule`이 없는 환경(호스트가 옛 빌드이거나 Lynx Explorer)입니다.
// `unsupported`로 끝나고 **던지지 않습니다**(ErrorBoundary 화면이 서지 않는다는 것을
// 로그인 화면이 그대로 있다는 것으로 짓습니다).
test("[IN4] ⭐ Apple 모듈 없음(저장소 · 웹 인증만) → unsupported 문구 · 던지지 않는다(로그인 화면 그대로) · fetch 0", async () => {
  stubHostWithWebAuthentication(completedWebAuthentication);
  const fetchSpy = vi.fn<() => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("apple");

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(
    authFailureMessage("unsupported"),
  );
  expect(fetchSpy).not.toHaveBeenCalled();
});

// IN5 — 교환 거절(400)입니다. 문구는 `authFailureMessage`로 비교해 리터럴에 매이지
// 않습니다.
test("[IN5] id_token 교환 400 → 로그인 · sign-in-incomplete 문구 · 언어 선택 없음 · 저장 키 0", async () => {
  const { store } = stubHostWithApple(completedAppleSignIn);
  stubSupabase({ idToken: { status: 400, body: badJwtBody } });
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("apple");

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("language-select-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(
    authFailureMessage("sign-in-incomplete"),
  );
  expect(Array.from(store.keys())).toEqual([]);
});

// IN6 — 호스트가 `failed`로 답하면(권한 없는 빌드 포함) `unsupported`이고 교환을 부르지
// 않습니다.
test("[IN6] 호스트 failed → unsupported 문구 · fetch 0 · 저장 키 0", async () => {
  const { store } = stubHostWithApple(() => ({ status: "failed" }));
  const fetchSpy = vi.fn<() => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  await selectLoginMethodAsync("apple");

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("login-screen-error")).toHaveTextContent(
    authFailureMessage("unsupported"),
  );
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(Array.from(store.keys())).toEqual([]);
});

// IN7 — C10이 Apple에도 섭니다: 시트 결과를 **보류한 채** 다른 조작이 전부 무동작입니다
// (IS8의 거울). google 탭 → 웹 창 0회, Continue → OTP fetch 0, 뒤로가기 → 로그인 그대로.
test("[IN7] Apple 콜백을 보류한 채: google 탭 → 웹 start 0 · Continue → OTP fetch 0 · 뒤로가기 → 로그인 그대로", async () => {
  const pending = deferred<unknown>();
  const { appleStarts, webStarts } = stubHostWithApple(() => pending.promise);
  const fetchSpy = vi.fn<() => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" />);
  advanceSplash();
  completeOnboarding();

  selectLoginMethod("apple");
  expect(appleStarts).toHaveLength(1);

  selectLoginMethod("google");
  expect(webStarts).toHaveLength(0);
  expect(appleStarts).toHaveLength(1);

  await submitPhoneNumber("10 1234 5678");
  expect(fetchSpy).not.toHaveBeenCalled();

  fireEvent.tap(
    within(screen.getByTestId("login-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );
  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
});

// ------------------------------------------------------------------------- 전화번호 수단 숨김

test("[IPH1] 제품의 기본값으로 부팅하면 로그인에 전화번호 수단이 없고 소셜 셋만 선다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  render(<App />);
  advanceSplash();
  vi.useRealTimers();
  completeOnboarding();

  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("login-screen-phone-field")).not.toBeInTheDocument();
  expect(screen.queryByTestId("login-screen-method-phone")).not.toBeInTheDocument();
  for (const method of ["apple", "google", "facebook"] as const) {
    expect(screen.getByTestId(`login-screen-method-${method}`)).toBeInTheDocument();
  }
});
