import { describe, expect, test, vi } from "vitest";

import type { LearningItem } from "../lib/episode-content.model";
import {
  catalogAnswerEchoOf,
  catalogListenAudioOf,
  catalogRecordedEchoOf,
  catalogReplySelectAudioOf,
} from "./catalog-item-audio";
import {
  AUDIO_ID,
  AUDIO_SOURCE,
  audioPortOf,
  listenBuildItem,
  cdnAudioUrlOf,
  imgMatch,
  replySelect,
  speakWord,
  syllableBuildItem,
  translateToEn,
  translateToKo,
  wordOrder,
} from "./catalog-item-audio.test-support";
import type { CatalogLessonItemPort } from "./catalog-lesson-types";
import { opt, t } from "./catalog-screens.test-support";

// `unit` 계층: 정답 뒤 음성의 출처(ADR-0172) — 수준 5의 `answerAudioUrl`, 에피소드 녹음 색인, 대답 고르기의 정답 대답.

const sourceOf = (id: string): string => `https://cdn/audio/${id}.m4a`;

function portWith(
  recorded: Record<string, string>,
  audioUrlOf: (path: string) => string | null = cdnAudioUrlOf,
): CatalogLessonItemPort {
  return {
    ...audioPortOf(audioUrlOf),
    recordedAudioOf: (ko) => (recorded[ko] === undefined ? [] : [recorded[ko]]),
  };
}

const roleLine = (
  answer = "저는 호주에서 왔어요.",
): Extract<LearningItem, { type: "ROLE_LINE" }> => ({
  id: "S2-03",
  event: "R",
  type: "ROLE_LINE",
  prompt: t("뭐라고 말할까요?", undefined, "What do you say?"),
  context: t("어느 나라에서 왔어요?"),
  options: [opt("o1", "저는 학생이에요.", false), opt("o2", answer, true)],
  feedback: { correct: t("맞아요") },
});

describe("catalogAnswerEchoOf — 수준 5 정답 음성 · 색인", () => {
  const level5Cases = [
    ["WORD_ORDER", wordOrder],
    ["TRANSLATE_TO_KO", translateToKo],
    ["SYLLABLE_BUILD", syllableBuildItem],
    ["SPEAK_WORD", speakWord],
    ["IMG_MATCH", imgMatch],
  ] as const;

  test.each(level5Cases)(
    "IE1. %s는 stimulus.audioUrl이 없어도 answerAudioUrl로 정답 뒤 음성을 낸다",
    (_type, build) => {
      const item = build();
      const level5 = {
        ...item,
        stimulus: { ...item.stimulus, audioUrl: undefined },
        answerAudioUrl: "level-3/u03-mina/s1-11-ex",
      } as typeof item;

      expect(catalogAnswerEchoOf(level5, audioPortOf())).toEqual({
        kind: "answer-echo",
        source: sourceOf("level-3/u03-mina/s1-11-ex"),
      });
    },
  );

  test("IE2. stimulus.audioUrl이 있으면 그것이 먼저다(수준 4)", () => {
    const item = { ...wordOrder(), answerAudioUrl: "other/id" };
    expect(catalogAnswerEchoOf(item, audioPortOf())?.source).toBe(AUDIO_SOURCE);
  });

  test("IE3. 자기 음성이 없는 TRANSLATE_TO_EN은 색인에서 원문으로 찾은 녹음을 낸다(낱말 하나짜리는 찾지 않는다)", () => {
    const item = translateToEn({ spoken: "물 주세요." });
    const silent = { ...item, stimulus: { ...item.stimulus, audioUrl: undefined } } as typeof item;

    expect(catalogAnswerEchoOf(silent, portWith({ "물 주세요.": "u01-water/d-02" }))).toEqual({
      kind: "answer-echo",
      source: sourceOf("u01-water/d-02"),
    });
    expect(catalogAnswerEchoOf(silent, audioPortOf())).toBeNull();
    const word = translateToEn({ spoken: "물" });
    const silentWord = {
      ...word,
      stimulus: { ...word.stimulus, audioUrl: undefined },
    } as typeof word;
    expect(catalogAnswerEchoOf(silentWord, portWith({ 물: "u01-water/s1-01-word" }))).toBeNull();
  });
});

describe("catalogRecordedEchoOf — 자기 음성이 없는 유형", () => {
  test("IE4. 정답 원문이 색인에 있으면 정답 뒤 음성이다", () => {
    expect(
      catalogRecordedEchoOf(roleLine(), portWith({ "저는 호주에서 왔어요.": "u03-mina/d-04" })),
    ).toEqual({ kind: "answer-echo", source: sourceOf("u03-mina/d-04") });
  });

  test("IE5. 색인이 없거나 · 못 찾거나 · 정답 원문이 없는 유형이면 null이다", () => {
    expect(catalogRecordedEchoOf(roleLine(), audioPortOf())).toBeNull();
    expect(catalogRecordedEchoOf(roleLine(), portWith({}))).toBeNull();
    const swap: LearningItem = {
      id: "S5-03",
      event: "R",
      type: "PARTICLE_SWAP",
      prompt: t("고치세요."),
      stimulus: { text: t("뭐[이]") },
      options: [opt("o1", "가", true), opt("o2", "을", false)],
      feedback: { correct: t("맞아요") },
    };
    expect(catalogRecordedEchoOf(swap, portWith({ 가: "w/ga" }))).toBeNull();
  });

  test("IE6. 자리표시자가 든 원문은 녹음이 있어도 무음이고 주소 포트를 부르지 않는다", () => {
    const audioUrlOf = vi.fn<(path: string) => string | null>(cdnAudioUrlOf);
    const item = roleLine("저는 {이름}이에요.");

    expect(
      catalogRecordedEchoOf(item, portWith({ "저는 {이름}이에요.": "u03-mina/d-02" }, audioUrlOf)),
    ).toBeNull();
    expect(audioUrlOf).not.toHaveBeenCalled();
  });

  test("IE7b. 같은 글의 녹음이 여럿이면 받은 파일이 있는 첫 id를 쓴다", () => {
    const port: CatalogLessonItemPort = {
      ...audioPortOf((path) => (path.includes("d-04") ? null : cdnAudioUrlOf(path))),
      recordedAudioOf: () => ["u03-mina/d-04", "u03-mina/s6-02"],
    };
    expect(catalogRecordedEchoOf(roleLine(), port)).toEqual({
      kind: "answer-echo",
      source: sourceOf("u03-mina/s6-02"),
    });
  });

  test("IE7. 받은 파일이 없어 주소를 풀 수 없으면 null이다", () => {
    expect(
      catalogRecordedEchoOf(
        roleLine(),
        portWith({ "저는 호주에서 왔어요.": "u03-mina/d-04" }, () => null),
      ),
    ).toBeNull();
  });
});

