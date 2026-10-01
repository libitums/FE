import { beforeAll, describe, expect, test } from "vitest";

import { signEs256 } from "./apple-client-secret.ts";
import { base64UrlFromBytes, bytesFromBase64Url } from "./base64.ts";
import type {
  DeleteAccountEnv,
  DeleteAccountLogEntry,
  Outbound,
  OutboundRequest,
  OutboundResponse,
} from "./delete-account.contract.ts";
import { createDeleteAccountHandler } from "./delete-account-handler.ts";

// 핸들러 + 실제 WebCrypto 서명 + 가짜 바깥 호출(Supabase Auth · Apple)을 한 줄로 잇습니다.
// 대역은 바깥 호출 경계(`Outbound`) 하나뿐이고, 받은 요청을 순서대로 기록합니다.

const nowMs = 1_700_000_123_456;
const userToken = "user-access-token";
const userId = "user-1";
const appleSubject = "apple-sub-1";
const anonKey = "anon-key";
const serviceKey = "service-role-key";
const appleRefreshToken = "apple-refresh-token";

let privateKeyPem: string;
let publicKey: CryptoKey;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  publicKey = pair.publicKey;
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  let binary = "";
  for (const byte of der) binary += String.fromCharCode(byte);
  const lines = btoa(binary).match(/.{1,64}/g) ?? [];
  privateKeyPem = ["-----BEGIN PRIVATE KEY-----", ...lines, "-----END PRIVATE KEY-----"].join("\n");
});

function makeEnv(apple: boolean = true): DeleteAccountEnv {
  return {
    supabaseUrl: "https://project.supabase.co",
    supabaseAnonKey: anonKey,
    supabaseServiceRoleKey: serviceKey,
    apple: apple
      ? {
          teamId: "TEAM",
          keyId: "KEY",
          clientId: "com.libitum.host",
          webClientId: "com.libitum.web",
          privateKeyPem,
        }
      : null,
  };
}

// 비서명 JWT입니다(핸들러는 서명을 검증하지 않고 `sub`만 읽습니다).
function unsignedJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    base64UrlFromBytes(new TextEncoder().encode(JSON.stringify(value)));
  return `${encode({ alg: "none" })}.${encode(payload)}.`;
}

const plainUserBody = JSON.stringify({
  id: userId,
  identities: [{ provider: "google", id: "g1" }],
});
const appleUserBody = JSON.stringify({
  id: userId,
  identities: [{ provider: "apple", id: "ident-1", identity_data: { sub: appleSubject } }],
});
const exchangeBody = (sub: string | null = appleSubject): string =>
  JSON.stringify({
    refresh_token: appleRefreshToken,
    ...(sub === null ? {} : { id_token: unsignedJwt({ sub }) }),
  });

type Reply = { status: number; body?: string } | "reject" | "throw";
type Routes = {
  user: Reply;
  exchange: Reply;
  revoke: Reply;
  remove: Reply;
};

const okRoutes = (overrides: Partial<Routes> = {}): Routes => ({
  user: { status: 200, body: plainUserBody },
  exchange: { status: 200, body: exchangeBody() },
  revoke: { status: 200, body: "{}" },
  remove: { status: 200, body: "{}" },
  ...overrides,
});

function routeKey(request: OutboundRequest): keyof Routes {
  if (request.url.endsWith("/auth/v1/user")) return "user";
  if (request.url.includes("/auth/v1/admin/users/")) return "remove";
  if (request.url.endsWith("/auth/token")) return "exchange";
  if (request.url.endsWith("/auth/revoke")) return "revoke";
  throw new Error(`예상 밖 바깥 호출 ${request.method} ${request.url}`);
}

