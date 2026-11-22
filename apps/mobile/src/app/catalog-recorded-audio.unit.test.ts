import { describe, expect, test } from "vitest";

import type { LearningItem } from "../lib/episode-content.model";
import { answerEchoTextOf, recordedAudioIndexOf } from "./catalog-recorded-audio";
import type { RecordedAudioSources } from "./catalog-recorded-audio";
import {
  imgMatch,
  listenSelect,
  translateToEn,
  wordOrder,
} from "./catalog-item-audio.test-support";
import { opt, t } from "./catalog-screens.test-support";

// `unit` 계층: 정답 뒤 음성의 출처(ADR-0172) — 에피소드 녹음 색인과 문항의 정답 한국어 원문.

const prompt = t("고르세요.", undefined, "Pick one.");

function sourcesWith(parts: Partial<RecordedAudioSources> = {}): RecordedAudioSources {
  return {
    prologue: [],
    dialogue: [],
    units: [],
    finalTest: { id: "RP", order: 9, items: [] },
    epilogue: [],
    ...parts,
  };
}

const unitOf = (items: LearningItem[]) => ({ id: "S1", order: 1, items });

const vocab = (ko: string, audioUrl?: string, example?: string, exampleAudioUrl?: string) =>
  ({
    id: `V-${ko}`,
    event: "E",
    type: "VOCAB_CARD",
    context: t(ko),
    cardKind: "단어",
    ...(example === undefined ? {} : { example: t(example) }),
    ...(audioUrl === undefined ? {} : { audioUrl }),
    ...(exampleAudioUrl === undefined ? {} : { exampleAudioUrl }),
  }) satisfies LearningItem;

