import { describe, expect, test } from "vitest";

import type { RankingBoard, RankingRow } from "../../lib/ranking.contract";
import {
  chatStripOf,
  daysLeft,
  flagOf,
  medalOf,
  moreToTopThree,
  shownEndsAt,
  weekEndsAt,
  rankingViewOf,
  zoneBefore,
} from "./ranking-rules";

// `unit` 계층(ADR-0170 RK-U1 ~ U6): 순위 화면의 순수 규칙.

const row = (rank: number, me = false): RankingRow => ({
  rank,
  name: `P${rank}`,
  countryCode: "VN",
  episode: 3,
  score: 40 - rank,
  me,
});

const board: RankingBoard = {
  kind: "chat-words",
  groupSize: 24,
  endsAt: "2026-11-23T00:00:00Z",
  reward: null,
  rows: [row(1), row(2), row(3), row(4), row(5, true)],
  me: { rank: 5, score: 35 },
  next: { name: "P4", more: 2 },
};

describe("ranking-rules", () => {
  test("RK-U1. 1 ~ 3위만 메달(금 · 은 · 동), 그 밖은 null", () => {
    expect([1, 2, 3, 4, 0].map(medalOf)).toEqual(["gold", "silver", "bronze", null, null]);
  });

  test("RK-U2. 남은 날은 올림이고 최소 1, 틀린 시각이면 1", () => {
    const end = "2026-11-23T00:00:00Z";
    const at = (iso: string) => Date.parse(iso);
    expect(daysLeft(end, at("2026-11-20T00:00:00Z"))).toBe(3);
    expect(daysLeft(end, at("2026-11-20T00:00:01Z"))).toBe(3);
    expect(daysLeft(end, at("2026-11-19T23:59:59Z"))).toBe(4);
    expect(daysLeft(end, at("2026-11-22T23:00:00Z"))).toBe(1);
    expect(daysLeft(end, at("2026-11-24T00:00:00Z"))).toBe(1);
    expect(daysLeft("nope", at("2026-11-20T00:00:00Z"))).toBe(1);
  });

  test("RK-U3. 국기는 지역 표시 글자 둘, 틀린 코드 · null은 빈 글", () => {
    expect(flagOf("VN")).toBe("\u{1F1FB}\u{1F1F3}");
    expect(flagOf("KR")).toBe("\u{1F1F0}\u{1F1F7}");
    expect(flagOf("vn")).toBe("");
    expect(flagOf("VNM")).toBe("");
    expect(flagOf(null)).toBe("");
  });

  test("RK-U4. 구역 줄 — 첫 줄 앞 top, 순위 4 이상의 첫 줄 앞 climb, 나머지 null", () => {
    const rows = board.rows;
    expect(rows.map((_, index) => zoneBefore(rows, index))).toEqual([
      "top",
      null,
      null,
      "climb",
      null,
    ]);
    // 4위 아래만 있는 그룹(모두 climb 쪽)이면 첫 줄 앞 top 대신 climb.
    expect(zoneBefore([row(4), row(5)], 0)).toBe("climb");
    expect(zoneBefore([], 0)).toBeNull();
  });

  test("RK-U5. 화면 상태 — 비회원 → guest(서버 안 봄), 오프라인 → offline, 읽는 중 → loading, 결과 그대로", () => {
    const ready = { status: "ready", board } as const;
    expect(rankingViewOf({ account: "guest", offline: true, load: ready })).toEqual({
      kind: "guest",
    });
    expect(rankingViewOf({ account: "signed-in", offline: true, load: null })).toEqual({
      kind: "offline",
    });
    expect(rankingViewOf({ account: "signed-in", offline: false, load: null })).toEqual({
      kind: "loading",
    });
    expect(rankingViewOf({ account: "signed-in", offline: true, load: ready })).toEqual({
      kind: "ready",
      board,
    });
    expect(
      rankingViewOf({
        account: "signed-in",
        offline: false,
        load: { status: "not-joined", endsAt: board.endsAt },
      }),
    ).toEqual({ kind: "not-joined", endsAt: board.endsAt });
    expect(
      rankingViewOf({ account: "signed-in", offline: false, load: { status: "hidden" } }),
    ).toEqual({ kind: "hidden" });
    expect(
      rankingViewOf({ account: "signed-in", offline: false, load: { status: "error" } }),
    ).toEqual({ kind: "error" });
    expect(
      rankingViewOf({ account: "signed-in", offline: true, load: { status: "error" } }),
    ).toEqual({ kind: "offline" });
  });

  test("RK-U6. 방 줄 값 — 채팅 단어 보드가 ready일 때만 {words, rank}", () => {
    expect(chatStripOf({ status: "ready", board })).toEqual({ words: 35, rank: 5 });
    expect(chatStripOf({ status: "ready", board: { ...board, kind: "lessons" } })).toBeNull();
    expect(chatStripOf({ status: "hidden" })).toBeNull();
    expect(chatStripOf(null)).toBeNull();
  });
});