function setup(
  routes: Routes,
  env: DeleteAccountEnv | null = makeEnv(),
  overrides: { nowMs?: () => number; signEs256?: typeof signEs256 } = {},
) {
  const requests: OutboundRequest[] = [];
  const logs: DeleteAccountLogEntry[] = [];
  const outbound: Outbound = (request) => {
    requests.push(request);
    const reply = routes[routeKey(request)];
    if (reply === "throw") throw new Error("boom");
    if (reply === "reject") return Promise.reject(new Error("network down"));
    const response: OutboundResponse = { status: reply.status, text: async () => reply.body ?? "" };
    return Promise.resolve(response);
  };
  const handler = createDeleteAccountHandler({
    env,
    outbound,
    nowMs: overrides.nowMs ?? (() => nowMs),
    signEs256: overrides.signEs256 ?? signEs256,
    log: (entry) => void logs.push(entry),
  });
  return { handler, requests, logs };
}

function post(
  body: string | null = '{"apple_authorization_code":null}',
  authorization: string | null = `Bearer ${userToken}`,
): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authorization !== null) headers["Authorization"] = authorization;
  return new Request("https://project.supabase.co/functions/v1/delete-account", {
    method: "POST",
    headers,
    body,
  });
}

const codeBody = (code: string | null): string =>
  JSON.stringify({ apple_authorization_code: code });

async function expectError(response: Response, status: number, error: string): Promise<void> {
  expect(response.status).toBe(status);
  expect(response.headers.get("Content-Type")).toBe("application/json");
  await expect(response.json()).resolves.toEqual({ error });
}

const urlsOf = (requests: readonly OutboundRequest[]): string[] =>
  requests.map((request) => `${request.method} ${request.url}`);
const deletions = (requests: readonly OutboundRequest[]) =>
  requests.filter((request) => request.method === "DELETE");
const appleCalls = (requests: readonly OutboundRequest[]) =>
  requests.filter((request) => request.url.startsWith("https://appleid.apple.com"));

describe("[FI1] 메서드", () => {
  test.each(["GET", "OPTIONS", "DELETE"])(
    "%s는 405 · Allow: POST · 바깥 호출 0",
    async (method) => {
      const { handler, requests } = setup(okRoutes());
      const response = await handler(
        new Request("https://project.supabase.co/functions/v1/delete-account", { method }),
      );
      await expectError(response, 405, "method_not_allowed");
      expect(response.headers.get("Allow")).toBe("POST");
      expect(requests).toEqual([]);
    },
  );
});

describe("[FI2] 환경", () => {
  test("env가 null이면 500 server_misconfigured · 바깥 0", async () => {
    const { handler, requests } = setup(okRoutes(), null);
    await expectError(await handler(post()), 500, "server_misconfigured");
    expect(requests).toEqual([]);
  });
});

describe("[FI3] Authorization", () => {
  test.each([null, "Basic x", "Bearer "])(
    "%j는 401 missing_authorization · 바깥 0",
    async (auth) => {
      const { handler, requests } = setup(okRoutes());
      await expectError(await handler(post(undefined, auth)), 401, "missing_authorization");
      expect(requests).toEqual([]);
    },
  );
});

describe("[FI4] 세션 조회가 4xx", () => {
  test.each([401, 403, 404])("조회 %i는 401 invalid_session · 삭제 0", async (status) => {
    const { handler, requests } = setup(okRoutes({ user: { status, body: "{}" } }));
    await expectError(await handler(post()), 401, "invalid_session");
    expect(deletions(requests)).toEqual([]);
  });
});

describe("[FI5] 세션 조회를 못 씀", () => {
  test.each<[string, Reply]>([
    ["500", { status: 500, body: "{}" }],
    ["거부", "reject"],
    ["200 + 깨진 본문", { status: 200, body: "not json" }],
  ])("조회 %s는 502 auth_unavailable · 삭제 0", async (_name, user) => {
    const { handler, requests } = setup(okRoutes({ user }));
    await expectError(await handler(post()), 502, "auth_unavailable");
    expect(deletions(requests)).toEqual([]);
  });
});

