import { describe, expect, test } from "vitest";

import {
  actionSpoken,
  correctionOf,
  greetingFrom,
  historyFrom,
  ideasOf,
  noticeKindOf,
  segmentText,
  sendFailureOf,
} from "./companion-parse";
import { companionSeed, COMPANION_CHARACTERS } from "./companion-roster";

// `unit` 계층(SS-U1 ~ U9): 컴패니언 서버 JSON → 앱 모양 · 인물 표(ADR-0137).

const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";
const N1 = "33333333-3333-4333-8333-333333333333";
const H1 = "44444444-4444-4444-8444-444444444444";

const card = {
  userMessageId: U1,
  status: "ok",
  kind: "correction",
  original: "저 커피 좋아해요",
  corrected: "저는 커피를 좋아해요",
  items: [{ original: "저", corrected: "저는", reason: "Add 는." }],
  better: null,
  meaning: "I like coffee.",
};

// 서버는 최신이 앞입니다.
const page = {
  messages: [
    {
      id: A1,
      role: "assistant",
      origin: "turn",
      status: "complete",
      hidden: false,
      text: null,
      inputMode: null,
      segments: [
        { kind: "speech", text: "저도요!", translation: "Me too!" },
        { kind: "action", text: "웃는다", translation: "smiles" },
      ],
      notice: null,
      feedback: null,
      suggestions: [{ text: "뭐 마셔요?", meaning: "What do you drink?", intent: "ask" }],
      createdAt: "2026-11-12T10:00:02.000Z",
    },
    {
      id: H1,
      role: "assistant",
      origin: "turn",
      status: "complete",
      hidden: true,
      text: null,
      inputMode: null,
      segments: [],
      notice: null,
      feedback: null,
      createdAt: "2026-11-12T10:00:01.500Z",
    },
    {
      id: U1,
      role: "user",
      origin: "turn",
      status: "complete",
      hidden: false,
      text: "저 커피 좋아해요",
      inputMode: "text",
      segments: [],
      notice: null,
      feedback: card,
      createdAt: "2026-11-12T10:00:01.000Z",
    },
    {
      id: N1,
      role: "notice",
      origin: "turn",
      status: "complete",
      hidden: false,
      text: null,
      inputMode: null,
      segments: [],
      notice: { kind: "ai_disclosure" },
      feedback: null,
      createdAt: "2026-11-12T10:00:00.000Z",
    },
  ],
  hasMore: false,
};

describe("말풍선 · 고지 · 교정 · 칩", () => {
  test("SS-U1 말은 그대로, 행동 · 서술은 *…*(번역은 그대로), 번역이 없으면 빈 줄", () => {
    expect(segmentText({ kind: "speech", text: "안녕", translation: "Hi" })).toEqual({
      ko: "안녕",
      en: "Hi",
    });
    expect(segmentText({ kind: "action", text: "웃는다", translation: "smiles" })).toEqual({
      ko: "*웃는다*",
      en: "smiles",
    });
    expect(segmentText({ kind: "narration", text: "비가 온다", translation: "" })).toEqual({
      ko: "*비가 온다*",
      en: "",
    });
  });

  test("SS-U12 지문 낭독은 앞뒤 별표만 뗀다 — 여러 줄 · 별표 하나 · 가운데 별표(정규식 없이, 기기 엔진)", () => {
    expect(actionSpoken({ ko: "*웃는다*", en: "*smiles*" }, "덕수쌤")).toBe(
      "덕수쌤: 웃는다, smiles",
    );
    expect(actionSpoken({ ko: "*고개를\n끄덕인다*", en: "" }, "덕수쌤")).toBe(
      "덕수쌤: 고개를\n끄덕인다",
    );
    expect(actionSpoken({ ko: "*", en: "" }, "덕수쌤")).toBe("덕수쌤: *");
    expect(actionSpoken({ ko: "a*b", en: "" }, "덕수쌤")).toBe("덕수쌤: a*b");
  });

  test("SS-U2 고지 kind 대응, 모르면 null", () => {
    expect(noticeKindOf("ai_disclosure")).toBe("ai-disclosure");
    expect(noticeKindOf("minor_notice")).toBe("minor-notice");
    expect(noticeKindOf("break_reminder")).toBe("break-reminder");
    expect(noticeKindOf("other")).toBeNull();
  });

  test("SS-U3 교정 카드는 ok · kind · corrected가 있을 때만, 바뀐 곳은 앞뒤 같은 글자를 뺀 범위", () => {
    expect(correctionOf(card)).toEqual({
      kind: "correction",
      corrected: "저는 커피를 좋아해요",
      changes: [{ start: 1, end: 6 }],
      items: [{ original: "저", corrected: "저는", reason: "Add 는." }],
      better: null,
      meaning: "I like coffee.",
    });
    expect(correctionOf({ ...card, status: "none", kind: null, corrected: null })).toBeNull();
    expect(correctionOf({ ...card, items: "x" })).toBeNull();
    expect(correctionOf(null)).toBeNull();
  });

  test("SS-U4 칩 → 보기(로마자 없음 · 뜻이 없으면 빈 줄), 틀린 칩은 버림", () => {
    expect(
      ideasOf([
        { text: "뭐 해요?", meaning: "What are you doing?", intent: "ask" },
        { text: "", meaning: null, intent: "ask" },
        { text: "좋아요", meaning: null, intent: "reflect" },
      ]),
    ).toEqual([
      { ko: "뭐 해요?", roman: "", en: "What are you doing?" },
      { ko: "좋아요", roman: "", en: "" },
    ]);
    expect(ideasOf(null)).toBeNull();
  });
});