test("RK-U30. 3위까지 남은 점수(D13) — 3위 점수를 넘는 데 필요한 만큼(+1), 이미 3위 안이거나 3위가 없으면 null", () => {
  const rows = [row(1), row(2), row(3), row(4), row(5, true)]; // 점수 39 · 38 · 37 · 36 · 35
  const mine = { ...board, rows, me: { rank: 5, score: 35 } };
  expect(moreToTopThree(mine)).toBe(3);
  expect(moreToTopThree({ ...mine, me: { rank: 3, score: 37 } })).toBeNull();
  expect(
    moreToTopThree({ ...mine, rows: [row(1), row(2, true)], me: { rank: 2, score: 38 } }),
  ).toBeNull();
  // 서버가 3위 줄을 주지 않았으면(작은 그룹) 말하지 않는다.
  expect(moreToTopThree({ ...mine, rows: [row(1), row(5, true)] })).toBeNull();
});

test("RK-U32. 이번 주가 끝나는 때 — 다음 월요일 00:00 UTC(서버 `endsAt`과 같은 값). 읽기 전에도 「Ends in N days」를 그린다", () => {
  expect(weekEndsAt(Date.parse("2026-11-20T10:00:00Z"))).toBe("2026-11-23T00:00:00Z");
  // 월요일 00:00 UTC 정각은 새 주의 시작 — 끝은 일주일 뒤.
  expect(weekEndsAt(Date.parse("2026-11-23T00:00:00Z"))).toBe("2026-11-30T00:00:00Z");
  expect(weekEndsAt(Date.parse("2026-11-22T23:59:59Z"))).toBe("2026-11-23T00:00:00Z");
  // 해가 바뀌어도.
  expect(weekEndsAt(Date.parse("2026-12-30T12:00:00Z"))).toBe("2027-01-04T00:00:00Z");
});

test("RK-U33. 머리의 남은 날 줄이 쓸 끝 시각 — 서버 값이 먼저, 못 읽었으면 기기에서 센 값, 비회원 · 숨김은 null", () => {
  const now = Date.parse("2026-11-20T10:00:00Z");
  const local = "2026-11-23T00:00:00Z";
  expect(shownEndsAt({ kind: "loading" }, now)).toBe(local);
  expect(shownEndsAt({ kind: "error" }, now)).toBe(local);
  expect(shownEndsAt({ kind: "offline" }, now)).toBe(local);
  expect(shownEndsAt({ kind: "not-joined", endsAt: "2026-11-30T00:00:00Z" }, now)).toBe(
    "2026-11-30T00:00:00Z",
  );
  expect(
    shownEndsAt({ kind: "ready", board: { ...board, endsAt: "2026-12-07T00:00:00Z" } }, now),
  ).toBe("2026-12-07T00:00:00Z");
  expect(shownEndsAt({ kind: "guest" }, now)).toBeNull();
  expect(shownEndsAt({ kind: "hidden" }, now)).toBeNull();
});