describe("[FI6] 본문", () => {
  test.each(["not json", "{}", '{"apple_authorization_code":""}'])(
    "%j는 400 invalid_body · 조회 1 · 삭제 0",
    async (body) => {
      const { handler, requests } = setup(okRoutes());
      await expectError(await handler(post(body)), 400, "invalid_body");
      expect(requests).toHaveLength(1);
      expect(requests[0]?.url).toMatch(/\/auth\/v1\/user$/);
      expect(deletions(requests)).toEqual([]);
    },
  );

  test("토큰이 무효이고 본문도 깨졌으면 조회가 먼저라 401이다", async () => {
    const { handler } = setup(okRoutes({ user: { status: 401, body: "{}" } }));
    await expectError(await handler(post("not json")), 401, "invalid_session");
  });
});

describe("[FI7] 비 Apple 사용자 · 코드 null", () => {
  test("204 · 본문 없음 · 조회 → 삭제 순서 · 헤더 자격", async () => {
    const { handler, requests } = setup(okRoutes());
    const response = await handler(post(codeBody(null)));

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    expect(urlsOf(requests)).toEqual([
      "GET https://project.supabase.co/auth/v1/user",
      `DELETE https://project.supabase.co/auth/v1/admin/users/${userId}`,
    ]);
    expect(requests[0]?.headers).toMatchObject({
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
    });
    expect(requests[1]?.headers).toMatchObject({
      apikey: serviceKey,
    });
  });
});

describe("[FI8] 비 Apple 사용자 · 코드 있음", () => {
  test("204 · Apple 호출 0", async () => {
    const { handler, requests } = setup(okRoutes());
    expect((await handler(post(codeBody("c")))).status).toBe(204);
    expect(appleCalls(requests)).toEqual([]);
  });
});

describe("[FI9] Apple 사용자 · 코드 null", () => {
  test("400 apple_authorization_code_required · Apple 0 · 삭제 0", async () => {
    const { handler, requests } = setup(okRoutes({ user: { status: 200, body: appleUserBody } }));
    await expectError(
      await handler(post(codeBody(null))),
      400,
      "apple_authorization_code_required",
    );
    expect(appleCalls(requests)).toEqual([]);
    expect(deletions(requests)).toEqual([]);
  });
});

describe("[FI10] Apple 사용자의 전체 왕복", () => {
  test("204 · 조회 → 교환 → 철회 → 삭제 순서 · 요청 내용", async () => {
    const { handler, requests } = setup(okRoutes({ user: { status: 200, body: appleUserBody } }));
    const response = await handler(post(codeBody("auth-code-1")));

    expect(response.status).toBe(204);
    expect(urlsOf(requests)).toEqual([
      "GET https://project.supabase.co/auth/v1/user",
      "POST https://appleid.apple.com/auth/token",
      "POST https://appleid.apple.com/auth/revoke",
      `DELETE https://project.supabase.co/auth/v1/admin/users/${userId}`,
    ]);

    const exchange = requests[1]!;
    const revoke = requests[2]!;
    expect(exchange.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    const exchangeForm = new URLSearchParams(exchange.body ?? "");
    expect(Array.from(exchangeForm.keys())).toEqual([
      "client_id",
      "client_secret",
      "code",
      "grant_type",
    ]);
    expect(exchangeForm.get("client_id")).toBe("com.libitum.host");
    expect(exchangeForm.get("code")).toBe("auth-code-1");
    expect(exchangeForm.get("grant_type")).toBe("authorization_code");

    const revokeForm = new URLSearchParams(revoke.body ?? "");
    expect(Array.from(revokeForm.keys())).toEqual([
      "client_id",
      "client_secret",
      "token",
      "token_type_hint",
    ]);
    expect(revokeForm.get("token")).toBe(appleRefreshToken);
    expect(revokeForm.get("token_type_hint")).toBe("refresh_token");
    expect(revokeForm.get("client_secret")).toBe(exchangeForm.get("client_secret"));

    // client secret은 생성한 키의 공개키로 검증되고 클레임이 규칙대로다.
    const secret = exchangeForm.get("client_secret") ?? "";
    const [header, claims, signature] = secret.split(".");
    const decode = (part: string | undefined): unknown =>
      JSON.parse(new TextDecoder().decode(bytesFromBase64Url(part ?? "") ?? new Uint8Array()));
    expect(decode(header)).toEqual({ alg: "ES256", kid: "KEY" });
    const iat = Math.floor(nowMs / 1000);
    expect(decode(claims)).toEqual({
      iss: "TEAM",
      iat,
      exp: iat + 300,
      aud: "https://appleid.apple.com",
      sub: "com.libitum.host",
    });
    const verified = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      (bytesFromBase64Url(signature ?? "") ?? new Uint8Array()) as Uint8Array<ArrayBuffer>,
      new TextEncoder().encode(`${header}.${claims}`),
    );
    expect(verified).toBe(true);
  });
});

