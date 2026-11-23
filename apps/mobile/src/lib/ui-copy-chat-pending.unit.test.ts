import { expect, test } from "vitest";

import { uiCopyCatalog } from "./ui-copy";

// `unit` 계층(MPS-C1): 사진 · 음성 대기 문구(ADR-0146 추가)가 일곱 언어 모두 단계 수만큼 있고, 첫 단계는 인물 이름으로 시작을 알린다.
// 뜻 · 순서의 자연스러움은 원어민 검수 몫이다 — 여기서는 빈 글 · 이름 빠짐 · 같은 글 반복만 막는다(리뷰 #541).

test("MPS-C1 일곱 언어 — 사진 넷 · 음성 둘, 빈 글 없음 · 서로 다른 글 · 첫 단계에 이름", () => {
  for (const [language, copy] of Object.entries(uiCopyCatalog)) {
    const photo = copy.messengerChat?.room?.photoPending?.("Mina") ?? [];
    const voice = copy.messengerChat?.room?.voicePending?.("Mina") ?? [];
    expect(photo, language).toHaveLength(4);
    expect(voice, language).toHaveLength(2);
    for (const lines of [photo, voice]) {
      expect(
        lines.every((line) => line.trim() !== ""),
        language,
      ).toBe(true);
      expect(new Set(lines).size, language).toBe(lines.length);
      expect(lines[0], language).toContain("Mina");
    }
  }
});