describe("recordedAudioIndexOf — 에피소드 녹음 색인", () => {
  test("RA1. 대화 줄의 글로 그 줄의 음성 id를 찾고, 찾는 글의 앞뒤 공백은 무시한다", () => {
    const find = recordedAudioIndexOf(
      sourcesWith({
        dialogue: [
          { seq: 1, role: "counterpart", text: t("안녕하세요."), audioUrl: "u03-mina/d-01" },
          { seq: 2, role: "player", text: t("반가워요.") },
        ],
      }),
    );
    expect(find(" 안녕하세요. ")).toEqual(["u03-mina/d-01"]);
    expect(find("반가워요.")).toEqual([]);
    expect(find("없는 글")).toEqual([]);
  });

  test("RA2. 표지 · 뒤 컷의 대사 · 독백 · 지문도 색인에 든다", () => {
    const find = recordedAudioIndexOf(
      sourcesWith({
        prologue: [
          {
            kind: "speech",
            index: 1,
            speaker: "미나",
            line: t("어서 와요."),
            aside: t(""),
            imageBrief: "",
            audioUrl: "c/pre-1",
          },
          {
            kind: "narration",
            index: 2,
            narration: t("방이 조용하다."),
            imageBrief: "",
            audioUrl: "c/pre-2",
          },
        ],
        epilogue: [
          {
            kind: "monologue",
            index: 1,
            speaker: "나",
            line: t("좋았어."),
            imageBrief: "",
            audioUrl: "c/post-1",
          },
        ],
      }),
    );
    expect(find("어서 와요.")).toEqual(["c/pre-1"]);
    expect(find("방이 조용하다.")).toEqual(["c/pre-2"]);
    expect(find("좋았어.")).toEqual(["c/post-1"]);
  });

  test("RA3. 단어 카드는 표제어와 예문을 각자 음성 id로 싣는다", () => {
    const find = recordedAudioIndexOf(
      sourcesWith({
        units: [unitOf([vocab("학생", "w/student", "저는 학생이에요.", "w/student-ex")])],
      }),
    );
    expect(find("학생")).toEqual(["w/student"]);
    expect(find("저는 학생이에요.")).toEqual(["w/student-ex"]);
  });

  test("RA4. 듣기 문항은 stimulus 글, 정답 뒤 음성 문항은 정답 원문으로 그 문항의 음성 id를 싣는다", () => {
    const level5WordOrder: LearningItem = {
      ...wordOrder({ spoken: "저는 호주 사람이에요." }),
      stimulus: { en: "I'm Australian." },
      answerAudioUrl: "level-3/u03-mina/s1-11-ex",
    };
    const find = recordedAudioIndexOf(
      sourcesWith({
        units: [
          unitOf([
            listenSelect({ spoken: "물 주세요.", audioUrl: "l/listen" }),
            translateToEn({ spoken: "물", audioUrl: "l/en" }),
            imgMatch({ spoken: "우산", audioUrl: "l/img" }),
            level5WordOrder,
          ]),
        ],
      }),
    );
    expect(find("물 주세요.")).toEqual(["l/listen"]);
    expect(find("물")).toEqual(["l/en"]);
    expect(find("우산")).toEqual(["l/img"]);
    expect(find("저는 호주 사람이에요.")).toEqual(["level-3/u03-mina/s1-11-ex"]);
  });

  test("RA5. 최종 테스트 문항과 이야기 장면의 앞 상대 줄도 색인에 든다", () => {
    const storyItem = {
      ...listenSelect({ spoken: "다른 글", audioUrl: "s/other" }),
      story: {
        lineId: "D3",
        hintAfterMiss: false,
        lead: [{ speaker: "미나", line: t("어디 가요?"), audioUrl: "s/lead" }],
        line: t("시장에 가요."),
      },
    } satisfies LearningItem;
    const find = recordedAudioIndexOf(
      sourcesWith({
        units: [unitOf([storyItem])],
        finalTest: {
          id: "RP",
          order: 9,
          items: [listenSelect({ spoken: "최종 글", audioUrl: "rp/1" })],
        },
      }),
    );
    expect(find("어디 가요?")).toEqual(["s/lead"]);
    expect(find("최종 글")).toEqual(["rp/1"]);
  });

  test("RA6. 같은 글이 둘이면 본 차례대로 id를 모두 내고(받은 파일이 있는 쪽을 고르게), 빈 글 · 빈 id는 넣지 않는다", () => {
    const find = recordedAudioIndexOf(
      sourcesWith({
        dialogue: [
          { seq: 1, role: "counterpart", text: t("네."), audioUrl: "first" },
          { seq: 2, role: "player", text: t("네."), audioUrl: "second" },
          { seq: 3, role: "player", text: t("  "), audioUrl: "blank" },
          { seq: 4, role: "player", text: t("아니요."), audioUrl: "" },
        ],
      }),
    );
    expect(find("네.")).toEqual(["first", "second"]);
    expect(find("")).toEqual([]);
    expect(find("아니요.")).toEqual([]);
  });
});

const roleLine = (): LearningItem => ({
  id: "S2-03",
  event: "R",
  type: "ROLE_LINE",
  prompt,
  context: t("미나 씨는 어느 나라에서 왔어요?"),
  options: [opt("o1", "저는 학생이에요.", false), opt("o2", "저는 호주에서 왔어요.", true)],
  feedback: { correct: t("맞아요") },
});

const fb = { correct: t("맞아요") };