describe("[FI10-W] Android Apple 웹 재인증", () => {
  const webBody = (refreshToken = appleRefreshToken) =>
    JSON.stringify({ apple_authorization_code: null, apple_provider_refresh_token: refreshToken });

  test("Apple refresh grant의 subject를 대조한 뒤 같은 토큰을 Services ID로 철회한다", async () => {
    const { handler, requests } = setup(
      okRoutes({
        user: { status: 200, body: appleUserBody },
        exchange: {
          status: 200,
          body: JSON.stringify({ id_token: unsignedJwt({ sub: appleSubject }) }),
        },
      }),
    );
    expect((await handler(post(webBody()))).status).toBe(204);
    expect(urlsOf(requests)).toEqual([
      "GET https://project.supabase.co/auth/v1/user",
      "POST https://appleid.apple.com/auth/token",
      "POST https://appleid.apple.com/auth/revoke",
      `DELETE https://project.supabase.co/auth/v1/admin/users/${userId}`,
    ]);
    const validation = new URLSearchParams(requests[1]?.body ?? "");
    expect(validation.get("client_id")).toBe("com.libitum.web");
    expect(validation.get("grant_type")).toBe("refresh_token");
    expect(validation.get("refresh_token")).toBe(appleRefreshToken);
    const revoke = new URLSearchParams(requests[2]?.body ?? "");
    expect(revoke.get("client_id")).toBe("com.libitum.web");
    expect(revoke.get("token")).toBe(appleRefreshToken);
    const secret = validation.get("client_secret") ?? "";
    const claims = JSON.parse(
      new TextDecoder().decode(bytesFromBase64Url(secret.split(".")[1] ?? "") ?? new Uint8Array()),
    );
    expect(claims.sub).toBe("com.libitum.web");
  });

  test("다른 Apple 계정이면 철회와 삭제를 하지 않는다", async () => {
    const { handler, requests } = setup(
      okRoutes({
        user: { status: 200, body: appleUserBody },
        exchange: {
          status: 200,
          body: JSON.stringify({ id_token: unsignedJwt({ sub: "other" }) }),
        },
      }),
    );
    await expectError(await handler(post(webBody())), 403, "apple_account_mismatch");
    expect(appleCalls(requests)).toHaveLength(1);
    expect(deletions(requests)).toEqual([]);
  });

  test("검증 응답에 id_token이 없으면 철회와 삭제를 하지 않는다", async () => {
    const { handler, requests } = setup(
      okRoutes({
        user: { status: 200, body: appleUserBody },
        exchange: { status: 200, body: "{}" },
      }),
    );
    await expectError(await handler(post(webBody())), 502, "apple_exchange_failed");
    expect(appleCalls(requests)).toHaveLength(1);
    expect(deletions(requests)).toEqual([]);
  });

  test("Services ID 설정이 없으면 Apple을 부르지 않는다", async () => {
    const env = makeEnv();
    const { handler, requests } = setup(okRoutes({ user: { status: 200, body: appleUserBody } }), {
      ...env,
      apple: { ...env.apple!, webClientId: undefined },
    });
    await expectError(await handler(post(webBody())), 500, "server_misconfigured");
    expect(appleCalls(requests)).toEqual([]);
    expect(deletions(requests)).toEqual([]);
  });
});

