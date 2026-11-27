import { expect, test } from "vitest";

import {
  signupWindowAhead,
  welcomePassShownFrom,
  welcomePassShownStorageKey,
} from "./welcome-pass-record";

// `unit` 계층(WS-U7 · U8, ADR-0186 개정 4): 가입 보상 창이 처음 선 시각의 기기 기록(계정마다)과 「창이 아직 앞에 있나」 판정.

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

test("WS-U8 창이 앞에 있나 — 받은 보상을 아직 안 봤거나, 지급을 아직 모르는데 튜토리얼 중이면", () => {
  // 받았는데 아직 안 봄 — 튜토리얼과 상관없이 창이 곧 선다.
  expect(signupWindowAhead({ amount: 100, shown: false }, true)).toBe(true);
  expect(signupWindowAhead({ amount: 100, shown: false }, false)).toBe(true);
  // 봤거나 받을 게 없음(이미 받은 계정 · 기존 회원 · 꺼짐) — 창이 오지 않는다.
  expect(signupWindowAhead({ amount: 100, shown: true }, false)).toBe(false);
  expect(signupWindowAhead({ amount: 0, shown: true }, false)).toBe(false);
  // 지급을 아직 모름 — 튜토리얼 중이면 창이 올 수 있고(티켓도 안 씀), 튜토리얼을 끝냈으면(지급 물음 실패 등) 계정 생성 기준.
  expect(signupWindowAhead(null, false)).toBe(true);
  expect(signupWindowAhead(null, true)).toBe(false);
});
