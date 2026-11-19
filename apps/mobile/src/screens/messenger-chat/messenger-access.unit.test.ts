import { expect, test } from "vitest";

import { canBrowseChats, messengerAccessOf } from "./messenger-access";

// `unit` 계층(MA-U1 · MA-U2): 메신저 탭 접근 판정(ADR-0128 · 2026-11-17 일반 회원 개방 · ADR-0166 비회원 미리보기).

test("MA-U1 로그인한 회원은 open, 비회원은 preview, 로그아웃(진입 구간)은 sign-in", () => {
  expect(messengerAccessOf("signed-in")).toBe("open");
  expect(messengerAccessOf("guest")).toBe("preview");
  expect(messengerAccessOf("signed-out")).toBe("sign-in");
});

test("MA-U2 목록 · 방은 open · preview가 그리고, sign-in은 가입 권유 안내만", () => {
  expect(canBrowseChats("open")).toBe(true);
  expect(canBrowseChats("preview")).toBe(true);
  expect(canBrowseChats("sign-in")).toBe(false);
});