describe("[FI11] 교환 실패", () => {
  test.each<[string, Reply]>([
    ["400 invalid_grant", { status: 400, body: '{"error":"invalid_grant"}' }],
    ["거부", "reject"],
    ["200 + refresh_token 없음", { status: 200, body: "{}" }],
  ])("%s는 502 apple_exchange_failed · 철회 0 · 삭제 0", async (_name, exchange) => {
    const { handler, requests } = setup(
      okRoutes({ user: { status: 200, body: appleUserBody }, exchange }),
    );
    await expectError(await handler(post(codeBody("c"))), 502, "apple_exchange_failed");
    expect(requests.some((request) => request.url.endsWith("/auth/revoke"))).toBe(false);
    expect(deletions(requests)).toEqual([]);
  });
});

describe("[FI12] 계정 대조 실패", () => {
  test.each<[string, string]>([
    ["sub 불일치", exchangeBody("someone-else")],
    ["id_token 없음", exchangeBody(null)],
  ])("%s는 403 apple_account_mismatch · 철회 0 · 삭제 0", async (_name, body) => {
    const { handler, requests } = setup(
      okRoutes({ user: { status: 200, body: appleUserBody }, exchange: { status: 200, body } }),
    );
    await expectError(await handler(post(codeBody("c"))), 403, "apple_account_mismatch");
    expect(requests.some((request) => request.url.endsWith("/auth/revoke"))).toBe(false);
    expect(deletions(requests)).toEqual([]);
  });
});

describe("[FI13] 철회 실패", () => {
  test.each<[string, Reply]>([
    ["400", { status: 400, body: "{}" }],
    ["거부", "reject"],
  ])("%s는 502 apple_revoke_failed · 삭제 0", async (_name, revoke) => {
    const { handler, requests } = setup(
      okRoutes({ user: { status: 200, body: appleUserBody }, revoke }),
    );
    await expectError(await handler(post(codeBody("c"))), 502, "apple_revoke_failed");
    expect(deletions(requests)).toEqual([]);
  });
});

describe("[FI14] 삭제 실패", () => {
  test.each<[string, Reply]>([
    ["500", { status: 500, body: "{}" }],
    ["거부", "reject"],
  ])("%s는 500 delete_failed · 철회는 이미 1", async (_name, remove) => {
    const { handler, requests } = setup(
      okRoutes({ user: { status: 200, body: appleUserBody }, remove }),
    );
    await expectError(await handler(post(codeBody("c"))), 500, "delete_failed");
    expect(requests.filter((request) => request.url.endsWith("/auth/revoke"))).toHaveLength(1);
  });
});

describe("[FI15] 이미 없는 사용자", () => {
  test("삭제 404는 204다", async () => {
    const { handler } = setup(okRoutes({ remove: { status: 404, body: "{}" } }));
    expect((await handler(post())).status).toBe(204);
  });
});

describe("[FI16] Apple 자격이 없는 배포", () => {
  test("Apple 사용자는 500 server_misconfigured · Apple 0 · 삭제 0", async () => {
    const { handler, requests } = setup(
      okRoutes({ user: { status: 200, body: appleUserBody } }),
      makeEnv(false),
    );
    await expectError(await handler(post(codeBody("c"))), 500, "server_misconfigured");
    expect(appleCalls(requests)).toEqual([]);
    expect(deletions(requests)).toEqual([]);
  });

  test("비 Apple 사용자는 같은 배포에서도 지워진다", async () => {
    const { handler } = setup(okRoutes(), makeEnv(false));
    expect((await handler(post())).status).toBe(204);
  });
});

