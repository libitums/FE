import { afterEach, expect, test } from "vitest";
import { cleanup } from "@lynx-js/react/testing-library";

import {
  completeOnboarding,
  flush,
  flushRounds,
  installGuestHost,
  present,
  renderGuestApp,
  resetGuestHost,
  tapButtonIn,
} from "./test-helpers/guest-entry";

// `integration` 계층: 사용 불가 수단 안내 대화상자(ADR-0111 개정 2) — 로그인 화면 · 대화상자 · 웹 인증 경계의 협력.
// 대역은 경계뿐입니다(`test-helpers/guest-entry`).

afterEach(() => {
  cleanup();
  resetGuestHost();
});

const dialog = "login-screen-unavailable-dialog";

function policyWith(unavailable: unknown): string {
  return JSON.stringify({
    schema: "app-policy-1",
    min_build: {},
    unavailable_login_methods: unavailable,
  });
}

async function openFacebookDialog(
  content?: Readonly<Record<string, string>>,
): Promise<ReturnType<typeof installGuestHost>> {
  const host = installGuestHost(content === undefined ? {} : { content });
  await renderGuestApp(host, { platform: "ios" });
  completeOnboarding();
  tapButtonIn("login-screen-method-facebook");
  await flush();
  return host;
}

test("[GE13] Facebook을 탭하면 안내 대화상자가 서고 요청 · 웹 인증 창이 0이며, 「Google로 계속」은 대화상자를 닫고 Google 웹 인증 창을 한 번 시작한다", async () => {
  const host = await openFacebookDialog();

  expect(present(dialog)).toBe(true);
  expect(host.requests).toEqual([]);
  expect(host.webStarts).toEqual([]);
  expect(present("learner-name-screen-title")).toBe(false);

  tapButtonIn("ui-lynx-dialog-action-use-google");
  await flushRounds();

  expect(present(dialog)).toBe(false);
  expect(host.webStarts).toHaveLength(1);
  expect(JSON.stringify(host.webStarts[0])).toContain("google");
  expect(JSON.stringify(host.webStarts[0])).not.toContain("facebook");
});

test("[GE13b] 「닫기」는 대화상자만 닫고 로그인 화면에 머물며 요청 · 웹 인증 창이 계속 0이다", async () => {
  const host = await openFacebookDialog();
  expect(present(dialog)).toBe(true);

  tapButtonIn("ui-lynx-dialog-action-close");
  await flushRounds();

  expect(present(dialog)).toBe(false);
  expect(present("login-screen-title")).toBe(true);
  expect(present("login-screen-method-facebook")).toBe(true);
  expect(host.requests).toEqual([]);
  expect(host.webStarts).toEqual([]);
});

// ------------------------------------------------------------------------- GE14 (개정 3 — 정책이 정본)

test("[GE14] 저장된 앱 정책이 사용 불가 목록을 비우면 Facebook 탭이 대화상자 없이 Facebook 웹 인증 창을 바로 연다(앱 배포 없이 되살리기)", async () => {
  const host = await openFacebookDialog({
    "app-policy.json": policyWith({ all: [], android: [] }),
  });

  expect(present(dialog)).toBe(false);
  expect(host.webStarts).toHaveLength(1);
  expect(JSON.stringify(host.webStarts[0])).toContain("facebook");
});

test("[GE14b] 정책 파일이 있어도 그 칸이 없으면 기본값(상수)대로 Facebook은 대화상자다", async () => {
  const host = await openFacebookDialog({
    "app-policy.json": JSON.stringify({ schema: "app-policy-1", min_build: {} }),
  });

  expect(present(dialog)).toBe(true);
  expect(host.webStarts).toEqual([]);
});

test("[GE14c] 정책이 Google을 막으면 Google 탭도 같은 대화상자다 — 목록은 정책이 정한다", async () => {
  const host = installGuestHost({
    content: { "app-policy.json": policyWith({ all: ["google"], android: [] }) },
  });
  await renderGuestApp(host, { platform: "ios" });
  completeOnboarding();
  tapButtonIn("login-screen-method-google");
  await flush();

  expect(present(dialog)).toBe(true);
  expect(host.webStarts).toEqual([]);
  tapButtonIn("login-screen-method-facebook");
  await flush();
  expect(host.webStarts).toHaveLength(1);
});
