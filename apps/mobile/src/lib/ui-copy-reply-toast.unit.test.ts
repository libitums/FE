import { expect, test } from "vitest";

import { uiCopyCatalog } from "./ui-copy";

// `unit` 계층(RT-C1 · C2): 답장 도착 토스트 문구(ADR-0200)가 모든 언어에 있고, 영어 밖의 언어는 영어를 그대로 두지 않는다.
// 뜻의 자연스러움은 원어민 검수 몫이다.

test("RT-C1 모든 언어 — 닫기 낭독 · 「+N」 · 카드 낭독(이름 · 미리보기 · 다른 인물 수)", () => {
  const en = uiCopyCatalog.en.messengerChat?.replyToast;
  for (const [language, copy] of Object.entries(uiCopyCatalog)) {
    const toast = copy.messengerChat?.replyToast;
    expect(toast, language).toBeDefined();
    if (toast === undefined) continue;
    expect((toast.dismiss ?? "").trim(), language).not.toBe("");
    expect(toast.more?.(2), language).toBe("+2");
    const one = toast.spoken?.("미나", "보고 싶어", 0) ?? "";
    const many = toast.spoken?.("미나", "보고 싶어", 2) ?? "";
    expect(one, language).toContain("미나");
    expect(one, language).toContain("보고 싶어");
    expect(many, language).toContain("2");
    expect(many, language).not.toBe(one);
    if (language !== "en" && en !== undefined) {
      expect(toast.dismiss, language).not.toBe(en.dismiss);
      expect(one, language).not.toBe(en.spoken?.("미나", "보고 싶어", 0));
    }
  }
});

test("RT-C2 영어 문구", () => {
  const toast = uiCopyCatalog.en.messengerChat?.replyToast;
  expect(toast?.dismiss).toBe("Dismiss");
  expect(toast?.spoken?.("Mina", "Sent a photo", 0)).toBe("New message from Mina: Sent a photo");
  expect(toast?.spoken?.("Mina", "hi", 2)).toBe("New message from Mina: hi. 2 more");
});
