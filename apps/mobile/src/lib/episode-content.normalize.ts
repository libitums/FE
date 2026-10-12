import "background-only";

import type {
  DeliveryCut,
  DeliveryDialogueLine,
  DeliveryOption,
  DeliveryWord,
} from "./episode-content.schema";
import type {
  DecodeIssue,
  DecodeIssueCode,
  DialogueLine,
  EpisodeCut,
  Option,
  Stimulus,
  Text,
  Word,
} from "./episode-content.model";

// 와이어 → 도메인 변환의 공통 헬퍼와 컷 · 대화 · 단어 변환입니다.

export const issue = (code: DecodeIssueCode, path: string, message: string): DecodeIssue => ({
  code,
  path,
  message,
});

/** 값이 있을 때만 키를 싣습니다 — 도메인 객체에 `undefined` 값 키를 남기지 않습니다. */
export function maybe<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]?: V });
}

/** 빈 문자열 URL · ref는 「없음」입니다(계약 문서 §9). */
export const nonEmpty = (value: string | undefined): string | undefined =>
  value === undefined || value === "" ? undefined : value;

/** zod `path` 배열을 와이어 경로 `steps[0].items[3].options`로 잇습니다. */
export function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") {
      return `${acc}[${segment}]`;
    }
    const key = String(segment);
    return acc === "" ? key : `${acc}.${key}`;
  }, "");
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type WireText = { ko: string; roman?: string | undefined; en?: string | undefined };

export function toText(wire: WireText): Text {
  return { ko: wire.ko, ...maybe("roman", wire.roman), ...maybe("en", wire.en) };
}

export const toTexts = (wires: WireText[]): Text[] => wires.map(toText);
export const optText = (wire: WireText | undefined): Text | undefined =>
  wire === undefined ? undefined : toText(wire);

export function toOption(wire: DeliveryOption): Option {
  return {
    id: wire.id,
    ko: wire.ko,
    roman: wire.roman,
    ...maybe("en", wire.en),
    correct: wire.correct,
    ...maybe("whyWrong", wire.why_wrong),
  };
}

export type WireStimulus = {
  audio?: WireText | undefined;
  text?: WireText | undefined;
  image_brief?: string | undefined;
  audio_url?: string | undefined;
  image_url?: string | undefined;
};

export function toStimulus(wire: WireStimulus): Stimulus {
  return {
    ...maybe("audio", optText(wire.audio)),
    ...maybe("text", optText(wire.text)),
    ...maybe("imageBrief", wire.image_brief),
    ...maybe("audioUrl", nonEmpty(wire.audio_url)),
    ...maybe("imageUrl", nonEmpty(wire.image_url)),
  };
}

export function toCut(wire: DeliveryCut): EpisodeCut {
  const imageUrl = maybe("imageUrl", nonEmpty(wire.image_url));
  switch (wire.cut_kind) {
    case "speech":
      return {
        kind: "speech",
        index: wire.index,
        speaker: wire.speaker,
        line: toText(wire.line),
        aside: toText(wire.aside),
        imageBrief: wire.image_brief,
        ...imageUrl,
      };
    case "monologue":
      return {
        kind: "monologue",
        index: wire.index,
        speaker: wire.speaker,
        line: toText(wire.line),
        imageBrief: wire.image_brief,
        ...imageUrl,
      };
    case "narration":
      return {
        kind: "narration",
        index: wire.index,
        narration: toText(wire.narration),
        imageBrief: wire.image_brief,
        ...imageUrl,
      };
  }
}

export function toDialogueLine(wire: DeliveryDialogueLine): DialogueLine {
  return {
    seq: wire.seq,
    role: wire.role,
    text: toText(wire.text),
    ...maybe("textbook", optText(wire.textbook)),
    ...maybe("audioUrl", nonEmpty(wire.audio_url)),
  };
}

export function toWord(wire: DeliveryWord): Word {
  const example =
    wire.example_ko !== undefined && wire.example_roman !== undefined
      ? { ko: wire.example_ko, roman: wire.example_roman }
      : undefined;
  return {
    id: wire.id,
    ko: wire.ko,
    roman: wire.roman,
    glossEn: wire.gloss_en,
    role: wire.role,
    ...maybe("grade", wire.grade),
    ...maybe("example", example),
  };
}
