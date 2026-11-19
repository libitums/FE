import { describe, expect, test } from "vitest";

import { messengerChatSuggestedEn } from "./ui-copy-en-chat-suggested";
import { messengerChatSuggestedEs } from "./ui-copy-es-chat-suggested";
import { messengerChatSuggestedId } from "./ui-copy-id-chat-suggested";
import { messengerChatSuggestedJa } from "./ui-copy-ja-chat-suggested";
import { messengerChatSuggestedVi } from "./ui-copy-vi-chat-suggested";

// `unit` 계층(FPC-U1 · U2): 프로필 시트 추가분 문구(ADR-0164 앱 추가 2026-11-20) — 다섯 언어 모두 빈 칸 없이, 이름을 싣는 문구는 이름을
// 담는다. 언어마다 en을 그대로 베끼지 않았다(th · my는 en을 씀 — ADR-0158).

const tables = {
  en: messengerChatSuggestedEn,
  es: messengerChatSuggestedEs,
  id: messengerChatSuggestedId,
  ja: messengerChatSuggestedJa,
  vi: messengerChatSuggestedVi,
} as const;

const texts = (copy: typeof messengerChatSuggestedEn): readonly string[] => {
  const { voice } = copy.profile;
  return [voice.hear, voice.pause, voice.resume, voice.unavailable];
};

describe("FPC-U1 빈 칸 없음 · 이름", () => {
  test.each(Object.entries(tables))("%s", (_language, copy) => {
    for (const text of texts(copy)) expect(text.trim(), text).not.toBe("");
    expect(copy.profile.openProfile("서연")).toContain("서연");
    expect(copy.profile.voice.label("서연")).toContain("서연");
  });
});

describe("FPC-U2 번역됨", () => {
  test.each(Object.entries(tables).filter(([language]) => language !== "en"))(
    "%s는 en과 다르다",
    (_language, copy) => {
      expect(texts(copy)).not.toEqual(texts(messengerChatSuggestedEn));
      expect(copy.profile.openProfile("서연")).not.toBe(
        messengerChatSuggestedEn.profile.openProfile("서연"),
      );
    },
  );
});
