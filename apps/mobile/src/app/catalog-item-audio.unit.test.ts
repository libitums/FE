import { describe, expect, test, vi } from "vitest";

import { catalogAnswerEchoOf, catalogListenAudioOf } from "./catalog-item-audio";
import {
  AUDIO_ID,
  AUDIO_SOURCE,
  audioPortOf,
  dictation,
  imgMatch,
  listenBuildItem,
  listenSelect,
  minPairAb,
  replySelect,
  shadow,
  speakWord,
  syllableBuildItem,
  translateToEn,
  translateToKo,
  wordOrder,
} from "./catalog-item-audio.test-support";

// `unit` 계층: 문항 음성 주소를 풀어 갈래(listen / answer-echo)로 바꾸는 순수 함수만 봅니다.

const listenCases = [
  ["LISTEN_SELECT", listenSelect],
  ["MIN_PAIR_AB", minPairAb],
  ["REPLY_SELECT", replySelect],
  ["LISTEN_BUILD", listenBuildItem],
  ["DICTATION", dictation],
  ["SHADOW", shadow],
] as const;

const echoCases = [
  ["TRANSLATE_TO_KO", translateToKo],
  ["TRANSLATE_TO_EN", translateToEn],
  ["WORD_ORDER", wordOrder],
  ["SYLLABLE_BUILD", syllableBuildItem],
  ["SPEAK_WORD", speakWord],
  ["IMG_MATCH", imgMatch],
] as const;

describe("catalogListenAudioOf — 듣기 여섯 유형", () => {
  test.each(listenCases)("IA1. %s는 listen 갈래와 문항 참조를 낸다", (type, build) => {
    const item = build();

    expect(catalogListenAudioOf(item, audioPortOf())).toEqual({
      kind: "listen",
      source: AUDIO_SOURCE,
      ref: { itemId: item.id, itemType: type },
    });
  });

  test.each(listenCases)(
    "IA3. %s는 audioUrl이 없으면 null이고 포트를 부르지 않는다",
    (_type, build) => {
      const audioUrlOf = vi.fn<(path: string) => string | null>(() => "never");
      const item = build();
      const withoutUrl = { ...item, stimulus: { ...item.stimulus, audioUrl: undefined } };

      expect(catalogListenAudioOf(withoutUrl as typeof item, audioPortOf(audioUrlOf))).toBeNull();
      expect(audioUrlOf).not.toHaveBeenCalled();
    },
  );

  test.each(listenCases)(
    "IA5. %s는 포트가 null을 내면(재생 모듈 없음) null이다",
    (_type, build) => {
      expect(
        catalogListenAudioOf(
          build(),
          audioPortOf(() => null),
        ),
      ).toBeNull();
    },
  );
});

describe("catalogAnswerEchoOf — 정답 뒤 재생 여섯 유형", () => {
  test.each(echoCases)("IA2. %s는 answer-echo 갈래와 같은 주소 규칙을 쓴다", (_type, build) => {
    expect(catalogAnswerEchoOf(build(), audioPortOf())).toEqual({
      kind: "answer-echo",
      source: AUDIO_SOURCE,
    });
  });

  test.each(echoCases)(
    "IA3. %s는 audioUrl이 없으면 null이고 포트를 부르지 않는다",
    (_type, build) => {
      const audioUrlOf = vi.fn<(path: string) => string | null>(() => "never");
      const item = build();
      const withoutUrl = { ...item, stimulus: { ...item.stimulus, audioUrl: undefined } };

      expect(catalogAnswerEchoOf(withoutUrl as typeof item, audioPortOf(audioUrlOf))).toBeNull();
      expect(audioUrlOf).not.toHaveBeenCalled();
    },
  );

  test.each(echoCases)("IA5. %s는 포트가 null을 내면 null이다", (_type, build) => {
    expect(
      catalogAnswerEchoOf(
        build(),
        audioPortOf(() => null),
      ),
    ).toBeNull();
  });
});

