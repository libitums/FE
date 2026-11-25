import { expect, test } from "vitest";

import { uiCopyCatalog } from "./ui-copy";

// `unit` 계층(chat-new-message-pill R2 · R6 · R8): 「새 메시지 ↓」 알약 문구가 모든 언어에 있고, 수 · 종류마다 다른 글이며, 영어 밖의
// 언어는 영어를 그대로 두지 않는다. 뜻의 자연스러움은 원어민 검수 몫이다.

test("NP-C1 모든 언어 — 한 개 · 여러 개 · 사진 · 음성 문구, 낭독 둘, 수가 들어감", () => {
  const en = uiCopyCatalog.en.messengerChat?.newMessages;
  for (const [language, copy] of Object.entries(uiCopyCatalog)) {
    const pill = copy.messengerChat?.newMessages;
    expect(pill, language).toBeDefined();
    if (pill === undefined) continue;
    const label = pill.label ?? (() => "");
    const lines = [
      label({ count: 1, latest: "message" }),
      label({ count: 3, latest: "message" }),
      label({ count: 1, latest: "photo" }),
      label({ count: 3, latest: "photo" }),
      label({ count: 1, latest: "voice" }),
      label({ count: 3, latest: "voice" }),
    ];
    expect(
      lines.every((line) => line.trim() !== ""),
      language,
    ).toBe(true);
    expect(new Set(lines).size, language).toBe(lines.length);
    for (const line of [lines[1], lines[3], lines[5]]) expect(line, language).toContain("3");
    expect((pill.jump ?? "").trim(), language).not.toBe("");
    expect((pill.latest ?? "").trim(), language).not.toBe("");
    if (language !== "en" && en !== undefined) {
      expect(pill.jump, language).not.toBe(en.jump);
      expect(lines[0], language).not.toBe(en.label?.({ count: 1, latest: "message" }));
    }
  }
});

test("NP-C2 영어 문구 — 시안 그대로", () => {
  const pill = uiCopyCatalog.en.messengerChat?.newMessages;
  expect(pill?.label?.({ count: 1, latest: "message" })).toBe("New message");
  expect(pill?.label?.({ count: 3, latest: "message" })).toBe("3 new messages");
  expect(pill?.label?.({ count: 3, latest: "photo" })).toBe("Sent a photo · 3 new");
  expect(pill?.label?.({ count: 1, latest: "voice" })).toBe("Sent a voice message");
  expect(pill?.jump).toBe("Jump to new messages");
  expect(pill?.latest).toBe("Scroll to latest");
});
