import { describe, expect, test } from "vitest";

import { collapseMediaResults } from "./chat-media-rules";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(AL-U6): 방에서는 같은 메시지 · 같은 종류의 결과가 최신 하나만, 옛 결과 자리에 선다(ADR-0150 M7).

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const bubble = (owner: string, at: number): ChatMessage => ({
  id: `${owner}#0`,
  at,
  kind: "text",
  from: "them",
  text: { ko: "말", en: "" },
});
const photo = (owner: string, media: string, at: number): ChatMessage => ({
  id: `${owner}~snapshot~${media}`,
  at,
  kind: "photo",
  imageUrl: `u-${media}`,
});

describe("AL-U6 결과 줄 접기", () => {
  test("AL-U6a 새 사진이 옛 사진 자리에 서고 옛 사진은 빠진다", () => {
    const log = [bubble(A, 1), photo(A, "m1", 2), bubble(B, 3), photo(A, "m2", 9)];
    expect(collapseMediaResults(log).map((m) => m.id)).toEqual([
      `${A}#0`,
      `${A}~snapshot~m2`,
      `${B}#0`,
    ]);
  });

  test("AL-U6b 자리표시자 · 회색 줄 · 다른 종류 · 다른 메시지는 그대로", () => {
    const log: ChatMessage[] = [
      bubble(A, 1),
      photo(A, "m1", 2),
      { id: `${A}~voice~v1`, at: 3, kind: "voice", durationMs: 0, text: { ko: "말", en: "" } },
      { id: `${A}~snapshot~req`, at: 4, kind: "photo-pending" },
      {
        id: `${A}~snapshot~x1`,
        at: 5,
        kind: "media-notice",
        media: "photo",
        notice: "failed",
        until: null,
      },
      photo(B, "m3", 6),
    ];
    expect(collapseMediaResults(log)).toEqual(log);
  });

  test("AL-U6c 같은 메시지 음성도 최신 하나(at이 같으면 뒤에 선 것)", () => {
    const voice = (media: string, at: number): ChatMessage => ({
      id: `${A}~voice~${media}`,
      at,
      kind: "voice",
      durationMs: 0,
      text: { ko: "말", en: "" },
    });
    const log = [bubble(A, 1), voice("v1", 5), voice("v2", 5)];
    expect(collapseMediaResults(log).map((m) => m.id)).toEqual([`${A}#0`, `${A}~voice~v2`]);
  });
});
