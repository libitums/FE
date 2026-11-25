import { expect, test } from "vitest";

import { uiCopyCatalog } from "./ui-copy";

// `unit` 계층(PV-C1 · PV-C2, ADR-0198 D3): 프로필 시트 목소리 견본 문구(단추 셋 · 낭독 이름 · 못 읽음 줄)가 여덟 언어 모두에 있고,
// 영어 밖의 언어는 영어를 그대로 두지 않는다. 뜻의 자연스러움은 원어민 검수 몫이다.

const PHASES = ["idle", "playing", "paused"] as const;

test("PV-C1 모든 언어 — 단추 셋 · 낭독 이름(자리마다 다름, 이름 들어감) · 못 읽음", () => {
  const en = uiCopyCatalog.en.messengerChat?.suggested?.voice;
  expect(Object.keys(uiCopyCatalog)).toHaveLength(8);
  for (const [language, copy] of Object.entries(uiCopyCatalog)) {
    const voice = copy.messengerChat?.suggested?.voice;
    expect(voice, language).toBeDefined();
    if (voice === undefined) continue;
    const buttons = [voice.hear, voice.pause, voice.resume].map((text) => (text ?? "").trim());
    expect(
      buttons.every((text) => text !== ""),
      language,
    ).toBe(true);
    expect(new Set(buttons).size, language).toBe(3);
    const labels = PHASES.map((phase) => voice.label?.("차서연", phase) ?? "");
    expect(new Set(labels).size, language).toBe(3);
    for (const label of labels) expect(label, language).toContain("차서연");
    expect((voice.unavailable ?? "").trim(), language).not.toBe("");
    if (language !== "en" && en !== undefined) {
      expect(voice.hear, language).not.toBe(en.hear);
      expect(voice.unavailable, language).not.toBe(en.unavailable);
    }
  }
});

test("PV-C2 영어 문구 — ADR-0198 그대로", () => {
  const voice = uiCopyCatalog.en.messengerChat?.suggested?.voice;
  expect(voice?.hear).toBe("Hear voice");
  expect(voice?.pause).toBe("Pause");
  expect(voice?.resume).toBe("Resume");
  expect(voice?.unavailable).toBe("Voice sample unavailable");
});
