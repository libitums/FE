import { describe, expect, test } from "vitest";

import { albumMediaOf, mediaPageFrom } from "./companion-media-parse";

// `unit` 계층(AL-U7): 앨범 RPC(`companion_list_media`) 본문 해석(ADR-0150).

const M1 = "33333333-3333-4333-8333-333333333333";
const A0 = "00000000-0000-4000-8000-000000000000";

const row = (over: Record<string, unknown> = {}) => ({
  id: M1,
  characterId: "duksu",
  messageId: A0,
  kind: "snapshot",
  status: "complete",
  charge: "photo",
  cost: 35,
  path: "u/m1.png",
  mime: "image/png",
  aspect: "3:2",
  failure: null,
  aiGenerated: true,
  engine: null,
  model: null,
  createdAt: "2026-11-15T10:19:00.000Z",
  finishedAt: "2026-11-15T10:19:30.000Z",
  line: { ko: "떡볶이 맛있죠?", en: "Tteokbokki is good, right?" },
  fromPastChat: true,
  ...over,
});

describe("AL-U7 앨범 한 건 · 한 쪽", () => {
  test("AL-U7a 결과 칸 + 인물 · 그때의 말 · 지난 대화", () => {
    expect(albumMediaOf(row())).toMatchObject({
      id: M1,
      characterId: "duksu",
      messageId: A0,
      kind: "snapshot",
      status: "complete",
      path: "u/m1.png",
      aspect: "3:2",
      line: { ko: "떡볶이 맛있죠?", en: "Tteokbokki is good, right?" },
      fromPastChat: true,
      createdAt: Date.parse("2026-11-15T10:19:00.000Z"),
    });
  });

  test("AL-U7b 옛 서버(말 · 지난 대화 칸 없음)는 빈 줄 · false, 말의 en이 없으면 빈 문자열", () => {
    const { line: _l, fromPastChat: _f, ...old } = row();
    expect(albumMediaOf(old)).toMatchObject({ line: { ko: "", en: "" }, fromPastChat: false });
    expect(albumMediaOf(row({ line: { ko: "네" } }))).toMatchObject({ line: { ko: "네", en: "" } });
  });

  test("AL-U7c 결과 칸이 틀리면(인물 없음 포함) null", () => {
    expect(albumMediaOf(row({ characterId: 3 }))).toBeNull();
    expect(albumMediaOf(row({ kind: "video" }))).toBeNull();
  });

  test("AL-U7d 한 쪽 — 틀린 줄은 버리고 hasMore는 불이어야 한다", () => {
    const body = JSON.stringify({ items: [row(), { id: 1 }], hasMore: true });
    expect(mediaPageFrom(body)?.items.map((m) => m.id)).toEqual([M1]);
    expect(mediaPageFrom(body)?.hasMore).toBe(true);
    expect(mediaPageFrom(JSON.stringify({ items: [] }))).toBeNull();
    expect(mediaPageFrom("not json")).toBeNull();
    expect(mediaPageFrom(null)).toBeNull();
  });
});