describe("기록 · 인사", () => {
  test("SS-U5 기록: 오래된 것부터, 숨김은 빼고, 캐릭터 말은 말풍선마다, 교정 · 칩", () => {
    const history = historyFrom(JSON.stringify(page));
    expect(history?.messages.map((m) => m.kind)).toEqual(["notice", "text", "text", "action"]);
    expect(history?.messages[0]).toMatchObject({ id: N1, kind: "notice", notice: "ai-disclosure" });
    expect(history?.messages[1]).toMatchObject({
      id: U1,
      from: "me",
      text: { ko: "저 커피 좋아해요", en: "" },
      at: Date.parse("2026-11-12T10:00:01.000Z"),
    });
    expect(history?.messages[2]).toMatchObject({
      id: `${A1}#0`,
      from: "them",
      text: { ko: "저도요!", en: "Me too!" },
    });
    expect(history?.messages[3]).toMatchObject({
      id: `${A1}#1`,
      kind: "action",
      text: { ko: "*웃는다*", en: "smiles" },
    });
    expect(history?.corrections[U1]?.corrected).toBe("저는 커피를 좋아해요");
    expect(history?.ideas).toEqual([{ ko: "뭐 마셔요?", roman: "", en: "What do you drink?" }]);
  });

  test("SS-U6 기록: 본문이 틀리면 null, 빈 목록이면 빈 기록", () => {
    expect(historyFrom(null)).toBeNull();
    expect(historyFrom("not json")).toBeNull();
    expect(historyFrom(JSON.stringify({ messages: "x" }))).toBeNull();
    expect(historyFrom(JSON.stringify({ messages: [], hasMore: false }))).toEqual({
      messages: [],
      corrections: {},
      ideas: null,
    });
  });

  test("SS-U7 인사: ok면 말풍선 · 칩, 아니면 null", () => {
    const ok = greetingFrom(
      JSON.stringify({
        status: "ok",
        messageId: A1,
        segments: [{ kind: "speech", text: "안녕하세요!", translation: "Hello!" }],
        suggestions: {
          messageId: A1,
          status: "ok",
          items: [{ text: "안녕하세요", meaning: "Hello", intent: "reflect" }],
        },
      }),
      1_000,
    );
    expect(ok?.messages).toEqual([
      {
        id: `${A1}#0`,
        at: 1_000,
        kind: "text",
        from: "them",
        text: { ko: "안녕하세요!", en: "Hello!" },
      },
    ]);
    expect(ok?.ideas).toEqual([{ ko: "안녕하세요", roman: "", en: "Hello" }]);
    expect(
      greetingFrom(JSON.stringify({ status: "none", messageId: null, segments: [] }), 1),
    ).toBeNull();
    expect(greetingFrom("x", 1)).toBeNull();
    // 무료 계정이 체험 인물이 아닌 방을 열면 — 빈 방 대신 까닭 줄(기기 확인 2026-11-12).
    expect(
      greetingFrom(
        JSON.stringify({
          status: "unavailable",
          messageId: null,
          segments: [],
          reason: "not_available",
        }),
        7,
      ),
    ).toEqual({
      messages: [{ id: "greet~not-available", at: 7, kind: "notice", notice: "not-available" }],
      ideas: null,
    });
  });
});

