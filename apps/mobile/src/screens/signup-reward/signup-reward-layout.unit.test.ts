import { expect, test } from "vitest";

import { readCssWithoutComments } from "../../lib/wcag-contrast.test-support";
import { signupRewardCopy } from "../../lib/ui-copy-signup-reward";
import { signupCardBottom, signupCardReserve } from "./signup-reward-layout";

// `unit` 계층(SR-U8 · U9): 가입 권유 카드의 자리와 일곱 언어 문구(ADR-0174).

test("SR-U8 카드는 바 위 12에 서고, 지도 아래 여백이 카드 몫보다 커 맨 아래 유닛을 가리지 않는다", () => {
  expect(signupCardBottom(0)).toBe(80);
  expect(signupCardBottom(34)).toBe(114);
  expect(signupCardReserve).toBe(188);
  // 지도 아래 여백(`.journey-map-screen-map` padding-bottom = `mapContentInsets.bottom`, IN2가 둘을 맞춘다)이 카드 몫을 넘는다.
  const css = readCssWithoutComments("src/screens/journey-map/journey-map-screen.css");
  const padding = Number(/padding-bottom:\s*(\d+)px/.exec(css)?.[1]);
  expect(padding).toBeGreaterThanOrEqual(signupCardReserve);
});

test("SR-U9 일곱 언어 모두 제 말로 — 영어를 그대로 쓰는 칸이 없고 금액이 들어간다", () => {
  const { en, ...others } = signupRewardCopy;
  for (const [language, copy] of Object.entries(others)) {
    for (const key of ["cardBody", "signUp", "title", "bodyGuest", "bodyNew", "gotIt"] as const) {
      expect(copy[key], `${language}.${key}`).not.toBe(en[key]);
      expect(copy[key].trim(), `${language}.${key}`).not.toBe("");
    }
    expect(copy.cardTitle(100), language).toContain("100");
    expect(copy.cardTitle(100), language).not.toBe(en.cardTitle(100));
    expect(copy.amountSpoken(100), language).toContain("100");
  }
  expect(en.cardTitle(100)).toBe("Get 100 Yeopjeon free");
});
