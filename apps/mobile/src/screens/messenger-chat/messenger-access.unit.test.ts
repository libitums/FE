import { expect, test } from "vitest";

import { messengerAccessOf } from "./messenger-access";

// `unit` 계층(MA-U1): 메신저 탭 접근 판정(ADR-0128 · 2026-11-17 일반 회원 개방).

test("MA-U1 로그인한 회원은 시험 계정이 아니어도 open, 손님 · 로그아웃은 sign-in", () => {
  expect(messengerAccessOf("signed-in")).toBe("open");
  expect(messengerAccessOf("guest")).toBe("sign-in");
  expect(messengerAccessOf("signed-out")).toBe("sign-in");
});
