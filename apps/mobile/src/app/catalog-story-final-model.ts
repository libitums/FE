// 여정맵 이야기 파이널(level-3 S8)의 모델입니다 — 이야기 문항을 화면이 그릴 수 있는 턴으로 바꿉니다(순수).
//
// RP 턴 파이널(`catalog-final-model.ts`)은 롤플레이 탭이 계속 씁니다. 화면 경로가 닿는 파일이라 `lib/episode-*`는
// 타입만 가져옵니다.

import { contentAudioSourceOf } from "../lib/content-audio";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem } from "../lib/episode-content";
import type { DialogueLine, Text } from "../lib/episode-content.model";
import type { NonEmpty } from "../lib/non-empty";
import type { CatalogUnitKey } from "../lib/catalog-progress";
import type {
  StoryFinalOption,
  StoryFinalTile,
  StoryFinalTurn,
} from "../screens/catalog-story-final/catalog-story-final.contract";
import { catalogStoryFinalSourceOf } from "../screens/journey-map/catalog-map-story";
import { englishOf, koOf, latinOf } from "./catalog-item-text";
import { catalogRoleplayLinesOf } from "./catalog-final-model";
import type { CatalogRoleplayLines } from "./catalog-final-model";
import type { CatalogFill, CatalogItemPort } from "./catalog-lesson-plan";
import { shuffledOrder } from "./catalog-shuffle";

export type CatalogStoryFinalPort = CatalogItemPort & {
  /** `episode.counterpart` — 장면 앞 줄에 화자가 없을 때. */
  readonly counterpart: string;
  /** 표지 컷 중 그림이 있는 마지막 컷의 절대 URL입니다. */
  readonly sceneImageUrl: string | null;
  readonly imageUrlOf: (relativePath: string) => string | null;
};

export type CatalogStoryFinalPlan = {
  readonly episodeId: string;
  readonly ordinal: number;
  readonly turns: readonly StoryFinalTurn[];
  readonly skippedItemCount: number;
};

/** 원천 유닛 판정의 정본은 맵 파생입니다(구획 · 계획이 같은 규칙을 씁니다). */
export { catalogStoryFinalSourceOf };

function nonEmpty<T>(values: readonly T[]): NonEmpty<T> | null {
  const [first, ...rest] = values;
  return first === undefined ? null : [first, ...rest];
}

/** `___`이 든 문맥만 틀입니다(대답 고르기의 문맥은 상황 글이라 틀이 아닙니다). */
function templateOf(port: CatalogItemPort, context: Text | undefined): string | null {
  const ko = context === undefined ? "" : koOf(port, context.ko);
  return ko.includes("___") ? ko : null;
}

type TurnBody =
  | {
      readonly kind: "choice";
      readonly options: NonEmpty<StoryFinalOption>;
      readonly correctIndex: number;
    }
  | {
      readonly kind: "tiles";
      readonly tiles: NonEmpty<StoryFinalTile>;
      readonly accepted: NonEmpty<string>;
      readonly joiner: " " | "";
    }
  | { readonly kind: "write"; readonly syllables: NonEmpty<string> };

function bodyOf(item: LearningItem, port: CatalogItemPort): TurnBody | null {
  switch (item.type) {
    case "REPLY_SELECT":
    case "CLOZE_CHOICE": {
      const options = nonEmpty(
        item.options.map((option) => ({
          ko: koOf(port, option.ko),
          roman: latinOf(port, option.roman) ?? null,
        })),
      );
      const correctIndex = item.options.findIndex((option) => option.correct);
      if (options === null || correctIndex === -1 || options.some((option) => option.ko === ""))
        return null;
      return { kind: "choice", options, correctIndex };
    }
    case "CLOZE":
    case "WORD_ORDER":
    case "SYLLABLE_BUILD": {
      const original = item.tiles.map((tile) => ({
        ko: koOf(port, tile.ko),
        roman: latinOf(port, tile.roman) ?? "",
      }));
      const accepted = nonEmpty(
        item.answers.map((answer) => koOf(port, answer.ko)).filter((ko) => ko !== ""),
      );
      if (accepted === null || original.length === 0 || original.some((tile) => tile.ko === ""))
        return null;
      const order = shuffledOrder(`${port.episodeId}/${item.id}`, original.length);
      const tiles = nonEmpty(order.map((index) => original[index] ?? { ko: "", roman: "" }));
      if (tiles === null) return null;
      return { kind: "tiles", tiles, accepted, joiner: item.type === "SYLLABLE_BUILD" ? "" : " " };
    }
    case "HANGUL_WRITE": {
      const syllables = nonEmpty([...koOf(port, item.answers[0]?.ko ?? "").replace(/\s/g, "")]);
      return syllables === null ? null : { kind: "write", syllables };
    }
    default:
      return null;
  }
}

