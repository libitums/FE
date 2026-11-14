import { describe, expect, test } from "vitest";

import { hasReplyAfter, mergeLog, sameIdeas, serverCopyOf } from "./chat-log-merge";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(ES-U7 ~ U9): 서버 기록과 앱 로그 합치기(ADR-0138).

const them = (id: string, ko: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko, en: "" },
});
const me = (id: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "me",
  text: { ko: id, en: "" },
});
const notice = (id: string): ChatMessage => ({ id, at: 1, kind: "notice", notice: "send-failed" });
const ids = (log: readonly ChatMessage[]) => log.map((m) => m.id);

describe("mergeLog", () => {
  test("ES-U7 같은 id는 서버 판, 서버에만 있는 줄은 서버 순서로", () => {
    const merged = mergeLog(
      [them("a#0", "좋네요! 어디서")],
      [me("u"), them("a#0", "좋네요! 어디서 마셨어요?")],
    );
    expect(ids(merged)).toEqual(["u", "a#0"]);
    expect(merged[1]).toMatchObject({ text: { ko: "좋네요! 어디서 마셨어요?" } });
  });

  test("ES-U8 공통 줄 사이 앱 전용 줄은 그 자리 · 앞 공통 줄이 없으면 뒤 공통 줄 앞 · 마지막 공통 줄 뒤면 끝", () => {
    const local = [me("u1"), notice("n1"), them("a#0", "네"), me("x")];
    const remote = [me("u1"), them("a#0", "네"), them("b#0", "또")];
    expect(ids(mergeLog(local, remote))).toEqual(["u1", "n1", "a#0", "b#0", "x"]);
    expect(ids(mergeLog([notice("n0"), me("u1")], [them("g#0", "안녕"), me("u1")]))).toEqual([
      "g#0",
      "n0",
      "u1",
    ]);
    expect(ids(mergeLog([me("local-1")], [them("g#0", "안녕")]))).toEqual(["g#0", "local-1"]);
  });

  test("ES-U9 빈 쪽", () => {
    expect(ids(mergeLog([], [them("g#0", "안녕")]))).toEqual(["g#0"]);
    expect(ids(mergeLog([me("local-1")], []))).toEqual(["local-1"]);
  });

  test("ES-U12 앱이 만든 턴 고지(내 글~n0)는 서버가 그 턴의 고지를 저장했으면 버린다 — 위기 카드 · 실패 줄은 남긴다(리뷰 C2)", () => {
    const local = [
      me("u1"),
      notice("u1~n0"),
      them("a#0", "네"),
      notice("u1~failed"),
      notice("u1~crisis"),
    ];
    const remote = [me("u1"), notice("srv-notice"), them("a#0", "네")];
    expect(ids(mergeLog(local, remote))).toEqual([
      "u1",
      "srv-notice",
      "a#0",
      "u1~failed",
      "u1~crisis",
    ]);
    expect(ids(mergeLog([me("local-1"), notice("local-1~n0")], []))).toEqual([
      "local-1",
      "local-1~n0",
    ]);
  });

  test("ES-U16 서버가 아직 그 턴의 고지를 넣지 않았으면 앱 고지를 남긴다(리뷰 N3)", () => {
    const local = [me("u1"), notice("u1~n0"), them("a#0", "네")];
    expect(ids(mergeLog(local, [me("u1")]))).toEqual(["u1", "u1~n0", "a#0"]);
    // 다음 내 글의 고지는 이 턴 것이 아니다.
    expect(ids(mergeLog(local, [me("u1"), me("u2"), notice("n2")]))).toContain("u1~n0");
  });
});

describe("서버 판 찾기 · 답 · 보기", () => {
  const at = (m: ChatMessage, t: number): ChatMessage => ({ ...m, at: t });
  test("ES-U13 보내지 못한 글의 서버 판 — 같은 글 · 2분 안 · 이미 보이는 id는 아님", () => {
    const said = (id: string, ko: string, t: number): ChatMessage => ({
      id,
      at: t,
      kind: "text",
      from: "me",
      text: { ko, en: "" },
    });
    const local = said("local-1", "local-1", 10_000);
    const remote = [said("srv-1", "local-1", 12_000)];
    expect(serverCopyOf(local, remote, new Set(["local-1"]))).toBe("srv-1");
    expect(serverCopyOf(local, remote, new Set(["local-1", "srv-1"]))).toBeNull();
    expect(serverCopyOf(at(local, 500_000), remote, new Set())).toBeNull();
    expect(serverCopyOf(said("local-1", "다른 글", 10_000), remote, new Set())).toBeNull();
  });

  test("ES-U14 서버 판 뒤에 캐릭터 말이 있나 · 보기 내용 비교", () => {
    expect(hasReplyAfter([me("s"), them("a#0", "네")], "s")).toBe(true);
    expect(hasReplyAfter([them("a#0", "네"), me("s")], "s")).toBe(false);
    expect(hasReplyAfter([me("s"), notice("n")], "s")).toBe(true); // 답 없이 끝난 턴(리뷰 N2)
    const a = [{ ko: "네", roman: "", en: "Yes" }];
    expect(sameIdeas(a, [{ ko: "네", roman: "", en: "Yes" }])).toBe(true);
    expect(sameIdeas(a, [{ ko: "네", roman: "", en: "OK" }])).toBe(false);
    expect(sameIdeas(null, null)).toBe(true);
    expect(sameIdeas(a, null)).toBe(false);
  });
});
