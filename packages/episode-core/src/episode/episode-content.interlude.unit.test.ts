import { expect, test } from "vitest";

import { decodeEpisode, type DecodeResult, type Episode, type EpisodeCut } from "./index";
import {
  item,
  minimalEpisode,
  roleplayTurnWire,
  step,
  type Wire,
} from "./episode-wire.test-support";

// `unit` 계층: 막간(INT) 스텝의 해석(ADR-0088). 형식이 무엇이든 표지와 같은 컷 목록으로 바뀌고, 틀리면 그 스텝만 버립니다.

const t3 = (ko: string): Wire => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });

function interludeStep(interlude: unknown, id = "INT"): Wire {
  return { id, kind: "interlude", order: 2, items: [], interlude };
}

function episodeWith(int: Wire, completion?: string[]): Wire {
  return minimalEpisode({
    steps: [
      step("S1", 1, [item("ROLE_LINE", "S1-01")]),
      int,
      step("S2", 3, [item("ROLE_LINE", "S2-01")]),
      step("RP", 4, [roleplayTurnWire("RP-01")]),
    ],
    ...(completion === undefined ? {} : { completion: { requires: completion } }),
  });
}

function passed(result: DecodeResult): { episode: Episode; warnings: { code: string }[] } {
  if (!result.ok) throw new Error(`실패: ${JSON.stringify(result.errors)}`);
  return result;
}

const storyOf = (episode: Episode) => episode.units.find((unit) => unit.id === "INT")?.story;
const summary = (cut: EpisodeCut): string =>
  cut.kind === "narration"
    ? `${cut.index}:narration:${cut.narration.ko}:${cut.imageUrl ?? "-"}`
    : `${cut.index}:${cut.kind}:${cut.speaker}:${cut.line.ko}:${cut.imageUrl ?? "-"}`;

test("IL1. cuts 형식 — speech · narration · monologue가 컷으로, 지문 있는 speech는 지문 컷이 앞선다", () => {
  const { episode, warnings } = passed(
    decodeEpisode(
      episodeWith(
        interludeStep({
          form: "cuts",
          anchor: "parallel",
          caption: t3("그 시각, 연습실"),
          cuts: [
            {
              index: 1,
              cut_kind: "narration",
              narration: t3("음악이 끝나 간다."),
              image_url: "content/images/u05/int-1.webp",
            },
            {
              index: 2,
              cut_kind: "speech",
              speaker: "트레이너",
              line: t3("더."),
              aside: t3("턱을 당기며"),
              image_url: "content/images/u05/int-2.webp",
            },
            {
              index: 3,
              cut_kind: "speech",
              speaker: "카페 직원",
              narration: t3("꼬르륵."),
              line: t3("배고프다."),
              image_url: "content/images/u05/int-3.webp",
            },
            {
              index: 4,
              cut_kind: "monologue",
              speaker: "플레이어",
              line: t3("나?"),
              image_url: "content/images/u05/int-4.webp",
            },
          ],
        }),
      ),
    ),
  );
  const story = storyOf(episode);
  expect(warnings).toEqual([]);
  expect(story?.form).toBe("cuts");
  expect(story?.caption).toEqual({
    ko: "그 시각, 연습실",
    roman: "r-그 시각, 연습실",
    en: "e-그 시각, 연습실",
  });
  expect(story?.cuts.map(summary)).toEqual([
    "1:narration:음악이 끝나 간다.:content/images/u05/int-1.webp",
    "2:speech:트레이너:더.:content/images/u05/int-2.webp",
    "3:narration:꼬르륵.:content/images/u05/int-3.webp",
    "4:speech:카페 직원:배고프다.:content/images/u05/int-3.webp",
    "5:monologue:플레이어:나?:content/images/u05/int-4.webp",
  ]);
  expect(episode.units.find((unit) => unit.id === "INT")?.items).toEqual([]);
});

test("IL2. look 형식 — 사진 컷의 글은 지문으로 선다", () => {
  const { episode } = passed(
    decodeEpisode(
      episodeWith(
        interludeStep({
          form: "look",
          cuts: [
            {
              index: 1,
              cut_kind: "look",
              line: t3("맛있어요!"),
              image_url: "content/images/u03/p.webp",
            },
          ],
        }),
      ),
    ),
  );
  expect(storyOf(episode)?.cuts.map(summary)).toEqual([
    "1:narration:맛있어요!:content/images/u03/p.webp",
  ]);
});