describe("규약 밖 id", () => {
  test.each(["U01/x", "u01.water/x", "u01 water", "audio:x"])(
    "IA3. 규약 밖 id %s는 null이고 포트를 부르지 않는다",
    (id) => {
      const audioUrlOf = vi.fn<(path: string) => string | null>(() => "never");

      expect(
        catalogListenAudioOf(listenSelect({ audioUrl: id }), audioPortOf(audioUrlOf)),
      ).toBeNull();
      expect(catalogAnswerEchoOf(wordOrder({ audioUrl: id }), audioPortOf(audioUrlOf))).toBeNull();
      expect(audioUrlOf).not.toHaveBeenCalled();
    },
  );

  test("IA1. 포트는 audio/<id>.m4a 상대 경로로 불린다", () => {
    const audioUrlOf = vi.fn<(path: string) => string | null>((path) => `x://${path}`);

    catalogListenAudioOf(listenSelect(), audioPortOf(audioUrlOf));

    expect(audioUrlOf).toHaveBeenCalledWith(`audio/${AUDIO_ID}.m4a`);
  });
});

describe("원문의 자리표시자", () => {
  test.each(listenCases)(
    "IA4. %s는 읽는 원문에 자리표시자가 있으면 null이다 — fill이 채워도",
    (_type, build) => {
      const item = build({ spoken: "{이름} 씨" });
      const port = audioPortOf(undefined, { fill: (text) => text.replaceAll("{이름}", "민아") });

      expect(catalogListenAudioOf(item, port)).toBeNull();
    },
  );

  test.each(echoCases)("IA4. %s는 읽는 원문에 자리표시자가 있으면 null이다", (_type, build) => {
    const item = build({ spoken: "{이름} 씨" });

    expect(catalogAnswerEchoOf(item, audioPortOf())).toBeNull();
  });
});

describe("읽는 원문의 자리", () => {
  test("IA6. SHADOW는 stimulus.audio가 없으면 stimulus.text.ko로 판정한다", () => {
    const plain = shadow({ withAudioText: false });
    const withPlaceholder = {
      ...plain,
      stimulus: { ...plain.stimulus, text: { ko: "{이름} 씨" } },
    };

    expect(catalogListenAudioOf(plain, audioPortOf())).toMatchObject({ kind: "listen" });
    expect(catalogListenAudioOf(withPlaceholder, audioPortOf())).toBeNull();
  });

  test("IA6. SHADOW는 stimulus.audio가 있으면 text의 자리표시자를 보지 않는다", () => {
    const item = shadow();
    const textHasPlaceholder = {
      ...item,
      stimulus: { ...item.stimulus, text: { ko: "{이름} 씨" } },
    };

    expect(catalogListenAudioOf(textHasPlaceholder, audioPortOf())).toMatchObject({
      kind: "listen",
    });
  });

  test("IA6. IMG_MATCH는 정답 보기의 ko로 판정한다", () => {
    const base = imgMatch();
    const wrongHasPlaceholder = {
      ...base,
      options: [base.options[0]!, { ...base.options[1]!, ko: "{이름}" }],
    };
    const correctHasPlaceholder = {
      ...base,
      options: [{ ...base.options[0]!, ko: "{이름}" }, base.options[1]!],
    };

    expect(catalogAnswerEchoOf(wrongHasPlaceholder, audioPortOf())).not.toBeNull();
    expect(catalogAnswerEchoOf(correctHasPlaceholder, audioPortOf())).toBeNull();
  });

  test("IA6. TRANSLATE_TO_EN은 stimulus.text.ko로 판정한다", () => {
    const base = translateToEn();
    const answerLikeOptionHasPlaceholder = {
      ...base,
      options: base.options.map((option) => ({ ...option, ko: "{이름}" })),
    };
    const textHasPlaceholder = { ...base, stimulus: { ...base.stimulus, text: { ko: "{이름}" } } };

    expect(catalogAnswerEchoOf(answerLikeOptionHasPlaceholder, audioPortOf())).not.toBeNull();
    expect(catalogAnswerEchoOf(textHasPlaceholder, audioPortOf())).toBeNull();
  });

  test("IA6. TRANSLATE_TO_KO · WORD_ORDER는 answers[0].ko로 판정한다", () => {
    const ko = translateToKo({ spoken: "{이름}" });
    const order = wordOrder({ spoken: "{이름}" });

    expect(catalogAnswerEchoOf(ko, audioPortOf())).toBeNull();
    expect(catalogAnswerEchoOf(order, audioPortOf())).toBeNull();
  });

  test("IA6. 원문이 아예 없으면 빈 문자열로 넘겨 자리표시자로 보지 않는다", () => {
    const item = listenSelect();
    const noText = { ...item, stimulus: { audioUrl: AUDIO_ID } };

    expect(catalogListenAudioOf(noText, audioPortOf())).toMatchObject({ kind: "listen" });
  });
});
