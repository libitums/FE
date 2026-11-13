import { describe, expect, test } from "vitest";

import { createEntranceTracker } from "./chat-entrance";
import type { ChatMessage } from "./chat-source.contract";

// `unit` 계층(MM-U1 ~ U4): 말풍선 등장 판정 — 처음 나타나는 글만, 불러오기 · 첫 판 · id만 바뀐 내 글은 움직이지 않는다.

const them = (id: string, at = 1): ChatMessage => ({
  id,
  at,
  kind: "text",
  from: "them",
  text: { ko: "안녕", en: "Hi" },
});
const me = (id: string, at: number): ChatMessage => ({
  id,
  at,
  kind: "text",
  from: "me",
  text: { ko: "네", en: "Yes" },
});

describe("createEntranceTracker", () => {
  test("MM-U1 방을 열 때 있던 글은 움직이지 않고, 뒤에 하나씩 오는 글은 상대 · 내 쪽으로 움직인다", () => {
    const t = createEntranceTracker();
    expect(t.entrancesOf([them("a")]).get("a")).toBeNull();
    const after = t.entrancesOf([them("a"), me("m1", 10), them("b", 11)]);
    expect(after.get("m1")).toBe("me");
    expect(after.get("b")).toBe("them");
  });

  test("MM-U2 한 번에 셋 이상 들어오면(기록 불러오기) 움직이지 않는다", () => {
    const t = createEntranceTracker();
    t.entrancesOf([]);
    const loaded = t.entrancesOf([them("a"), them("b"), them("c")]);
    expect([...loaded.values()]).toEqual([null, null, null]);
  });

  test("MM-U3 내 글의 id가 임시 → 서버 id로 바뀌어도 다시 움직이지 않는다", () => {
    const t = createEntranceTracker();
    t.entrancesOf([]);
    expect(t.entrancesOf([me("local-1", 50)]).get("local-1")).toBe("me");
    expect(t.entrancesOf([me("server-9", 50)]).get("server-9")).toBeNull();
  });

  test("MM-U4 한 번 정한 값은 다시 넘겨도 그대로다", () => {
    const t = createEntranceTracker();
    t.entrancesOf([]);
    t.entrancesOf([them("x")]);
    expect(t.entrancesOf([them("x")]).get("x")).toBe("them");
    expect(t.entrancesOf([them("x"), them("y")]).get("x")).toBe("them");
  });
});
