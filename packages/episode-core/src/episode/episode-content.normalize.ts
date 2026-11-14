import { KNOWN_ITEM_TYPES } from "./episode-content.schema";
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
  ItemEvent,
  ItemStory,
  Option,
  Stimulus,
  Text,
  TurnTile,
  Word,
} from "./episode-content.model";

// 와이어 → 도메인 변환의 공통 헬퍼와 컷 · 대화 · 단어 · 이야기 장면 변환입니다.

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

type WireStory = {
  line_id: string;
  hint_after_miss?: boolean | undefined;
  lead: { speaker: string; line: WireText; audio_url?: string | undefined }[];
  line: WireText;
  situation?: WireText | undefined;
  image_url?: string | undefined;
};

/** 이야기 문항(level-3 S8)의 장면 — 빈 녹음 · 그림은 키를 싣지 않습니다. */
function toItemStory(wire: WireStory): ItemStory {
  return {
    lineId: wire.line_id,
    hintAfterMiss: wire.hint_after_miss === true,
    lead: wire.lead.map((lead) => ({
      speaker: lead.speaker,
      line: toText(lead.line),
      ...maybe("audioUrl", nonEmpty(lead.audio_url)),
    })),
    line: toText(wire.line),
    ...maybe("situation", wire.situation === undefined ? undefined : toText(wire.situation)),
    ...maybe("imageUrl", nonEmpty(wire.image_url)),
  };
}

type WireItemCommon = {
  id: string;
  event: ItemEvent;
  ref?: string | undefined;
  level?: number | undefined;
  skill?: string | undefined;
  skill_level?: number | undefined;
  story?: WireStory | undefined;
};

/** 모든 문항이 함께 갖는 키 — 값이 없으면 키를 싣지 않습니다. */
export function itemBaseOf(item: WireItemCommon) {
  return {
    id: item.id,
    event: item.event,
    ...maybe("ref", nonEmpty(item.ref)),
    ...maybe("level", item.level),
    ...maybe("skill", nonEmpty(item.skill)),
    ...maybe("skillLevel", item.skill_level),
    ...maybe("story", item.story === undefined ? undefined : toItemStory(item.story)),
  };
}

/** TURN_ORDER 타일 — 화자가 있으면 싣습니다. */
export function toTurnTile(
  wire: WireText & { speaker?: TurnTile["speaker"] | undefined },
): TurnTile {
  return { ...toText(wire), ...maybe("speaker", wire.speaker) };
}

export const toTexts = (wires: WireText[]): Text[] => wires.map(toText);
export const optText = (wire: WireText | undefined): Text | undefined =>
  wire === undefined ? undefined : toText(wire);

/** 문자열이면 한국어 설명 하나, `{ko, en}` 객체(수준 5 · ADR-0145)면 한국어와 영어로 나눕니다. */
function whyWrongOf(wire: DeliveryOption["why_wrong"]): Pick<Option, "whyWrong" | "whyWrongEn"> {
  if (wire === undefined || typeof wire === "string") return maybe("whyWrong", wire);
  return { ...maybe("whyWrong", wire.ko), ...maybe("whyWrongEn", nonEmpty(wire.en)) };
}

export function toOption(wire: DeliveryOption): Option {
  return {
    id: wire.id,
    ko: wire.ko,
    roman: wire.roman,
    ...maybe("en", wire.en),
    correct: wire.correct,
    ...whyWrongOf(wire.why_wrong),
  };
}

export type WireStimulus = {
  audio?: WireText | undefined;
  text?: WireText | undefined;
  image_brief?: string | undefined;
  audio_url?: string | undefined;
  image_url?: string | undefined;
  en?: string | undefined;
};

export function toStimulus(wire: WireStimulus): Stimulus {
  return {
    ...maybe("audio", optText(wire.audio)),
    ...maybe("text", optText(wire.text)),
    ...maybe("imageBrief", wire.image_brief),
    ...maybe("audioUrl", nonEmpty(wire.audio_url)),
    ...maybe("imageUrl", nonEmpty(wire.image_url)),
    ...maybe("en", nonEmpty(wire.en)),
  };
}

export function toCut(wire: DeliveryCut): EpisodeCut {
  const imageUrl = maybe("imageUrl", nonEmpty(wire.image_url));
  const audioUrl = maybe("audioUrl", nonEmpty(wire.audio_url));
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
        ...audioUrl,
      };
    case "monologue":
      return {
        kind: "monologue",
        index: wire.index,
        speaker: wire.speaker,
        line: toText(wire.line),
        imageBrief: wire.image_brief,
        ...imageUrl,
        ...audioUrl,
      };
    case "narration":
      return {
        kind: "narration",
        index: wire.index,
        narration: toText(wire.narration),
        imageBrief: wire.image_brief,
        ...imageUrl,
        ...audioUrl,
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

/** `steps[*].items[*].type`이 닫힌 목록 밖인 자리 — 구조 검사보다 먼저 봅니다. */
/**
 * 모르는 형식 문항을 뺀 얕은 사본과 그 경고입니다 — 앞으로 생길 형식 하나가 에피소드 전체를 거부하지 않게
 * 합니다. 입력은 바꾸지 않습니다.
 */
export function withoutUnknownItems(input: Record<string, unknown>): {
  readonly input: Record<string, unknown>;
  readonly warnings: DecodeIssue[];
} {
  const warnings = findUnknownItemTypes(input);
  const steps = input["steps"];
  if (warnings.length === 0 || !Array.isArray(steps)) return { input, warnings };
  const known: readonly string[] = KNOWN_ITEM_TYPES;
  const isKnown = (item: unknown): boolean => {
    const type = isRecord(item) ? item["type"] : undefined;
    return typeof type !== "string" || known.includes(type);
  };
  const kept = steps.map((step: unknown) => {
    const items = isRecord(step) ? step["items"] : undefined;
    return isRecord(step) && Array.isArray(items)
      ? { ...step, items: items.filter(isKnown) }
      : step;
  });
  return { input: { ...input, steps: kept }, warnings };
}

export function findUnknownItemTypes(input: Record<string, unknown>): DecodeIssue[] {
  const known: readonly string[] = KNOWN_ITEM_TYPES;
  const issues: DecodeIssue[] = [];
  const steps = input["steps"];
  if (!Array.isArray(steps)) {
    return issues;
  }
  steps.forEach((step: unknown, i) => {
    const items = isRecord(step) ? step["items"] : undefined;
    if (!Array.isArray(items)) {
      return;
    }
    items.forEach((item: unknown, j) => {
      const type = isRecord(item) ? item["type"] : undefined;
      if (typeof type === "string" && !known.includes(type)) {
        issues.push(
          issue("unknown-item-type", `steps[${i}].items[${j}].type`, `unknown item type: ${type}`),
        );
      }
    });
  });
  return issues;
}
