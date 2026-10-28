import { expect, test } from "vitest";

import { decodeEpisode, type DecodeResult, type Episode, type EpisodeCall } from "./index";
import {
  item,
  minimalEpisode,
  roleplayTurnWire,
  step,
  type Wire,
} from "./episode-wire.test-support";

// `unit` 계층: 전화 막간의 해석(ADR-0088 D6). 상대 · 대사 줄 종류 · 끝 지문을 `story.call`로 냅니다.

const t3 = (ko: string): Wire => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });

function passed(result: DecodeResult): Episode {
  if (!result.ok) throw new Error(`실패: ${JSON.stringify(result.errors)}`);
  return result.episode;
}

const callOf = (interlude: unknown): EpisodeCall | undefined =>
  passed(
    decodeEpisode(
      minimalEpisode({
        steps: [
          step("S1", 1, [item("ROLE_LINE", "S1-01")]),
          { id: "INT", kind: "interlude", order: 2, items: [], interlude },
          step("RP", 3, [roleplayTurnWire("RP-01")]),
        ],
      }),
    ),
  ).units.find((unit) => unit.id === "INT")?.story?.call;

const CALL = {
  form: "call",
  caption: t3("조금 전"),
  background_url: "content/images/u09/pre-2.webp",
  profiles: [{ speaker: "사장님", image_url: "content/images/profiles/yoonkyung-casual.webp" }],
  cuts: [
    { index: 1, with: "사장님", cut_kind: "call", speaker: "사장님", line: t3("어디예요?") },
    { index: 2, with: "사장님", cut_kind: "call", speaker: "플레이어", line: t3("역이에요") },
    {
      index: 3,
      with: "사장님",
      cut_kind: "call",
      line: t3("열차가 들어옵니다"),
      background_voice: true,
      voice_label: "안내 방송",
    },
    { index: 4, cut_kind: "call_end", narration: t3("뚝.") },
  ],
};

const summary = (call: EpisodeCall | undefined) =>
  (call?.lines ?? []).map((l) => `${l.kind}:${l.label}:${l.line.ko}`);

test("CC1. 전화 막간은 상대(with) · 배경 · 그림 · 줄 종류 · 끝 지문을 지닌 call을 낸다", () => {
  const call = callOf(CALL);
  expect(call?.counterpart).toBe("사장님");
  expect(call?.backgroundUrl).toBe("content/images/u09/pre-2.webp");
  expect(call?.counterpartImageUrl).toBe("content/images/profiles/yoonkyung-casual.webp");
  expect(summary(call)).toEqual([
    "caller:사장님:어디예요?",
    "self::역이에요",
    "background:안내 방송:열차가 들어옵니다",
  ]);
  expect(call?.end?.ko).toBe("뚝.");
  expect(call?.lines[0]?.line.en).toBe("e-어디예요?");
});

test("CC2. with가 없으면 플레이어가 아닌 첫 화자가 상대이고, 끝 지문이 없어도 된다", () => {
  const call = callOf({
    form: "call",
    cuts: [
      { index: 1, cut_kind: "call", speaker: "익선 게스트하우스", line: t3("여보세요") },
      { index: 2, cut_kind: "call", speaker: "플레이어", line: t3("네") },
    ],
  });
  expect(call?.counterpart).toBe("익선 게스트하우스");
  expect(call?.end).toBeUndefined();
});

test.each([
  ["message 형식", { ...CALL, form: "message" }],
  [
    "대사 없는 전화",
    { form: "call", cuts: [{ index: 1, cut_kind: "call_end", narration: t3("뚝.") }] },
  ],
  [
    "상대가 없는 전화",
    {
      form: "call",
      cuts: [{ index: 1, cut_kind: "call", speaker: "플레이어", line: t3("여보세요?") }],
    },
  ],
])("CC3. %s에는 call이 없다", (_name, interlude) => {
  expect(callOf(interlude)).toBeUndefined();
});

test("CC4. 줄의 audio_url은 그 줄의 소리 id로 싣고, 비어 있으면 싣지 않는다", () => {
  const cuts = CALL.cuts.map((cut) =>
    cut.index === 1 ? { ...cut, audio_url: "u09-subway/int-01" } : { ...cut, audio_url: "" },
  );
  const call = callOf({ ...CALL, cuts });
  expect(call?.lines.map((l) => l.audioUrl)).toEqual(["u09-subway/int-01", undefined, undefined]);
});