test("IL3. message 형식 — 답장은 첫 보기를 플레이어 대사로, after_option이 1이 아닌 컷은 버리고, 그림은 컷 → 배경 순", () => {
  const { episode } = passed(
    decodeEpisode(
      episodeWith(
        interludeStep({
          form: "message",
          background_url: "content/images/u04/bg.webp",
          cuts: [
            { index: 1, cut_kind: "message", speaker: "미나", line: t3("찾았어요?") },
            {
              index: 2,
              cut_kind: "message_reply",
              speaker: "플레이어",
              options: [t3("아니요."), t3("어디예요?")],
            },
            {
              index: 3,
              cut_kind: "message",
              speaker: "미나",
              line: t3("괜찮아요!"),
              after_option: 1,
            },
            {
              index: 3,
              cut_kind: "message",
              speaker: "미나",
              line: t3("맛있어요!"),
              after_option: 2,
            },
            {
              index: 4,
              cut_kind: "message",
              speaker: "미나",
              line: t3("여기예요!"),
              image_url: "content/images/u04/photo.webp",
            },
          ],
        }),
      ),
    ),
  );
  expect(storyOf(episode)?.cuts.map(summary)).toEqual([
    "1:speech:미나:찾았어요?:content/images/u04/bg.webp",
    "2:speech:플레이어:아니요.:content/images/u04/bg.webp",
    "3:speech:미나:괜찮아요!:content/images/u04/bg.webp",
    "4:speech:미나:여기예요!:content/images/u04/photo.webp",
  ]);
});

test("IL4. call 형식 — 화자가 없으면 상대(with), 배경 목소리는 지문(aside)에 voice_label, call_end는 지문", () => {
  const { episode } = passed(
    decodeEpisode(
      episodeWith(
        interludeStep({
          form: "call",
          cuts: [
            {
              index: 1,
              cut_kind: "call",
              with: "게스트하우스",
              speaker: "게스트하우스",
              line: t3("여보세요."),
              background_url: "content/images/bg.webp",
            },
            {
              index: 2,
              cut_kind: "call",
              with: "게스트하우스",
              line: t3("새로 오셨나 봐요?"),
              background_voice: true,
              voice_label: "뒤에서 작게",
              background_url: "content/images/bg.webp",
            },
            {
              index: 3,
              cut_kind: "call_end",
              narration: t3("뚝."),
              background_url: "content/images/bg.webp",
            },
          ],
        }),
      ),
    ),
  );
  const cuts = storyOf(episode)?.cuts ?? [];
  expect(cuts.map(summary)).toEqual([
    "1:speech:게스트하우스:여보세요.:content/images/bg.webp",
    "2:speech:게스트하우스:새로 오셨나 봐요?:content/images/bg.webp",
    "3:narration:뚝.:content/images/bg.webp",
  ]);
  const second = cuts[1];
  expect(second?.kind === "speech" ? second.aside.ko : null).toBe("뒤에서 작게");
});

test("IL5. 모르는 컷 종류는 line이면 대사, narration이면 지문, 둘 다 없으면 버린다", () => {
  const { episode } = passed(
    decodeEpisode(
      episodeWith(
        interludeStep({
          form: "comic",
          cuts: [
            { index: 1, cut_kind: "panel", speaker: "미나", line: t3("안녕!") },
            { index: 2, cut_kind: "panel", narration: t3("조용하다.") },
            { index: 3, cut_kind: "panel" },
          ],
        }),
      ),
    ),
  );
  expect(storyOf(episode)?.cuts.map(summary)).toEqual([
    "1:speech:미나:안녕!:-",
    "2:narration:조용하다.:-",
  ]);
});

test.each([
  ["모양이 틀림", { form: "cuts", cuts: "nope" }],
  ["interlude 없음", undefined],
  ["그릴 컷이 없음", { form: "cuts", cuts: [{ index: 1, cut_kind: "speech" }] }],
])("IL6. %s — 그 스텝을 버리고 completion에서도 빼며 경고 하나", (_label, interlude) => {
  const { episode, warnings } = passed(
    decodeEpisode(episodeWith(interludeStep(interlude), ["S1", "INT", "S2", "RP"])),
  );
  expect(episode.units.map((unit) => unit.id)).toEqual(["S1", "S2"]);
  expect(episode.completion?.requires).toEqual(["S1", "S2", "RP"]);
  expect(warnings).toEqual([
    expect.objectContaining({ code: "invalid-interlude", path: "steps[1].interlude" }),
  ]);
});

test("IL7. kind가 interlude가 아니면 interlude가 있어도 이야기가 아니다(지금 규칙 그대로)", () => {
  const plain = {
    id: "S9",
    order: 2,
    items: [item("ROLE_LINE", "S9-01")],
    interlude: { form: "cuts", cuts: [] },
  };
  const { episode } = passed(decodeEpisode(episodeWith(plain)));
  expect(episode.units.find((unit) => unit.id === "S9")?.story).toBeUndefined();
});

test("IL8. 이야기가 맞으면 completion의 INT는 그대로 남는다", () => {
  const { episode } = passed(
    decodeEpisode(
      episodeWith(
        interludeStep({
          form: "cuts",
          cuts: [{ index: 1, cut_kind: "narration", narration: t3("지문") }],
        }),
        ["S1", "INT", "S2", "RP"],
      ),
    ),
  );
  expect(episode.completion?.requires).toEqual(["S1", "INT", "S2", "RP"]);
  expect(episode.units.map((unit) => unit.id)).toEqual(["S1", "INT", "S2"]);
});
