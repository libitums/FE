// 테스트 지원 — 문항 음성 매핑 테스트의 주소 포트와 열두 유형 문항 빌더입니다. 제품 코드는 import하지 않습니다.
import type { LearningItem, Option } from "../lib/episode-content.model";
import type { CatalogLessonItemPort } from "./catalog-lesson-types";
import { opt, scriptFill, t } from "./catalog-screens.test-support";

type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;

export const cdnAudioUrlOf = (path: string): string => `https://cdn/${path}`;

/** 음성 주소 대역을 더한 매핑 포트입니다. `audioUrlOf`를 비우면 소리 없음 포트가 됩니다. */
export function audioPortOf(
  audioUrlOf: (path: string) => string | null = cdnAudioUrlOf,
  overrides: { fill?: CatalogLessonItemPort["fill"] } = {},
) {
  const port: CatalogLessonItemPort = {
    fill: overrides.fill ?? scriptFill,
    episodeId: "u01-water",
    glossOf: () => null,
    imageUrlOf: (path) => `https://cdn/${path}`,
    audioUrlOf,
  };
  return port;
}

export const AUDIO_ID = "u01-water/x";
export const AUDIO_SOURCE = "https://cdn/audio/u01-water/x.m4a";

const choices = (): Option[] => [opt("o1", "물", true, "water"), opt("o2", "불", false, "fire")];
const prompt = t("고르세요.", undefined, "Pick one.");

type Opts = { audioUrl?: string; spoken?: string };

/** 듣기 여섯 유형 — 원문은 `stimulus.audio.ko`(SHADOW는 없으면 `stimulus.text.ko`)입니다. */
export function listenSelect(o: Opts = {}): ItemOf<"LISTEN_SELECT"> {
  return {
    id: "L1",
    event: "R",
    type: "LISTEN_SELECT",
    prompt,
    stimulus: {
      audio: t(o.spoken ?? "물이에요", "mul-ieyo", "It is water"),
      audioUrl: o.audioUrl ?? AUDIO_ID,
    },
    options: choices(),
  };
}

export function minPairAb(o: Opts = {}): ItemOf<"MIN_PAIR_AB"> {
  return {
    id: "M1",
    event: "D",
    type: "MIN_PAIR_AB",
    prompt,
    stimulus: { audio: t(o.spoken ?? "불", "bul", "fire"), audioUrl: o.audioUrl ?? AUDIO_ID },
    options: choices(),
    feedback: { correct: t("맞아요", undefined, "Right") },
  };
}

export function replySelect(o: Opts = {}): ItemOf<"REPLY_SELECT"> {
  return {
    id: "R1",
    event: "R",
    type: "REPLY_SELECT",
    prompt,
    stimulus: {
      audio: t(o.spoken ?? "안녕하세요", "annyeonghaseyo", "Hello"),
      audioUrl: o.audioUrl ?? AUDIO_ID,
    },
    options: choices(),
    feedback: { correct: t("맞아요", undefined, "Right") },
  };
}

export function listenBuildItem(o: Opts = {}): ItemOf<"LISTEN_BUILD"> {
  return {
    id: "B1",
    event: "R",
    type: "LISTEN_BUILD",
    prompt,
    stimulus: {
      audio: t(o.spoken ?? "가나 다", "gana da", "ga na da"),
      audioUrl: o.audioUrl ?? AUDIO_ID,
    },
    tiles: [t("가나"), t("다"), t("라")],
    answers: [t("가나 다")],
  };
}

export function dictation(o: Opts = {}): ItemOf<"DICTATION"> {
  return {
    id: "D1",
    event: "R",
    type: "DICTATION",
    prompt,
    stimulus: {
      audio: t(o.spoken ?? "물이에요", "mul-ieyo", "It is water"),
      audioUrl: o.audioUrl ?? AUDIO_ID,
    },
    answers: [t("물이에요", "mul-ieyo")],
  };
}

export function shadow(o: Opts & { withAudioText?: boolean } = {}): ItemOf<"SHADOW"> {
  return {
    id: "H1",
    event: "R",
    type: "SHADOW",
    prompt,
    stimulus: {
      ...(o.withAudioText === false
        ? {}
        : { audio: t(o.spoken ?? "따라 해요", "ttara haeyo", "Repeat") }),
      text: t("본문이에요", "bonmuniyeyo", "Body text"),
      audioUrl: o.audioUrl ?? AUDIO_ID,
    },
    answers: [t("따라 해요", "ttara haeyo", "Repeat")],
  };
}

/** 정답 뒤 재생 여섯 유형 — 원문은 유형마다 다릅니다(`answers[0].ko` · `stimulus.text.ko` · 정답 보기 `ko`). */
export function translateToKo(o: Opts = {}): ItemOf<"TRANSLATE_TO_KO"> {
  return {
    id: "K1",
    event: "R",
    type: "TRANSLATE_TO_KO",
    prompt,
    stimulus: { en: "It is water", audioUrl: o.audioUrl ?? AUDIO_ID },
    answers: [t(o.spoken ?? "물이에요", "mul-ieyo", "It is water")],
  };
}

export function translateToEn(o: Opts = {}): ItemOf<"TRANSLATE_TO_EN"> {
  return {
    id: "E1",
    event: "R",
    type: "TRANSLATE_TO_EN",
    prompt,
    stimulus: { text: t(o.spoken ?? "물", "mul", "water"), audioUrl: o.audioUrl ?? AUDIO_ID },
    options: [opt("o1", "water", true), opt("o2", "fire", false)],
  };
}

export function wordOrder(o: Opts = {}): ItemOf<"WORD_ORDER"> {
  return {
    id: "W1",
    event: "R",
    type: "WORD_ORDER",
    prompt,
    stimulus: { en: "It is water", audioUrl: o.audioUrl ?? AUDIO_ID },
    tiles: [t("물이"), t("에요")],
    answers: [t(o.spoken ?? "물이 에요", "muri eyo", "It is water")],
  };
}

export function syllableBuildItem(o: Opts = {}): ItemOf<"SYLLABLE_BUILD"> {
  return {
    id: "Y1",
    event: "R",
    type: "SYLLABLE_BUILD",
    prompt,
    stimulus: { en: "card", audioUrl: o.audioUrl ?? AUDIO_ID },
    tiles: [t("카"), t("드"), t("찮")],
    answers: [t(o.spoken ?? "카드", "kadeu", "card")],
  };
}

export function speakWord(o: Opts = {}): ItemOf<"SPEAK_WORD"> {
  return {
    id: "P1",
    event: "R",
    type: "SPEAK_WORD",
    prompt,
    stimulus: { imageUrl: "images/card.jpg", audioUrl: o.audioUrl ?? AUDIO_ID },
    answers: [t(o.spoken ?? "카드", "kadeu", "card")],
  };
}

export function imgMatch(o: Opts = {}): ItemOf<"IMG_MATCH"> {
  return {
    id: "G1",
    event: "R",
    type: "IMG_MATCH",
    prompt,
    stimulus: { imageUrl: "images/card.jpg", audioUrl: o.audioUrl ?? AUDIO_ID },
    options: [opt("o1", o.spoken ?? "물", true, "water"), opt("o2", "불", false, "fire")],
  };
}
