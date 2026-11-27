import { describe, expect, test } from "vitest";

import type { ChatReplyIdea } from "./chat-source.contract";
import { shouldOpenHeldIdeas } from "./use-auto-ideas";

// `unit` 계층(GA-U1 ~ U5, ADR-0137 · 0190 개정 2026-11-28): 방 안내가 서 있는 동안 새로 온 보기는 판을 열지 않고 미뤄 두고,
// 안내가 끝났을 때 같은 묶음 · 쓰던 글 없음 · 추천 답변 켬이면 그때 연다.

const a: readonly ChatReplyIdea[] = [{ ko: "안녕하세요", roman: "annyeonghaseyo", en: "Hello" }];
const b: readonly ChatReplyIdea[] = [{ ko: "네", roman: "ne", en: "Yes" }];
const base = { held: a, ideas: a, text: "", ideasOpen: false, enabled: true } as const;

describe("shouldOpenHeldIdeas — 안내 끝에 미룬 보기 열기", () => {
  test("GA-U1 미룬 묶음이 지금 묶음과 같고 쓰던 글 없음 · 판 닫힘 · 추천 답변 켬이면 연다", () => {
    expect(shouldOpenHeldIdeas(base)).toBe(true);
  });

  test("GA-U2 미룬 것이 없거나 묶음이 바뀌었거나 사라졌으면 열지 않는다", () => {
    expect(shouldOpenHeldIdeas({ ...base, held: null })).toBe(false);
    expect(shouldOpenHeldIdeas({ ...base, ideas: b })).toBe(false);
    expect(shouldOpenHeldIdeas({ ...base, ideas: null })).toBe(false);
  });

  test("GA-U3 쓰던 글이 있으면 열지 않는다(공백만이면 쓰던 글이 아니다)", () => {
    expect(shouldOpenHeldIdeas({ ...base, text: "안녕" })).toBe(false);
    expect(shouldOpenHeldIdeas({ ...base, text: "  " })).toBe(true);
  });

  test("GA-U4 추천 답변을 껐으면 열지 않는다", () => {
    expect(shouldOpenHeldIdeas({ ...base, enabled: false })).toBe(false);
  });

  test("GA-U5 이미 열려 있으면 다시 열지 않는다", () => {
    expect(shouldOpenHeldIdeas({ ...base, ideasOpen: true })).toBe(false);
  });
});
