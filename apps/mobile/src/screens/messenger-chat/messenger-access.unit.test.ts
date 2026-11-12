import { expect, test } from "vitest";

import { messengerAccessOf } from "./messenger-access";

// `unit` 계층(MA-U1): 메신저 탭 접근 판정(ADR-0128).

test("MA-U1 로그인 + 시험 계정 = open, 로그인만 = coming-soon, 손님 · 로그아웃 = sign-in(시험 표시와 무관)", () => {
  expect(messengerAccessOf("signed-in", true)).toBe("open");
  expect(messengerAccessOf("signed-in", false)).toBe("coming-soon");
  expect(messengerAccessOf("guest", false)).toBe("sign-in");
  expect(messengerAccessOf("guest", true)).toBe("sign-in");
  expect(messengerAccessOf("signed-out", false)).toBe("sign-in");
});