describe("answerEchoTextOf — 정답 한국어 원문", () => {
  test("AT1. 보기 고르기(ROLE_LINE · REPLY_SELECT · CULTURE_CHECK)는 정답 보기의 글이다", () => {
    expect(answerEchoTextOf(roleLine())).toBe("저는 호주에서 왔어요.");
    expect(
      answerEchoTextOf({
        id: "R1",
        event: "R",
        type: "REPLY_SELECT",
        prompt,
        stimulus: { audio: t("괜찮아요?") },
        options: [opt("o1", "네, 괜찮아요.", true), opt("o2", "혼자예요.", false)],
      }),
    ).toBe("네, 괜찮아요.");
    expect(
      answerEchoTextOf({
        id: "C1",
        event: "R",
        type: "CULTURE_CHECK",
        prompt,
        context: t("어떻게 부를까요?"),
        options: [opt("o1", "미나야", false), opt("o2", "미나 씨", true)],
        feedback: fb,
      }),
    ).toBe("미나 씨");
  });

  test("AT2. 빈칸 문항은 문맥의 ___를 정답으로 채운 문장이다(CLOZE · CLOZE_TYPING은 answers[0])", () => {
    expect(
      answerEchoTextOf({
        id: "S1-06",
        event: "E",
        type: "CLOZE",
        prompt,
        context: t("미나 씨, 반가워요. 저는 ___이에요."),
        tiles: [t("학생"), t("나라")],
        answers: [t("학생")],
      }),
    ).toBe("미나 씨, 반가워요. 저는 학생이에요.");
    expect(
      answerEchoTextOf({
        id: "T1",
        event: "R",
        type: "CLOZE_TYPING",
        prompt,
        context: t("두 ___ 주세요."),
        answers: [t("개")],
      }),
    ).toBe("두 개 주세요.");
  });

  test("AT3. CLOZE_CHOICE · PARTICLE_FILL은 ___를 정답 보기로 채운다(조사는 붙여 쓴다)", () => {
    expect(
      answerEchoTextOf({
        id: "C2",
        event: "R",
        type: "CLOZE_CHOICE",
        prompt,
        context: t("___ 주세요."),
        options: [opt("o1", "물", true), opt("o2", "불", false)],
        answers: [t("물")],
      }),
    ).toBe("물 주세요.");
    expect(
      answerEchoTextOf({
        id: "S5-01",
        event: "R",
        type: "PARTICLE_FILL",
        prompt,
        stimulus: { text: t("미나 씨___ 어느 나라에서 왔어요?") },
        options: [opt("o1", "는", true), opt("o2", "은", false)],
        feedback: fb,
      }),
    ).toBe("미나 씨는 어느 나라에서 왔어요?");
  });

  test("AT4. 빈칸이 없는 빈칸 문항 · 정답이 없는 문항은 null이다", () => {
    expect(
      answerEchoTextOf({
        id: "S1-07",
        event: "E",
        type: "CLOZE",
        prompt,
        context: t("빈칸 없는 문맥"),
        tiles: [t("학생")],
        answers: [t("학생")],
      }),
    ).toBeNull();
    expect(answerEchoTextOf({ ...roleLine(), options: [] } as LearningItem)).toBeNull();
  });

  test("AT5. SENT_BUILD는 첫 정답이고, 정답 뒤 음성 유형은 소리가 읽는 원문이다", () => {
    expect(
      answerEchoTextOf({
        id: "B1",
        event: "R",
        type: "SENT_BUILD",
        prompt,
        context: t("N 주세요"),
        answers: [t("물 주세요.")],
      }),
    ).toBe("물 주세요.");
    expect(answerEchoTextOf(wordOrder({ spoken: "물이 에요" }))).toBe("물이 에요");
    expect(answerEchoTextOf(translateToEn({ spoken: "물" }))).toBe("물");
    expect(answerEchoTextOf(imgMatch({ spoken: "우산" }))).toBe("우산");
  });

  test("AT6. 한 문장으로 정할 수 없는 유형 · 듣기가 곧 정답인 유형은 null이다", () => {
    expect(
      answerEchoTextOf({
        id: "S5-03",
        event: "R",
        type: "PARTICLE_SWAP",
        prompt,
        stimulus: { text: t("뭐[이]") },
        options: [opt("o1", "가", true), opt("o2", "을", false)],
        feedback: fb,
      }),
    ).toBeNull();
    expect(
      answerEchoTextOf({
        id: "T2",
        event: "R",
        type: "TURN_ORDER",
        prompt,
        context: t("순서"),
        tiles: [t("가"), t("나")],
        answer: [0, 1],
      }),
    ).toBeNull();
    expect(answerEchoTextOf(vocab("학생", "w/student"))).toBeNull();
    expect(answerEchoTextOf(listenSelect())).toBeNull();
  });
});
