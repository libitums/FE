import { describe, expect, test } from "vitest";

import type { EpisodeChat } from "../../lib/episode-content.model";
import { storyChatViewOf, storyReplyRomanizationOf } from "./story-messenger";

// `unit` 계층(ADR-0188 D3): 메신저 막간의 로마자 원천(채움) · 답장 보기 아래 줄만 봅니다.

describe("storyChatViewOf — 로마자", () => {
  const chat: EpisodeChat = {
    counterpart: "미나",
    turns: [
      {
        kind: "message",
        speaker: "미나",
        line: { ko: "{name} 씨, 어디예요?", roman: "{name} ssi, eodiyeyo?", en: "Where are you?" },
      },
      { kind: "reply", options: [{ ko: "몰라요", roman: "mollayo", en: "No idea" }] },
      { kind: "message", speaker: "미나", line: { ko: "여기!", roman: "  " } },
    ],
  };
  const port = {
    imageUrlOf: () => null,
    fill: (text: string, script: string) =>
      text.replace("{name}", script === "ko" ? "알렉스" : "Alex"),
  };

  test("SM-R1. 콘텐츠 로마자를 로마자 스크립트로 채워 싣고, 비었으면 키가 없다", () => {
    const view = storyChatViewOf(chat, port);
    const [first, reply, last] = view.turns;
    expect(first.kind === "message" ? first.text : null).toEqual({
      ko: "알렉스 씨, 어디예요?",
      roman: "Alex ssi, eodiyeyo?",
      en: "Where are you?",
    });
    expect(reply?.kind === "reply" ? reply.options[0] : null).toEqual({
      ko: "몰라요",
      roman: "mollayo",
      en: "No idea",
    });
    expect(last?.kind === "message" ? last.text : null).toEqual({ ko: "여기!", en: "" });
  });
});

describe("storyReplyRomanizationOf", () => {
  const pronunciation = (roman: string) => `Pronunciation: ${roman}`;

  test("SM-R2. 켬이면 읽기와 낭독(Pronunciation 접두), 콘텐츠 로마자가 없으면 변환한다", () => {
    expect(
      storyReplyRomanizationOf(
        { ko: "몰라요", roman: "mollayo", en: "No idea" },
        "shown",
        pronunciation,
      ),
    ).toEqual({ text: "mollayo", spoken: "Pronunciation: mollayo" });
    expect(
      storyReplyRomanizationOf({ ko: "같이 가요", en: "Let's go" }, "shown", pronunciation),
    ).toEqual({ text: "gachi gayo", spoken: "Pronunciation: gachi gayo" });
  });

  test("SM-R3. 끔이면 없음(이 변경 전), 한글이 없어도 없음", () => {
    expect(
      storyReplyRomanizationOf(
        { ko: "몰라요", roman: "mollayo", en: "No idea" },
        "hidden",
        pronunciation,
      ),
    ).toBeNull();
    expect(storyReplyRomanizationOf({ ko: "OK", en: "OK" }, "shown", pronunciation)).toBeNull();
  });
});