function contextOf(item: LearningItem): Text | undefined {
  return "context" in item ? item.context : undefined;
}

function correctNoteOf(port: CatalogItemPort, item: LearningItem): string | null {
  const feedback = "feedback" in item ? item.feedback : undefined;
  return englishOf(port, feedback?.correct.en) ?? null;
}

/** 이야기 문항이 아니거나 그릴 수 없는 모양이면 `null`(건너뜀)입니다. */
export function catalogStoryFinalTurnOf(
  item: LearningItem,
  port: CatalogStoryFinalPort,
): StoryFinalTurn | null {
  const story = item.story;
  if (story === undefined || !("prompt" in item)) return null;
  const lead = story.lead[story.lead.length - 1];
  const lineKo = lead === undefined ? "" : koOf(port, lead.line.ko);
  const answer = koOf(port, story.line.ko);
  const body = bodyOf(item, port);
  if (body === null || lead === undefined || lineKo === "" || answer === "") return null;
  return {
    id: item.id,
    instruction: englishOf(port, item.prompt.en) ?? "",
    speakerName: koOf(port, lead.speaker) || port.counterpart.trim(),
    line: {
      ko: lineKo,
      roman: latinOf(port, lead.line.roman) ?? null,
      en: englishOf(port, lead.line.en) ?? null,
    },
    template: templateOf(port, contextOf(item)),
    replyTranslation: englishOf(port, story.line.en) ?? null,
    answer,
    correctNote: correctNoteOf(port, item),
    imageUrl: story.imageUrl === undefined ? port.sceneImageUrl : port.imageUrlOf(story.imageUrl),
    ...body,
  };
}

type LinesOf = (lineId: string, dialogue: readonly DialogueLine[]) => CatalogRoleplayLines | null;

/** 턴에 붙일 소리 — 장면 앞 줄 녹음이 먼저이고, 없으면 `line_id`의 대화 줄입니다. 있는 것만 키로 냅니다. */
function audioOf(
  item: LearningItem,
  dialogue: readonly DialogueLine[],
  contentUrlOf: (relativePath: string) => string | null,
  linesOf: LinesOf,
): Pick<StoryFinalTurn, "counterpartAudioSource" | "replyAudioSource"> {
  const story = item.story;
  if (story === undefined) return {};
  const lead = story.lead[story.lead.length - 1];
  const lines = linesOf(story.lineId, dialogue);
  const counterpart =
    contentAudioSourceOf(lead?.audioUrl, lead?.line.ko ?? "", contentUrlOf) ??
    (lines === null
      ? null
      : contentAudioSourceOf(lines.counterpart.audioUrl, lines.counterpart.text.ko, contentUrlOf));
  const reply =
    lines === null
      ? null
      : contentAudioSourceOf(lines.player.audioUrl, lines.player.text.ko, contentUrlOf);
  return {
    ...(counterpart === null ? {} : { counterpartAudioSource: counterpart }),
    ...(reply === null ? {} : { replyAudioSource: reply }),
  };
}

export function catalogStoryFinalPlanOf(
  entry: Extract<CatalogEntry, { status: "ready" }>,
  ordinal: number,
  sourceKey: CatalogUnitKey,
  fill: CatalogFill,
  imageUrlOf: (relativePath: string) => string | null,
  linesOf: LinesOf = catalogRoleplayLinesOf,
): CatalogStoryFinalPlan {
  const scenePath = [...entry.episode.prologue]
    .reverse()
    .find((cut) => cut.imageUrl !== undefined)?.imageUrl;
  const port: CatalogStoryFinalPort = {
    fill,
    episodeId: entry.id,
    counterpart: entry.episode.counterpart,
    sceneImageUrl: scenePath === undefined ? null : imageUrlOf(scenePath),
    imageUrlOf,
  };
  const items = entry.episode.units.find((unit) => unit.id === sourceKey)?.items ?? [];
  const attempts = items.map((item) => {
    const turn = catalogStoryFinalTurnOf(item, port);
    return turn === null
      ? null
      : { ...turn, ...audioOf(item, entry.episode.dialogue, imageUrlOf, linesOf) };
  });
  const turns = attempts.filter((turn): turn is StoryFinalTurn => turn !== null);
  return { episodeId: entry.id, ordinal, turns, skippedItemCount: attempts.length - turns.length };
}
