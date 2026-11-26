import { describe, expect, test } from "vitest";

import { entryLanguages } from "./entry-language";
import { uiCopyFor } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";

// `unit` 계층(CB-U8): Chat Plus 첫 구독 보너스 모달 문구(ADR-0196 D4) — 여덟 언어 모두 자기 말로, 요금제 이름 「Chat Plus」는 영어 그대로.

test("CB-U8a 영어 — SUBSCRIBER GIFT · Welcome to Chat Plus!", () => {
  const copy = uiCopyEn.signupReward;
  expect(copy.subscriberTag).toBe("SUBSCRIBER GIFT");
  expect(copy.subscriberTitle).toBe("Welcome to Chat Plus!");
  expect(copy.subscriberBody.trim()).not.toBe("");
});

describe.each(entryLanguages.filter((language) => language !== "en"))("CB-U8b · %s", (language) => {
  const copy = uiCopyFor(language).signupReward;
  test("알약 · 보조문은 영어와 다르고(번역됨), 제목은 Chat Plus를 영어로 담는다", () => {
    expect(copy.subscriberTag.trim()).not.toBe("");
    expect(copy.subscriberTag).not.toBe(uiCopyEn.signupReward.subscriberTag);
    expect(copy.subscriberBody).not.toBe(uiCopyEn.signupReward.subscriberBody);
    expect(copy.subscriberTitle).toContain("Chat Plus");
    expect(copy.subscriberTitle).not.toBe(uiCopyEn.signupReward.subscriberTitle);
  });
});
