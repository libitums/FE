import { expect, test } from "vitest";

import { appShellClassName } from "./app-shell-class";

// `unit` 계층: 앱 뿌리 클래스 — 스플래시 · 베트남어 강조 글꼴(ADR-0091 D5).

test("AS1. 영어는 app, 스플래시는 app-splash를 더한다", () => {
  expect(appShellClassName(false, "en")).toBe("app");
  expect(appShellClassName(true, "en")).toBe("app app-splash");
});

test("AS2. 베트남어면 app-lang-vi를 더한다 — 다른 언어는 더하지 않는다", () => {
  expect(appShellClassName(false, "vi")).toBe("app app-lang-vi");
  expect(appShellClassName(true, "vi")).toBe("app app-splash app-lang-vi");
  expect(appShellClassName(false, "es")).toBe("app");
});

test("AS3. 일본어면 app-lang-ja를 더한다 — 한자를 일본어 자형 글꼴로 먼저 찾는다(ADR-0098)", () => {
  expect(appShellClassName(false, "ja")).toBe("app app-lang-ja");
  expect(appShellClassName(true, "ja")).toBe("app app-splash app-lang-ja");
  expect(appShellClassName(false, "es")).toBe("app");
});
