import { describe, expect, test } from "vitest";

import { mediaLineId, mediaTargetOf } from "./chat-media-rules";
import {
  isSampleLine,
  samplePrefixOf,
  sampleLineOf,
  sampleRevealAction,
  sampleTargetOf,
} from "./chat-sample-target";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(GS-U1 ~ U6, ADR-0146 개정 ⟨예시 대상⟩): 무료 예시는 첫 인사에 맞춘 고정 파일이라 대상이 첫 인사다 — 가이드 도중
// 답이 이어져도 가장 최근 응답에 붙지 않는다. 유료 대상 규칙(가장 최근)은 그대로다.

const G = "11111111-1111-4111-8111-111111111111"; // 첫 인사
const R = "22222222-2222-4222-8222-222222222222"; // 답에 대한 응답
const P = "33333333-3333-4333-8333-333333333333"; // 첫 인사보다 먼저 선 선톡
const M = "44444444-4444-4444-8444-444444444444";

const say = (id: string, ko: string, en = ""): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko, en },
});
const action = (id: string, ko: string): ChatMessage => ({
  id,
  at: 1,
  kind: "action",
  text: { ko, en: "" },
});
const mine = (id: string): ChatMessage => ({
  id,
  at: 2,
  kind: "text",
  from: "me",
  text: { ko: "학습자 답", en: "" },
});

// 재현(이슈 #648): [첫 인사, 학습자 답, 응답].
const replied: ChatMessage[] = [
  say(`${G}#0`, "안녕하세요!", "Hi!"),
  say(`${G}#1`, "저는 덕수예요.", "I'm Duksu."),
  mine("u1"),
  say(`${R}#0`, "답에 대한 응답"),
];

describe("sampleTargetOf", () => {
  test("GS-U1 응답이 이어진 로그 — 사진 · 음성 모두 첫 인사가 대상이고 자막도 첫 인사 글이다", () => {
    for (const media of ["photo", "voice"] as const) {
      const target = sampleTargetOf(replied, media, G);
      expect(target?.messageId, media).toBe(G);
      expect(target?.text, media).toEqual({
        ko: "안녕하세요! 저는 덕수예요.",
        en: "Hi! I'm Duksu.",
      });
    }
    // 유료 대상 규칙은 그대로 가장 최근이다.
    expect(mediaTargetOf(replied, "photo")?.messageId).toBe(R);
  });

  test("GS-U2 첫 인사가 첫 캐릭터 메시지가 아니어도(앞에 선톡) 첫 인사를 고른다", () => {
    const log = [say(`${P}#0`, "선톡"), ...replied];
    expect(sampleTargetOf(log, "photo", G)?.messageId).toBe(G);
  });

  test("GS-U3 첫 인사를 모르거나 로그에 없으면 그 방의 첫 캐릭터 메시지", () => {
    expect(sampleTargetOf(replied, "photo", null)?.messageId).toBe(G);
    const gone = replied.filter((m) => !m.id.startsWith(G));
    expect(sampleTargetOf([say(`${P}#0`, "선톡"), ...gone], "voice", G)?.messageId).toBe(P);
  });

  test("GS-U4 캐릭터 메시지가 없으면 null, 음성은 말 조각이 없으면 null(예시 단계가 서지 않음)", () => {
    expect(sampleTargetOf([], "photo", null)).toBeNull();
    expect(sampleTargetOf([mine("u1")], "voice", G)).toBeNull();
    const onlyAction = [action(`${G}#0`, "*손을 흔든다*"), mine("u1"), say(`${R}#0`, "응답")];
    expect(sampleTargetOf(onlyAction, "voice", G)).toBeNull();
    expect(sampleTargetOf(onlyAction, "photo", G)?.messageId).toBe(G);
  });
});

describe("예시 줄", () => {
  const prefixes = [samplePrefixOf(G, "photo")];
  const pending: ChatMessage = {
    id: mediaLineId(G, "photo", "req"),
    at: 3,
    kind: "photo-pending",
    startedAt: 3,
  };
  const photo: ChatMessage = {
    id: mediaLineId(G, "photo", M),
    at: 4,
    kind: "photo",
    imageUrl: null,
  };
  const gift: ChatMessage = {
    id: mediaLineId(G, "photo", "x1"),
    at: 4,
    kind: "media-notice",
    media: "photo",
    notice: "sample-gift",
    until: null,
  };

  test("GS-U5 예시 줄(대기 · 결과 · 회색 줄)만 예시로 읽고, 가장 최근 받은 예시의 사진 · 음성 줄을 찾는다", () => {
    expect(isSampleLine(pending.id, prefixes)).toBe(true);
    expect(isSampleLine(gift.id, prefixes)).toBe(true);
    expect(isSampleLine(mediaLineId(R, "photo", "req"), prefixes)).toBe(false);
    expect(isSampleLine(mediaLineId(G, "voice", "req"), prefixes)).toBe(false);
    expect(isSampleLine(pending.id, undefined)).toBe(false);

    const head = replied.slice(0, 2);
    const tail = replied.slice(2);
    expect(sampleLineOf([...head, pending, ...tail], prefixes)).toEqual({
      id: pending.id,
      media: "photo",
      pending: true,
    });
    expect(sampleLineOf([...head, photo, gift, ...tail], prefixes)).toEqual({
      id: photo.id,
      media: "photo",
      pending: false,
    });
    const voice: ChatMessage = {
      id: mediaLineId(G, "voice", "req"),
      at: 5,
      kind: "voice-pending",
      startedAt: 5,
    };
    const both = [...prefixes, samplePrefixOf(G, "voice")];
    expect(sampleLineOf([...head, photo, gift, voice, ...tail], both)?.id).toBe(voice.id);
    expect(sampleLineOf(replied, prefixes)).toBeNull();
    expect(sampleLineOf([...head, photo], undefined)).toBeNull();
  });

  test("GS-U6 보여 주는 방법 — 끝에 있거나 앞 예시로 옮겨 둔 채면 스크롤, 위로 읽는 중이면 결과에 알약 · 대기에는 아무것도", () => {
    expect(sampleRevealAction({ nearEnd: true, parked: false, pending: true })).toBe("scroll");
    expect(sampleRevealAction({ nearEnd: true, parked: false, pending: false })).toBe("scroll");
    expect(sampleRevealAction({ nearEnd: false, parked: true, pending: false })).toBe("scroll");
    expect(sampleRevealAction({ nearEnd: false, parked: false, pending: false })).toBe("pill");
    expect(sampleRevealAction({ nearEnd: false, parked: false, pending: true })).toBe("none");
  });
});