describe("catalogReplySelectAudioOf — 상대 말 듣기 + 정답 대답", () => {
  const reply = () => ({
    ...replySelect(),
    options: [opt("o1", "네, 괜찮아요.", true), opt("o2", "혼자예요.", false)],
  });

  test("IE8. 상대 말 음성과 정답 대답 녹음이 둘 다 있으면 듣기 갈래에 정답 음성을 싣는다", () => {
    const item = reply();
    expect(catalogReplySelectAudioOf(item, portWith({ "네, 괜찮아요.": "u05/d-08" }))).toEqual({
      kind: "listen",
      source: AUDIO_SOURCE,
      ref: { itemId: item.id, itemType: "REPLY_SELECT" },
      echo: { kind: "answer-echo", source: sourceOf("u05/d-08") },
    });
  });

  test("IE9. 정답 대답 녹음이 없으면 지금처럼 듣기 갈래뿐이다(echo 키 없음)", () => {
    const audio = catalogReplySelectAudioOf(reply(), portWith({}));
    expect(audio?.kind).toBe("listen");
    expect(audio).not.toHaveProperty("echo");
  });

  test("IE10. 상대 말 음성이 없으면 정답 대답만 정답 뒤 음성으로, 둘 다 없으면 null이다", () => {
    const item = reply();
    const silent = { ...item, stimulus: { ...item.stimulus, audioUrl: undefined } } as typeof item;
    expect(catalogReplySelectAudioOf(silent, portWith({ "네, 괜찮아요.": "u05/d-08" }))).toEqual({
      kind: "answer-echo",
      source: sourceOf("u05/d-08"),
    });
    expect(catalogReplySelectAudioOf(silent, portWith({}))).toBeNull();
  });
});

describe("정답 음성 길이 — 저절로 넘어가는 틈에 씁니다", () => {
  test("IE11. 포트가 길이를 알면 정답 뒤 음성에 말소리 길이를 싣는다(자기 id · 색인 id 모두)", () => {
    const port: CatalogLessonItemPort = {
      ...portWith({ "저는 호주에서 왔어요.": "u03-mina/d-04" }),
      audioSpeechMsOf: (id) => (id === "u03-mina/d-04" ? 2400 : id === AUDIO_ID ? 700 : null),
    };
    expect(catalogRecordedEchoOf(roleLine(), port)).toEqual({
      kind: "answer-echo",
      source: sourceOf("u03-mina/d-04"),
      speechMs: 2400,
    });
    expect(catalogAnswerEchoOf(wordOrder(), port)).toEqual({
      kind: "answer-echo",
      source: AUDIO_SOURCE,
      speechMs: 700,
    });
  });

  test("IE12. 길이를 모르면 speechMs 키가 없다", () => {
    expect(catalogAnswerEchoOf(wordOrder(), audioPortOf())).not.toHaveProperty("speechMs");
  });
});

describe("뜻이 다른 같은 글자를 피한다(리뷰 W1 · W4)", () => {
  const cultureCheck = (answer: string): LearningItem => ({
    id: "CULT-09",
    event: "R",
    type: "CULTURE_CHECK",
    prompt: t("고르세요."),
    context: t("무엇을 살까요?"),
    options: [opt("o1", "사과", false), opt("o2", answer, true)],
    feedback: { correct: t("맞아요") },
  });

  test("IE13. 띄어쓰기도 문장부호도 없는 낱말 하나짜리 정답은 색인에서 찾지 않는다(「배」 · 「눈」)", () => {
    expect(
      catalogRecordedEchoOf(cultureCheck("배"), portWith({ 배: "u09/s1-02-word" })),
    ).toBeNull();
  });

  test("IE13. 문장부호가 있거나 여러 어절이면 찾는다", () => {
    expect(
      catalogRecordedEchoOf(cultureCheck("감사합니다!"), portWith({ "감사합니다!": "u00/d-04" })),
    ).toEqual({ kind: "answer-echo", source: sourceOf("u00/d-04") });
    expect(
      catalogRecordedEchoOf(cultureCheck("미나 씨"), portWith({ "미나 씨": "u03/w" })),
    ).toEqual({ kind: "answer-echo", source: sourceOf("u03/w") });
  });

  test("IE14. 듣기 유형은 stimulus.audioUrl만 쓴다 — answerAudioUrl로 듣기 자동 재생을 바꾸지 않는다", () => {
    const item = listenBuildItem();
    const onlyAnswer = {
      ...item,
      stimulus: { ...item.stimulus, audioUrl: undefined },
      answerAudioUrl: "level-3/u01/x",
    } as typeof item;
    expect(catalogListenAudioOf(onlyAnswer, audioPortOf())).toBeNull();
  });
});
