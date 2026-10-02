import { afterEach, expect, test, vi } from "vitest";

import {
  oauthCallbackFrom,
  oauthCallbackScheme,
  oauthProviderFor,
  oauthRedirectUrl,
  signInWithSocialProvider,
} from "./social-sign-in";

// RFC 7636 부록 B의 바이트 · verifier · challenge(spec §3 각주). 호스트 `randomBytes`
// 대역이 이 16진을 돌려주므로 authorize 주소의 challenge가 결정적이다.
const rfcHex = "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79";
const rfcVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const rfcChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const R = oauthRedirectUrl;

function stubConfig(): void {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
}

function jsonResponse(
  status: number,
  body: unknown,
): { status: number; text: () => Promise<string> } {
  return { status, text: async () => JSON.stringify(body) };
}

function stubHost(overrides: {
  start?: (args: Record<string, unknown>, callback: (payload: unknown) => void) => void;
  randomBytes?: (count: number) => unknown;
}): {
  start: ReturnType<typeof vi.fn>;
  randomBytes: ReturnType<typeof vi.fn>;
} {
  const start = vi.fn(overrides.start ?? (() => {}));
  const randomBytes = vi.fn(overrides.randomBytes ?? (() => rfcHex));
  vi.stubGlobal("NativeModules", { WebAuthenticationModule: { start, randomBytes } });
  return { start, randomBytes };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ------------------------------------------------------------------ 순수 함수

test("SS1. oauthProviderFor 셋 · oauthRedirectUrl 상수", () => {
  expect(oauthProviderFor("apple")).toBe("apple");
  expect(oauthProviderFor("google")).toBe("google");
  expect(oauthProviderFor("facebook")).toBe("facebook");
  expect(oauthRedirectUrl).toBe(`${oauthCallbackScheme}://auth-callback`);
});

test("SS-C1. oauthCallbackFrom — code, 쿼리 · 프래그먼트, 퍼센트 디코딩", () => {
  expect(oauthCallbackFrom(`${R}?code=abc`, R)).toEqual({ kind: "code", code: "abc" });
  expect(oauthCallbackFrom(`${R}#code=abc`, R)).toEqual({ kind: "code", code: "abc" });
  expect(oauthCallbackFrom(`${R}?code=a%2Bb`, R)).toEqual({ kind: "code", code: "a+b" });
});

test("SS-C2. error가 code보다 앞선다", () => {
  expect(oauthCallbackFrom(`${R}?code=abc&error=access_denied`, R)).toEqual({
    kind: "error",
    error: "access_denied",
  });
  expect(oauthCallbackFrom(`${R}#error=server_error`, R)).toEqual({
    kind: "error",
    error: "server_error",
  });
});

test("SS-C3. malformed — 다른 접두 · 접두 뒤 다른 글자 · 인자 없음 · 빈 code", () => {
  expect(oauthCallbackFrom("https://x/?code=1", R)).toEqual({ kind: "malformed" });
  expect(oauthCallbackFrom(`${R}X?code=1`, R)).toEqual({ kind: "malformed" });
  expect(oauthCallbackFrom(R, R)).toEqual({ kind: "malformed" });
  expect(oauthCallbackFrom(`${R}?code=`, R)).toEqual({ kind: "malformed" });
});

test("SS-C4. 깨진 퍼센트 인코딩에서 던지지 않고 그 쌍을 버려 malformed가 된다", () => {
  const brokenUrl = `${R}?code=%E0%A4%A&x=1`;

  expect(() => oauthCallbackFrom(brokenUrl, R)).not.toThrow();
  expect(oauthCallbackFrom(brokenUrl, R)).toEqual({ kind: "malformed" });
});

// ------------------------------------------------------------------ 흐름 — signInWithSocialProvider

test("SS2. 설정 없음 → failed/unconfigured, 호스트 · fetch 0회", async () => {
  const { start, randomBytes } = stubHost({});
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await expect(signInWithSocialProvider("google")).resolves.toEqual({
    status: "failed",
    reason: "unconfigured",
  });
  expect(start).not.toHaveBeenCalled();
  expect(randomBytes).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("SS3. 모듈 없음 → failed/unsupported, fetch 0회, 거부하지 않는다", async () => {
  stubConfig();
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  // NativeModules를 아예 세우지 않는다 — 모듈 부재.

  await expect(signInWithSocialProvider("google")).resolves.toEqual({
    status: "failed",
    reason: "unsupported",
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("SS4. start에 넘긴 url이 정확한 authorize 주소, callbackScheme이 duru다", async () => {
  stubConfig();
  const { start } = stubHost({});
  vi.stubGlobal("fetch", vi.fn());

  // start가 콜백하지 않아 흐름은 멈춰 있다 — 여기서는 건네준 인자만 본다.
  // `.catch`는 스캐폴드(throw 스텁)의 미처리 거부를 막을 뿐이다 — 계약상
  // `signInWithSocialProvider`는 거부하지 않으므로 구현 뒤에는 그냥 통과한다.
  void signInWithSocialProvider("google").catch(() => {});
  await Promise.resolve();

  expect(start).toHaveBeenCalledTimes(1);
  const [args] = start.mock.calls[0] as [Record<string, unknown>, unknown];
  expect(args["url"]).toBe(
    `https://test.supabase.co/auth/v1/authorize?provider=google&redirect_to=duru%3A%2F%2Fauth-callback&code_challenge=${rfcChallenge}&code_challenge_method=s256`,
  );
  expect(args["callbackScheme"]).toBe("duru");
});

test("SS5. 호스트 cancelled → cancelled, fetch 0회", async () => {
  stubConfig();
  stubHost({ start: (_args, callback) => callback({ status: "cancelled" }) });
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await expect(signInWithSocialProvider("google")).resolves.toEqual({ status: "cancelled" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("SS6. 호스트 failed · already-active · invalid-arguments · 모양 없는 페이로드 → 전부 failed/unsupported, fetch 0회", async () => {
  stubConfig();
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  for (const payload of [
    { status: "failed" },
    { status: "already-active" },
    { status: "invalid-arguments" },
    { status: "not-a-known-shape" },
  ]) {
    stubHost({ start: (_args, callback) => callback(payload) });

    await expect(signInWithSocialProvider("google")).resolves.toEqual({
      status: "failed",
      reason: "unsupported",
    });
  }
  expect(fetchMock).not.toHaveBeenCalled();
});

test("SS7. completed + ?error=access_denied → failed/sign-in-incomplete, fetch 0회", async () => {
  stubConfig();
  stubHost({
    start: (_args, callback) =>
      callback({ status: "completed", callbackUrl: `${R}?error=access_denied` }),
  });
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await expect(signInWithSocialProvider("google")).resolves.toEqual({
    status: "failed",
    reason: "sign-in-incomplete",
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("SS8. completed + ?code=abc → 교환 1회, signed-in — 결과에 verifier가 없다", async () => {
  stubConfig();
  stubHost({
    start: (_args, callback) => callback({ status: "completed", callbackUrl: `${R}?code=abc` }),
  });
  const fetchMock = vi.fn(async () =>
    jsonResponse(200, { access_token: "at", refresh_token: "rt", expires_in: 3600 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const result = await signInWithSocialProvider("google");

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
  expect(url).toBe("https://test.supabase.co/auth/v1/token?grant_type=pkce");
  expect(JSON.parse(init.body)).toEqual({ auth_code: "abc", code_verifier: rfcVerifier });

  expect(result).toEqual({
    status: "signed-in",
    session: {
      accessToken: "at",
      refreshToken: "rt",
      expiresAt: expect.any(Number),
    },
  });
  expect(Object.keys(result)).not.toContain("verifier");
  if (result.status === "signed-in") {
    expect(Object.keys(result.session)).not.toContain("verifier");
  }
});

test("SS9. 교환 실패 판정 — 400 → sign-in-incomplete · 429 → rate-limited · 던짐 → network", async () => {
  stubConfig();

  stubHost({
    start: (_args, callback) => callback({ status: "completed", callbackUrl: `${R}?code=abc` }),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(400, { error_code: "flow_state_not_found" })),
  );
  await expect(signInWithSocialProvider("google")).resolves.toEqual({
    status: "failed",
    reason: "sign-in-incomplete",
  });

  stubHost({
    start: (_args, callback) => callback({ status: "completed", callbackUrl: `${R}?code=abc` }),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(429, {})),
  );
  await expect(signInWithSocialProvider("google")).resolves.toEqual({
    status: "failed",
    reason: "rate-limited",
  });

  stubHost({
    start: (_args, callback) => callback({ status: "completed", callbackUrl: `${R}?code=abc` }),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("connection refused");
    }),
  );
  await expect(signInWithSocialProvider("google")).resolves.toEqual({
    status: "failed",
    reason: "network",
  });
});

// ------------------------------------------------------------------ Apple 네이티브 경로(test-plan §2.3 SA1~SA8 · SS10)

const appleHashed = "13d31e961a1ad8ec2f16b10c4c982e0876a878ad6df144566ee1894acb70f9c3";
const appleExchangeUrl = "https://test.supabase.co/auth/v1/token?grant_type=id_token";

// 한 객체에 두 모듈을 싣는다(test-plan §7). 웹 `start`는 실패로 즉시 답해, 잘못된 경로를 타도
// 멈추지 않고 단언 실패로 드러나게 한다.
function stubAppleHost(overrides: {
  appleStart?: (args: Record<string, unknown>, callback: (payload: unknown) => void) => void;
  web?: boolean;
  apple?: boolean;
}): {
  webStart: ReturnType<typeof vi.fn>;
  randomBytes: ReturnType<typeof vi.fn>;
  appleStart: ReturnType<typeof vi.fn>;
} {
  const webStart = vi.fn((_args: Record<string, unknown>, callback: (payload: unknown) => void) =>
    callback({ status: "failed" }),
  );
  const randomBytes = vi.fn((_count: number) => rfcHex);
  const appleStart = vi.fn(overrides.appleStart ?? (() => {}));
  const modules: Record<string, unknown> = {};
  if (overrides.web !== false) {
    modules["WebAuthenticationModule"] = { start: webStart, randomBytes };
  }
  if (overrides.apple !== false) {
    modules["AppleSignInModule"] = { start: appleStart };
  }
  vi.stubGlobal("NativeModules", modules);
  return { webStart, randomBytes, appleStart };
}

test("SA1. apple — 설정 없음 → failed/unconfigured, randomBytes · Apple start · fetch 0회", async () => {
  const { randomBytes, appleStart } = stubAppleHost({});
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await expect(signInWithSocialProvider("apple")).resolves.toEqual({
    status: "failed",
    reason: "unconfigured",
  });
  expect(randomBytes).not.toHaveBeenCalled();
  expect(appleStart).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("SA2. apple — WebAuthenticationModule 없음(Apple만) → failed/unsupported, Apple start · fetch 0회, 거부하지 않는다", async () => {
  stubConfig();
  const { appleStart } = stubAppleHost({ web: false });
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await expect(signInWithSocialProvider("apple")).resolves.toEqual({
    status: "failed",
    reason: "unsupported",
  });
  expect(appleStart).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("SA3. apple — 네이티브 모듈이 없으면 웹 OAuth + PKCE로 로그인한다", async () => {
  stubConfig();
  const { start, randomBytes } = stubHost({
    start: (_args, callback) =>
      callback({ status: "completed", callbackUrl: `${R}?code=apple-code` }),
  });
  const fetchMock = vi.fn(async () =>
    jsonResponse(200, { access_token: "at", refresh_token: "rt", expires_in: 3600 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await expect(signInWithSocialProvider("apple")).resolves.toEqual({
    status: "signed-in",
    session: { accessToken: "at", refreshToken: "rt", expiresAt: expect.any(Number) },
  });
  expect(randomBytes).toHaveBeenCalledWith(32);
  expect(start).toHaveBeenCalledTimes(1);
  expect((start.mock.calls[0] as [Record<string, unknown>])[0]["url"]).toBe(
    `https://test.supabase.co/auth/v1/authorize?provider=apple&redirect_to=duru%3A%2F%2Fauth-callback&code_challenge=${rfcChallenge}&code_challenge_method=s256`,
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
  expect(url).toBe("https://test.supabase.co/auth/v1/token?grant_type=pkce");
  expect(JSON.parse(init.body)).toEqual({ auth_code: "apple-code", code_verifier: rfcVerifier });
});

test("SA3b. apple — 두 인증 모듈이 모두 없으면 failed/unsupported", async () => {
  stubConfig();
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await expect(signInWithSocialProvider("apple")).resolves.toEqual({
    status: "failed",
    reason: "unsupported",
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("SA4. apple — Apple start 인자가 정확히 { nonce: 해시 }, randomBytes(32) 1회, 웹 start 0회", async () => {
  stubConfig();
  const { webStart, randomBytes, appleStart } = stubAppleHost({});
  vi.stubGlobal("fetch", vi.fn());

  void signInWithSocialProvider("apple").catch(() => {});
  await Promise.resolve();
  await Promise.resolve();

  expect(appleStart).toHaveBeenCalledTimes(1);
  const [args] = appleStart.mock.calls[0] as [Record<string, unknown>, unknown];
  expect(args).toEqual({ nonce: appleHashed });
  expect(Object.keys(args)).toEqual(["nonce"]);
  expect(randomBytes).toHaveBeenCalledTimes(1);
  expect(randomBytes).toHaveBeenCalledWith(32);
  expect(webStart).not.toHaveBeenCalled();
});

test("SA5. apple — 호스트 cancelled → cancelled, fetch 0회", async () => {
  stubConfig();
  stubAppleHost({ appleStart: (_args, callback) => callback({ status: "cancelled" }) });
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  await expect(signInWithSocialProvider("apple")).resolves.toEqual({ status: "cancelled" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("SA6. apple — failed · already-active · invalid-arguments · 모양 없는 페이로드 → 전부 failed/unsupported, fetch 0회", async () => {
  stubConfig();
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  for (const payload of [
    { status: "failed" },
    { status: "already-active" },
    { status: "invalid-arguments" },
    { status: "not-a-known-shape" },
  ]) {
    stubAppleHost({ appleStart: (_args, callback) => callback(payload) });

    await expect(signInWithSocialProvider("apple")).resolves.toEqual({
      status: "failed",
      reason: "unsupported",
    });
  }
  expect(fetchMock).not.toHaveBeenCalled();
});

test("SA7. apple — completed → id_token 교환 1회(정확한 URL · 본문) → signed-in, 결과에 nonce가 없다", async () => {
  stubConfig();
  stubAppleHost({
    appleStart: (_args, callback) =>
      callback({ status: "completed", identityToken: "apple-id-token-1" }),
  });
  const fetchMock = vi.fn(async () =>
    jsonResponse(200, { access_token: "at", refresh_token: "rt", expires_in: 3600 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const result = await signInWithSocialProvider("apple");

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as unknown as [
    string,
    { method: string; body: string },
  ];
  expect(url).toBe(appleExchangeUrl);
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({
    provider: "apple",
    id_token: "apple-id-token-1",
    nonce: rfcVerifier,
  });
  expect(result).toEqual({
    status: "signed-in",
    session: { accessToken: "at", refreshToken: "rt", expiresAt: expect.any(Number) },
  });
  expect(JSON.stringify(result)).not.toContain(rfcVerifier);
});

test("SA8. apple — 교환 400 → sign-in-incomplete · 429 → rate-limited · 500 → unavailable · 던짐 → network", async () => {
  stubConfig();
  const cases: ReadonlyArray<[() => Promise<unknown>, string]> = [
    [async () => jsonResponse(400, { error_code: "bad_jwt" }), "sign-in-incomplete"],
    [async () => jsonResponse(429, {}), "rate-limited"],
    [async () => jsonResponse(500, {}), "unavailable"],
    [
      async () => {
        throw new Error("connection refused");
      },
      "network",
    ],
  ];

  for (const [respond, reason] of cases) {
    stubAppleHost({
      appleStart: (_args, callback) => callback({ status: "completed", identityToken: "t" }),
    });
    vi.stubGlobal("fetch", vi.fn(respond));

    await expect(signInWithSocialProvider("apple")).resolves.toEqual({
      status: "failed",
      reason,
    });
  }
});

test("SS10. 웹 경로(google)는 AppleSignInModule.start를 부르지 않는다", async () => {
  stubConfig();
  const { appleStart, webStart } = stubAppleHost({});
  vi.stubGlobal("fetch", vi.fn());

  await signInWithSocialProvider("google");

  expect(webStart).toHaveBeenCalledTimes(1);
  expect(appleStart).not.toHaveBeenCalled();
});
