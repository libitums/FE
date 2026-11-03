import { expect, test } from "vitest";

import { decodeEpisode, type DecodeResult, type Episode, type LearningItem } from "./index";
import {
  item,
  minimalEpisode,
  roleplayTurnWire,
  step,
  type Wire,
} from "./episode-wire.test-support";

// `unit` 계층: balance 콘텐츠(level-3)의 S8 이야기 문항 — 문항 `story`, 대답 고르기의 `context` · 풍부한 해설,
// 해설 없는 빈칸 고르기, 새 형식 따라 쓰기(HANGUL_WRITE), 최상위 막간, 모르는 형식 문항의 건너뛰기.

const t3 = (ko: string): Wire => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });

const STORY: Wire = {
  line_id: "D2",
  hint_after_miss: true,
  lead: [{ speaker: "점원", line: t3("봉투 드릴까요?"), audio_url: "" }],
  line: t3("아니요, 괜찮아요."),
  situation: t3("상황"),
  image_url: "content/images/u01-water/pre-6.webp",
};

function passed(result: DecodeResult): Episode {
  if (!result.ok) throw new Error(`fail: ${JSON.stringify(result.errors)}`);
  return result.episode;
}

function onlyItem(wire: Wire): LearningItem {
  const episode = passed(decodeEpisode(minimalEpisode({}, [wire])));
  const found = episode.units[0]?.items[0];
  if (found === undefined) throw new Error("no item");
  return found;
}

test("ST1. 문항 story를 도메인 story로 옮긴다(빈 녹음 · 상황 · 그림)", () => {
  const decoded = onlyItem(item("CLOZE", "S8-04", { story: STORY }));
  expect(decoded.story).toEqual({
    lineId: "D2",
    hintAfterMiss: true,
    lead: [
      {
        speaker: "점원",
        line: { ko: "봉투 드릴까요?", roman: "r-봉투 드릴까요?", en: "e-봉투 드릴까요?" },
      },
    ],
    line: { ko: "아니요, 괜찮아요.", roman: "r-아니요, 괜찮아요.", en: "e-아니요, 괜찮아요." },
    situation: { ko: "상황", roman: "r-상황", en: "e-상황" },
    imageUrl: "content/images/u01-water/pre-6.webp",
  });
});

test("ST2. story가 없으면 키가 없다", () => {
  expect(onlyItem(item("CLOZE", "S1-01"))).not.toHaveProperty("story");
});

test("ST3. stimulus 없는 대답 고르기는 context를 stimulus.text로 받고 풍부한 해설을 읽는다", () => {
  const { stimulus: _drop, ...rest } = item("REPLY_SELECT", "S8-01");
  const decoded = onlyItem({
    ...rest,
    context: t3("봉투 드릴까요?"),
    feedback: {
      correct: { ko: "맞아요", en: "Right" },
      wrong: { ko: "아니에요", en: "No" },
      wrong_option: "o2",
    },
    story: STORY,
  });
  if (decoded.type !== "REPLY_SELECT") throw new Error(decoded.type);
  expect(decoded.stimulus.text?.ko).toBe("봉투 드릴까요?");
  expect(decoded.context?.ko).toBe("봉투 드릴까요?");
  expect(decoded.feedback).toEqual({
    correct: { ko: "맞아요", en: "Right" },
    wrong: { ko: "아니에요", en: "No" },
    wrongOption: "o2",
  });
});

test("ST4. 해설 없는 빈칸 고르기도 받는다(feedback 키 없음)", () => {
  const { feedback: _drop, ...rest } = item("CLOZE_CHOICE", "S8-02");
  const decoded = onlyItem({ ...rest, story: STORY });
  expect(decoded.type).toBe("CLOZE_CHOICE");
  expect(decoded).not.toHaveProperty("feedback");
});

test("ST5. 따라 쓰기(HANGUL_WRITE)를 문맥 · 정답 · 해설과 함께 받는다", () => {
  const decoded = onlyItem({
    id: "S8-03",
    type: "HANGUL_WRITE",
    mode: "draw",
    event: "R",
    prompt: { ko: "따라 쓰세요.", en: "Trace it." },
    context: t3("___ 할게요."),
    answers: [{ ko: "카드로", roman: "kadeuro" }],
    feedback: { correct: { ko: "획 순서대로", en: "Trace the strokes in order." } },
    story: STORY,
  });
  if (decoded.type !== "HANGUL_WRITE") throw new Error(decoded.type);
  expect(decoded.prompt.en).toBe("Trace it.");
  expect(decoded.context.ko).toBe("___ 할게요.");
  expect(decoded.answers.map((answer) => answer.ko)).toEqual(["카드로"]);
  expect(decoded.feedback?.correct.en).toBe("Trace the strokes in order.");
});

test("ST6. 모르는 형식 문항은 그 문항만 빼고 경고로 남긴다(에피소드는 성공)", () => {
  const result = decodeEpisode(
    minimalEpisode({}, [
      item("CLOZE", "S1-01"),
      { id: "S1-02", type: "FUTURE_KIND", mode: "x", event: "R" },
    ]),
  );
  const episode = passed(result);
  expect(episode.units[0]?.items.map((found) => found.id)).toEqual(["S1-01"]);
  if (!result.ok) throw new Error("fail");
  expect(result.warnings).toContainEqual({
    code: "unknown-item-type",
    path: "steps[0].items[1].type",
    message: "unknown item type: FUTURE_KIND",
  });
});

const INTERLUDE = {
  form: "cuts",
  caption: t3("그 시각"),
  cuts: [{ index: 1, cut_kind: "speech", speaker: "미나", line: t3("안녕"), image_url: "" }],
};

test("ST7. INT 단계에 막간이 없으면 최상위 interlude를 읽는다", () => {
  const episode = passed(
    decodeEpisode(
      minimalEpisode({
        interlude: INTERLUDE,
        steps: [
          step("S1", 1, [item("CLOZE", "S1-01")]),
          { id: "INT", kind: "interlude", order: 2, items: [] },
          step("RP", 3, [roleplayTurnWire("RP-01")]),
        ],
      }),
    ),
  );
  expect(episode.units.find((unit) => unit.id === "INT")?.story?.caption?.ko).toBe("그 시각");
});

test("ST8. INT 단계 안의 막간이 있으면 그것이 최상위보다 먼저다", () => {
  const episode = passed(
    decodeEpisode(
      minimalEpisode({
        interlude: INTERLUDE,
        steps: [
          step("S1", 1, [item("CLOZE", "S1-01")]),
          {
            id: "INT",
            kind: "interlude",
            order: 2,
            items: [],
            interlude: { ...INTERLUDE, caption: t3("단계 안") },
          },
          step("RP", 3, [roleplayTurnWire("RP-01")]),
        ],
      }),
    ),
  );
  expect(episode.units.find((unit) => unit.id === "INT")?.story?.caption?.ko).toBe("단계 안");
});

test("ST9. 음절 조립(SYLLABLE_BUILD)도 이야기 빈칸 문맥(context)을 지킨다", () => {
  const decoded = onlyItem(
    item("SYLLABLE_BUILD", "S8-06", { context: t3("그럼 내일 ___ 올게요."), story: STORY }),
  );
  if (decoded.type !== "SYLLABLE_BUILD") throw new Error(decoded.type);
  expect(decoded.context?.ko).toBe("그럼 내일 ___ 올게요.");
});

test("ST10. 문맥이 없는 음절 조립은 context 키가 없다", () => {
  expect(onlyItem(item("SYLLABLE_BUILD", "S3-01"))).not.toHaveProperty("context");
});