describe("보내기 실패", () => {
  test("SS-U8 사전 오류 본문 → 입력 막힘 · 크레딧 부족 · 그 밖 실패", () => {
    const at = Date.parse("2026-11-12T12:00:00.000Z");
    expect(
      sendFailureOf(
        JSON.stringify({
          error: "temporarily_blocked",
          detail: { until: "2026-11-12T12:30:00.000Z" },
        }),
        0,
      ),
    ).toEqual({ kind: "blocked", until: at + 30 * 60_000 });
    expect(
      sendFailureOf(
        JSON.stringify({
          error: "usage_time_limit",
          detail: { limit: "daily", resetsAt: "2026-11-12T12:00:00.000Z" },
        }),
        0,
      ),
    ).toEqual({ kind: "usage-limit", resetsAt: at });
    expect(sendFailureOf(JSON.stringify({ error: "age_restricted" }), 0)).toEqual({
      kind: "age-restricted",
    });
    expect(sendFailureOf(JSON.stringify({ error: "insufficient_credits" }), 0)).toEqual({
      kind: "no-credits",
    });
    expect(sendFailureOf(JSON.stringify({ error: "trial_exhausted" }), 0)).toEqual({
      kind: "no-credits",
    });
    expect(sendFailureOf(JSON.stringify({ error: "not_available" }), 0)).toEqual({
      kind: "not-available",
    });
    expect(sendFailureOf(JSON.stringify({ error: "internal_error" }), 0)).toEqual({
      kind: "failed",
    });
    // 시각이 없거나 틀리면 지금부터 30분(차단) · 다음 날로 넘기지 않고 지금(상한).
    expect(sendFailureOf(JSON.stringify({ error: "temporarily_blocked" }), 5)).toEqual({
      kind: "blocked",
      until: 5 + 30 * 60_000,
    });
    expect(sendFailureOf(null, 0)).toEqual({ kind: "failed" });
  });
});

describe("인물 표", () => {
  test("SS-U9 서버 인물 다섯 — 덕수쌤만 처음부터 열림, 나머지는 막간 해금 · 방 id = 인물 id", () => {
    expect(COMPANION_CHARACTERS.map((c) => c.id)).toEqual([
      "duksu",
      "yoonkyung",
      "mina",
      "doyun",
      "jaemin",
    ]);
    const seed = companionSeed();
    expect(seed.rooms.map((r) => [r.roomId, r.counterpart.id, r.access])).toEqual([
      ["duksu", "duksu", { kind: "open" }],
      ["yoonkyung", "yoonkyung", { kind: "locked", unlockEpisode: 2 }],
      ["mina", "mina", { kind: "locked", unlockEpisode: 3 }],
      ["doyun", "doyun", { kind: "locked", unlockEpisode: 4 }],
      ["jaemin", "jaemin", { kind: "locked", unlockEpisode: 7 }],
    ]);
    for (const room of seed.rooms) {
      expect(room.messages).toEqual([]);
      expect(room.cannedReplies).toEqual([]);
      expect(room.ideaSets).toEqual([]);
    }
    expect(seed.rooms[2]?.counterpart).toEqual({
      id: "mina",
      name: "미나",
      avatarPath: "content/images/profiles/mina-casual.webp",
    });
  });
});
