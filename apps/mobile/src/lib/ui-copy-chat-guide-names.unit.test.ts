import { expect, test } from "vitest";

import { uiCopyCatalog } from "./ui-copy";

// `unit` 계층(GA-C1, 메신저 가이드 점검 4): 방 안내의 예시 단계는 「○○을 누르세요」라고 말한다 — 그 ○○은 기능 줄 알약에 실제로 적힌
// 이름이어야 학습자가 찾는다. 모든 언어에서 사진 단계는 `features.snapshot`, 음성 단계는 `features.snapVoice`를 그대로 담는다.

test("GA-C1 모든 언어 — 예시 사진 · 음성 단계 문구에 알약 이름이 그대로 들어 있다", () => {
  for (const [language, copy] of Object.entries(uiCopyCatalog)) {
    const chat = copy.messengerChat;
    const steps = chat?.guide?.steps;
    const features = chat?.features;
    expect(steps?.sample, language).toBeDefined();
    expect(features?.snapshot, language).toBeDefined();
    expect(steps?.sample, language).toContain(features?.snapshot);
    expect(steps?.voice, language).toContain(features?.snapVoice);
  }
});