describe("[FI17] PEM이 깨짐", () => {
  test("Apple 사용자는 500 server_misconfigured · Apple 0 · 삭제 0", async () => {
    const broken: DeleteAccountEnv = {
      ...makeEnv(),
      apple: { teamId: "TEAM", keyId: "KEY", clientId: "com.libitum.host", privateKeyPem: "nope" },
    };
    const { handler, requests } = setup(
      okRoutes({ user: { status: 200, body: appleUserBody } }),
      broken,
    );
    await expectError(await handler(post(codeBody("c"))), 500, "server_misconfigured");
    expect(appleCalls(requests)).toEqual([]);
    expect(deletions(requests)).toEqual([]);
  });
});

describe("[FI18] 예상 밖 예외", () => {
  test("삭제 단계에서 바깥 호출이 동기로 던져도 500 delete_failed다", async () => {
    const { handler } = setup(okRoutes({ remove: "throw" }));
    await expectError(await handler(post()), 500, "delete_failed");
  });

  test("서명기가 던져도 500 delete_failed · 핸들러는 거부하지 않고 Apple · 삭제 0", async () => {
    const { handler, requests, logs } = setup(
      okRoutes({ user: { status: 200, body: appleUserBody } }),
      makeEnv(),
      {
        signEs256: () => {
          throw new Error("sign exploded");
        },
      },
    );
    await expectError(await handler(post(codeBody("c"))), 500, "delete_failed");
    expect(appleCalls(requests)).toEqual([]);
    expect(deletions(requests)).toEqual([]);
    expect(logs).toEqual([{ event: "delete-account", status: 500, error: "delete_failed" }]);
  });

  test("시계가 던져도 500 delete_failed다", async () => {
    const { handler } = setup(okRoutes({ user: { status: 200, body: appleUserBody } }), makeEnv(), {
      nowMs: () => {
        throw new Error("clock exploded");
      },
    });
    await expectError(await handler(post(codeBody("c"))), 500, "delete_failed");
  });
});

describe("[FI19] 로그", () => {
  const secretsRegex = new RegExp(
    [userToken, userId, appleSubject, appleRefreshToken, "auth-code-1", serviceKey, anonKey].join(
      "|",
    ),
  );

  test.each<[string, Routes, string | null, string | null, number]>([
    ["204", okRoutes(), codeBody(null), null, 204],
    [
      "Apple 204",
      okRoutes({ user: { status: 200, body: appleUserBody } }),
      codeBody("auth-code-1"),
      null,
      204,
    ],
    [
      "401",
      okRoutes({ user: { status: 401, body: "{}" } }),
      codeBody(null),
      "invalid_session",
      401,
    ],
    [
      "403",
      okRoutes({
        user: { status: 200, body: appleUserBody },
        exchange: { status: 200, body: exchangeBody("other") },
      }),
      codeBody("auth-code-1"),
      "apple_account_mismatch",
      403,
    ],
    ["삭제 500", okRoutes({ remove: { status: 500 } }), codeBody(null), "delete_failed", 500],
  ])(
    "%s 요청은 로그가 정확히 한 줄이고 비밀이 없다",
    async (_name, routes, body, error, status) => {
      const { handler, logs } = setup(routes);
      await handler(post(body));
      expect(logs).toHaveLength(1);
      expect(Object.keys(logs[0] ?? {}).sort()).toEqual(["error", "event", "status"]);
      expect(logs[0]).toEqual({ event: "delete-account", status, error });
      expect(JSON.stringify(logs)).not.toMatch(secretsRegex);
    },
  );

  test("405 · 환경 오류 · 인증 누락도 한 줄이다", async () => {
    const cases: Array<[Request, DeleteAccountEnv | null]> = [
      [new Request("https://x.test/", { method: "GET" }), makeEnv()],
      [post(), null],
      [post(undefined, null), makeEnv()],
    ];
    for (const [request, env] of cases) {
      const { handler, logs } = setup(okRoutes(), env);
      await handler(request);
      expect(logs).toHaveLength(1);
    }
  });
});
