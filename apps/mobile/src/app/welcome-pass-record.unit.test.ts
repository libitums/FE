import { expect, test } from "vitest";

import {
  signupWindowAhead,
  welcomePassShownFrom,
  welcomePassShownStorageKey,
} from "./welcome-pass-record";

// `unit` 계층(WS-U7 ~ U9, ADR-0186 개정 4): 가입 보상 창이 처음 선 시각의 기기 기록(계정마다)과 「창이 아직 앞에 있나」 판정.

test("WS-U7 창 기록 — 계정마다 키, 양의 정수 ms만 읽고 틀리면 null", () => {
  expect(welcomePassShownStorageKey("user-1")).toBe("libitum.welcome-pass.shown-at.user-1");
  expect(welcomePassShownFrom("1764200000000")).toBe(1_764_200_000_000);
  expect(welcomePassShownFrom(null)).toBeNull();
  expect(welcomePassShownFrom("")).toBeNull();
  expect(welcomePassShownFrom("abc")).toBeNull();
  expect(welcomePassShownFrom("-5")).toBeNull();
  expect(welcomePassShownFrom("0")).toBeNull();
  expect(welcomePassShownFrom("1.5")).toBeNull();
});

test("WS-U8 창이 앞에 있나 — 튜토리얼 중이면 지급 결과와 상관없이, 끝냈으면 받은 보상을 아직 안 봤을 때만", () => {
  // 받았는데 아직 안 봄 — 튜토리얼과 상관없이 창이 곧 선다.
  expect(signupWindowAhead({ amount: 100, shown: false }, true)).toBe(true);
  expect(signupWindowAhead({ amount: 100, shown: false }, false)).toBe(true);
  // 튜토리얼을 끝냈고 봤거나 받을 게 없음(이미 받은 계정 · 기존 회원 · 꺼짐 · 재가입) — 창이 오지 않는다(계정 생성 기준).
  expect(signupWindowAhead({ amount: 100, shown: true }, true)).toBe(false);
  expect(signupWindowAhead({ amount: 0, shown: true }, true)).toBe(false);
  // 튜토리얼을 끝냈는데 지급을 모름(물음 실패 등) — 계정 생성 기준.
  expect(signupWindowAhead(null, true)).toBe(false);
  // 튜토리얼 중 지급을 아직 모름 — 창이 올 수 있다(티켓도 안 씀).
  expect(signupWindowAhead(null, false)).toBe(true);
});

test("WS-U9 튜토리얼 중에는 지급 0(재가입 identity_used · 기존 회원 · 꺼짐)이 와도 창 전이다 — 2026-11-27 기기 회귀", () => {
  expect(signupWindowAhead({ amount: 0, shown: true }, false)).toBe(true);
  expect(signupWindowAhead({ amount: 100, shown: true }, false)).toBe(true);
});
