import { describe, expect, test } from "vitest";

import { withoutMovedCopies } from "./chat-media-relocate";
import { collapseMediaResults, placeMediaLine } from "./chat-media-rules";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(GD-U1 ~ U4, 가이드 예시 두 장 · #648 뒤): 결과 줄 id는 `<대상>~<종류>~<media id>`다. 같은 매체를 서버가 다른 메시지에
// 붙였다고 알려 오면(받기 응답 · 다시 읽은 행 · 운영 정리로 옮긴 예시) 옛 대상 아래 줄을 빼고 새 대상 아래 한 줄만 남긴다.

const G = "11111111-1111-4111-8111-111111111111"; // 첫 인사
const R = "22222222-2222-4222-8222-222222222222"; // 가이드 도중 응답
const U = "55555555-5555-4555-8555-555555555555"; // 학습자 답
const M = "33333333-3333-4333-8333-333333333333"; // 예시 사진 media id
const M2 = "66666666-6666-4666-8666-666666666666";

const say = (owner: string, at: number): ChatMessage => ({
  id: `${owner}#0`,
  at,
  kind: "text",
  from: "them",
  text: { ko: "말", en: "" },
});
const mine: ChatMessage = { id: U, at: 2, kind: "text", from: "me", text: { ko: "답", en: "" } };
const photo = (owner: string, media: string, at = 5): ChatMessage => ({
  id: `${owner}~snapshot~${media}`,
  at,
  kind: "photo",
  imageUrl: `https://signed/${media}.png`,
});
/** 방에 줄을 놓는 것과 같은 순서 — 옮긴 사본 빼기 → 대상 뒤에 놓기 → 같은 대상 결과 접기. */
const put = (log: readonly ChatMessage[], line: ChatMessage) =>
  collapseMediaResults(placeMediaLine(withoutMovedCopies(log, line), line));

describe("GD 같은 매체는 한 줄", () => {
  test("GD-U1 응답 아래 예시 사진이 있는데 같은 사진이 첫 인사 아래로 오면 첫 인사 아래 한 장만 남는다", () => {
    const log = [say(G, 1), mine, say(R, 3), photo(R, M)];
    expect(put(log, photo(G, M)).map((m) => m.id)).toEqual([
      `${G}#0`,
      `${G}~snapshot~${M}`,
      U,
      `${R}#0`,
    ]);
  });

  test("GD-U2 음성도 같다 — 같은 음성 media id는 한 줄", () => {
    const voice = (owner: string): ChatMessage => ({
      id: `${owner}~voice~${M}`,
      at: 5,
      kind: "voice",
      durationMs: 0,
      text: { ko: "말", en: "" },
    });
    const log = [say(G, 1), mine, say(R, 3), voice(R)];
    expect(withoutMovedCopies(log, voice(G)).map((m) => m.id)).toEqual([`${G}#0`, U, `${R}#0`]);
  });

  test("GD-U3 다른 매체 · 같은 대상 · 다른 종류의 같은 id는 그대로", () => {
    const log = [say(G, 1), photo(G, M2), say(R, 3), photo(R, M2, 6)];
    // 다른 media id(M)는 어느 줄도 빼지 않는다.
    expect(withoutMovedCopies(log, photo(G, M))).toEqual(log);
    // 같은 대상의 같은 줄(그 자리 교체)은 빼지 않는다.
    expect(withoutMovedCopies([say(G, 1), photo(G, M)], photo(G, M))).toEqual([
      say(G, 1),
      photo(G, M),
    ]);
    // 사진과 음성이 같은 media id여도(있을 수 없지만) 종류가 다르면 그대로.
    const voice: ChatMessage = {
      id: `${R}~voice~${M}`,
      at: 5,
      kind: "voice",
      durationMs: 0,
      text: { ko: "말", en: "" },
    };
    expect(withoutMovedCopies([say(R, 3), voice], photo(G, M))).toEqual([say(R, 3), voice]);
  });

  test("GD-U4 자리표시자(req) · 회색 줄(x번호)은 대상이 달라도 건드리지 않는다", () => {
    const pending: ChatMessage = { id: `${R}~snapshot~req`, at: 4, kind: "photo-pending" };
    const notice: ChatMessage = {
      id: `${R}~snapshot~x1`,
      at: 5,
      kind: "media-notice",
      media: "photo",
      notice: "sample-gift",
      until: null,
    };
    const log = [say(R, 3), pending, notice];
    const gift: ChatMessage = { ...notice, id: `${G}~snapshot~x1` };
    expect(withoutMovedCopies(log, gift)).toEqual(log);
    expect(withoutMovedCopies(log, { ...pending, id: `${G}~snapshot~req` })).toEqual(log);
  });
});
