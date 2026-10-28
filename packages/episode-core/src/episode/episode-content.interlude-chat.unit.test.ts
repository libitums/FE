import { expect, test } from "vitest";

import { decodeEpisode, type DecodeResult, type Episode, type EpisodeChat } from "./index";
import {
  item,
  minimalEpisode,
  roleplayTurnWire,
  step,
  type Wire,
} from "./episode-wire.test-support";

// `unit` 계층: 문자 막간의 대화 해석(ADR-0088 보충). 답장 보기와 분기 줄을 버리지 않고 `story.chat`으로 냅니다.

const t3 = (ko: string): Wire => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });

function episodeWith(interlude: unknown): Wire {
  return minimalEpisode({
    steps: [
      step("S1", 1, [item("ROLE_LINE", "S1-01")]),
      { id: "INT", kind: "interlude", order: 2, items: [], interlude },
      step("RP", 3, [roleplayTurnWire("RP-01")]),
    ],
  });
}

function passed(result: DecodeResult): Episode {
  if (!result.ok) throw new Error(`실패: ${JSON.stringify(result.errors)}`);
  return result.episode;
}

const chatOf = (interlude: unknown): EpisodeChat | undefined =>
  passed(decodeEpisode(episodeWith(interlude))).units.find((unit) => unit.id === "INT")?.story
    ?.chat;

const summary = (chat: EpisodeChat | undefined): string[] =>
  (chat?.turns ?? []).map((turn) =>
    turn.kind === "reply"
      ? `reply:${turn.options.map((o) => o.ko).join("|")}`
      : `${turn.speaker}:${turn.line.ko}${turn.afterOption === undefined ? "" : `@${turn.afterOption}`}${turn.imageUrl === undefined ? "" : `#${turn.imageUrl}`}`,
  );

const MESSAGE = {
  form: "message",
  caption: t3("조금 전"),
  background_url: "content/images/u04/pre-2.webp",
  cuts: [
    { index: 1, cut_kind: "message", speaker: "미나", line: t3("식당 찾았어요?") },
    {
      index: 2,
      cut_kind: "message_reply",
      speaker: "플레이어",
      options: [t3("아니요"), t3("어디예요?")],
    },
    { index: 3, cut_kind: "message", speaker: "미나", line: t3("괜찮아요"), after_option: 1 },
    { index: 3, cut_kind: "message", speaker: "미나", line: t3("맛있어요"), after_option: 2 },
    {
      index: 4,
      cut_kind: "message",
      speaker: "미나",
      line: t3("여기예요"),
      image_url: "content/images/u04/photo.webp",
    },
  ],
};

test("CH1. 문자 막간은 상대 · 배경 · 줄을 지닌 chat을 낸다", () => {
  const chat = chatOf(MESSAGE);
  expect(chat?.counterpart).toBe("미나");
  expect(chat?.backgroundUrl).toBe("content/images/u04/pre-2.webp");
  expect(summary(chat)).toEqual([
    "미나:식당 찾았어요?",
    "reply:아니요|어디예요?",
    "미나:괜찮아요@1",
    "미나:맛있어요@2",
    "미나:여기예요#content/images/u04/photo.webp",
  ]);
});

test("CH2. 답장 보기의 번역 · 로마자를 지닌다", () => {
  const reply = chatOf(MESSAGE)?.turns[1];
  expect(reply).toEqual({
    kind: "reply",
    options: [
      { ko: "아니요", roman: "r-아니요", en: "e-아니요" },
      { ko: "어디예요?", roman: "r-어디예요?", en: "e-어디예요?" },
    ],
  });
});

test.each([
  ["cuts", { ...MESSAGE, form: "cuts" }],
  ["call", { ...MESSAGE, form: "call" }],
])("CH3. %s 형식에는 chat이 없다", (_name, interlude) => {
  expect(chatOf(interlude)).toBeUndefined();
});

test("CH4. 보기 없는 답장 · 화자 없는 메시지는 건너뛰고, 상대가 없으면 chat이 없다", () => {
  const chat = chatOf({
    ...MESSAGE,
    cuts: [
      { index: 1, cut_kind: "message", line: t3("누구?") },
      { index: 2, cut_kind: "message_reply", speaker: "플레이어", options: [] },
      ...MESSAGE.cuts,
    ],
  });
  expect(summary(chat)[0]).toBe("미나:식당 찾았어요?");
  expect(
    chatOf({
      form: "message",
      cuts: [{ index: 1, cut_kind: "message", speaker: "플레이어", line: t3("나") }],
    }),
  ).toBeUndefined();
});

test("CH5. profiles에서 상대 화자의 그림만 아바타로 싣고, 틀린 항목 · 다른 화자는 무시한다", () => {
  const chat = chatOf({
    ...MESSAGE,
    profiles: [
      { speaker: "사장님", image_url: "content/images/profiles/boss.webp" },
      { speaker: "미나" },
      "mina",
      { speaker: "미나", image_url: "content/images/profiles/mina-casual.webp" },
    ],
  });
  expect(chat?.counterpartImageUrl).toBe("content/images/profiles/mina-casual.webp");
  expect(chatOf(MESSAGE)?.counterpartImageUrl).toBeUndefined();
  expect(chatOf({ ...MESSAGE, profiles: "broken" })?.counterpart).toBe("미나");
});
