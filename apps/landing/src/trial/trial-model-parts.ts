// 체험판 화면 모델의 조각(컷 · 낱말 · 고르기 · 문화 · 턴)을 만드는 순수 함수입니다. 조립은 `trial-model-build.ts`.
// 컷 판정은 앱의 표지 컷과 같습니다 — 화자가 빈 대사는 내레이션, 「나」 화자는 self, 독백은 thought.

import { contentAudioSourceOf, resolveContentUrlSafe } from "@libitums/episode-core/content-url";
import {
  EPISODE_SELF_SPEAKER,
  roleplayLinesOf,
  type Episode,
  type EpisodeCut,
  type LearningItem,
  type Option,
  type Text,
} from "@libitums/episode-core/episode";
import type { NonEmpty } from "@libitums/episode-core/judge";
import { shuffledOrder } from "@libitums/episode-core/shuffle";

import type {
  TrialAssetPort,
  TrialCulture,
  TrialCut,
  TrialImageMatch,
  TrialModelError,
  TrialOption,
  TrialReplySelect,
  TrialSpeaker,
  TrialText,
  TrialTile,
  TrialTurn,
  TrialVocab,
} from "./trial-model.contract";

/** 고른 단계 — 낱말 카드 · 그림 고르기 · 대답 고르기 · 문화 카드. 엔딩은 post_cuts 앞 둘. */
export const PICK = { vocab: "S1", imageMatch: "S3", replySelect: "S9", culture: "S12" } as const;
export const EPILOGUE_CUTS = 2;

export type Built<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: TrialModelError };

export const built = <T>(value: T): Built<T> => ({ ok: true, value });
export const failed = (code: TrialModelError["code"], path: string): Built<never> => ({
  ok: false,
  error: { code, path },
});

const filled = (value: string | undefined): string | null =>
  value === undefined || value.trim() === "" ? null : value;

function textOf(text: Text): TrialText {
  return { ko: text.ko, roman: filled(text.roman), en: filled(text.en) };
}

const optionOf = (option: Option): TrialOption => ({
  ko: option.ko,
  roman: filled(option.roman),
  en: filled(option.en),
});

function nonEmpty<T>(values: readonly T[]): NonEmpty<T> | null {
  const [first, ...rest] = values;
  return first === undefined ? null : [first, ...rest];
}

/** 주소 도우미 — 기준 주소가 비면 음성은 전부 null(소리 없는 체험판). */
export function addressesOf(port: TrialAssetPort) {
  const audioOf = (id: string | undefined, spokenKo: string): string | null =>
    port.contentBase === ""
      ? null
      : contentAudioSourceOf(id, spokenKo, (path) => resolveContentUrlSafe(port.contentBase, path));
  const imageOf = (path: string | undefined): string | null =>
    path === undefined ? null : port.imageUrlOf(path);
  return { audioOf, imageOf };
}

export type Addresses = ReturnType<typeof addressesOf>;

function speakerOf(speaker: string): TrialSpeaker | null {
  const name = speaker.trim();
  if (name === "") return null;
  return name === EPISODE_SELF_SPEAKER ? { kind: "self" } : { kind: "named", name };
}

function cutOf(cut: EpisodeCut, at: Addresses): TrialCut {
  const imageUrl = at.imageOf(cut.imageUrl);
  if (cut.kind === "narration") {
    const text = textOf(cut.narration);
    const audioUrl = at.audioOf(cut.audioUrl, cut.narration.ko);
    return {
      index: cut.index,
      voice: "narration",
      speaker: null,
      text,
      aside: null,
      imageUrl,
      audioUrl,
    };
  }
  const speaker = speakerOf(cut.speaker);
  const audioUrl = at.audioOf(cut.audioUrl, cut.line.ko);
  const text = textOf(cut.line);
  if (speaker === null) {
    return { index: cut.index, voice: "narration", speaker, text, aside: null, imageUrl, audioUrl };
  }
  const voice = cut.kind === "monologue" ? "thought" : "speech";
  const aside = cut.kind === "speech" ? textOf(cut.aside) : null;
  return { index: cut.index, voice, speaker, text, aside, imageUrl, audioUrl };
}

export function cutsOf(
  cuts: readonly EpisodeCut[],
  path: string,
  at: Addresses,
): Built<NonEmpty<TrialCut>> {
  const views = nonEmpty(cuts.map((cut) => cutOf(cut, at)));
  return views === null ? failed("step-missing", path) : built(views);
}

export type ItemType = LearningItem["type"];
export type ItemOf<T extends ItemType> = Extract<LearningItem, { type: T }>;

/** 단계 `stepId`의 첫 `type` 문항. 단계가 없으면 step-missing, 그 유형 문항이 없으면 item-malformed. */
export function itemIn<T extends ItemType>(
  episode: Episode,
  stepId: string,
  type: T,
): Built<ItemOf<T>> {
  const unit = episode.units.find((candidate) => candidate.id === stepId);
  if (unit === undefined) return failed("step-missing", stepId);
  const item = unit.items.find((candidate): candidate is ItemOf<T> => candidate.type === type);
  return item === undefined ? failed("item-malformed", `${stepId}.${type}`) : built(item);
}

export function vocabOf(item: ItemOf<"VOCAB_CARD">, at: Addresses): TrialVocab {
  return {
    itemId: item.id,
    word: textOf(item.context),
    example: item.example === undefined ? null : textOf(item.example),
    audioUrl: at.audioOf(item.audioUrl, item.context.ko),
    exampleAudioUrl:
      item.example === undefined ? null : at.audioOf(item.exampleAudioUrl, item.example.ko),
  };
}

type ChoiceCore = {
  readonly options: NonEmpty<TrialOption>;
  readonly answerIndex: number;
  readonly answer: Option;
};

function choiceCoreOf(options: readonly Option[], path: string): Built<ChoiceCore> {
  const views = nonEmpty(options.map(optionOf));
  const answerIndex = options.findIndex((option) => option.correct);
  const answer = options[answerIndex];
  if (views === null || answer === undefined) return failed("item-malformed", `${path}.options`);
  return built({ options: views, answerIndex, answer });
}

export function imageMatchOf(
  item: ItemOf<"IMG_MATCH">,
  stepId: string,
  at: Addresses,
): Built<TrialImageMatch> {
  const path = `${stepId}/${item.id}`;
  const core = choiceCoreOf(item.options, path);
  if (!core.ok) return core;
  const prompt = filled(core.value.answer.en);
  const imageUrl = at.imageOf(item.stimulus.imageUrl);
  if (prompt === null) return failed("item-malformed", `${path}.options.en`);
  if (imageUrl === null) return failed("item-malformed", `${path}.stimulus.imageUrl`);
  const { options, answerIndex, answer } = core.value;
  return built({
    itemId: item.id,
    instruction: item.prompt.en ?? "",
    options,
    answerIndex,
    audioUrl: at.audioOf(item.stimulus.audioUrl, answer.ko),
    prompt,
    imageUrl,
  });
}

export function replySelectOf(
  item: ItemOf<"REPLY_SELECT">,
  stepId: string,
  at: Addresses,
): Built<TrialReplySelect> {
  const path = `${stepId}/${item.id}`;
  const core = choiceCoreOf(item.options, path);
  if (!core.ok) return core;
  const line = item.stimulus.audio;
  if (line === undefined) return failed("item-malformed", `${path}.stimulus.audio`);
  const { options, answerIndex } = core.value;
  return built({
    itemId: item.id,
    instruction: item.prompt.en ?? "",
    options,
    answerIndex,
    audioUrl: at.audioOf(item.stimulus.audioUrl, line.ko),
    line: textOf(line),
  });
}

export function cultureOf(
  item: ItemOf<"CULTURE_CARD">,
  stepId: string,
  at: Addresses,
): Built<TrialCulture> {
  const body = item.stimulus.text;
  if (body === undefined) return failed("item-malformed", `${stepId}/${item.id}.stimulus.text`);
  return built({
    itemId: item.id,
    title: textOf(item.context),
    body: textOf(body),
    tip: textOf(item.feedback.correct),
    imageUrl: at.imageOf(item.stimulus.imageUrl),
  });
}

function turnOf(item: ItemOf<"ROLEPLAY_TURN">, episode: Episode, at: Addresses): Built<TrialTurn> {
  const path = `RP/${item.id}`;
  const order = shuffledOrder(`${episode.id}/${item.id}`, item.tiles.length);
  const tiles = nonEmpty(
    order.flatMap((original): TrialTile[] => {
      const tile = item.tiles[original];
      return tile === undefined ? [] : [{ ko: tile.ko, roman: filled(tile.roman) }];
    }),
  );
  const accepted = nonEmpty(
    item.answers.map((answer) => answer.ko).filter((ko) => ko.trim() !== ""),
  );
  if (tiles === null) return failed("item-malformed", `${path}.tiles`);
  if (accepted === null) return failed("item-malformed", `${path}.answers`);
  const reply = item.answers[0];
  const lines = roleplayLinesOf(item.roleplay.lineId, episode.dialogue);
  return built({
    itemId: item.id,
    line: textOf(item.context),
    tiles,
    accepted,
    replyTranslation: filled(reply?.en) ?? filled(item.stimulus.text?.en),
    replyRoman: filled(reply?.roman),
    counterpartAudioUrl:
      lines === null ? null : at.audioOf(lines.counterpart.audioUrl, lines.counterpart.text.ko),
    replyAudioUrl: lines === null ? null : at.audioOf(lines.player.audioUrl, lines.player.text.ko),
  });
}

export function turnsOf(episode: Episode, at: Addresses): Built<NonEmpty<TrialTurn>> {
  const items = episode.finalTest.items.filter(
    (item): item is ItemOf<"ROLEPLAY_TURN"> => item.type === "ROLEPLAY_TURN",
  );
  const turns: TrialTurn[] = [];
  for (const item of items) {
    const turn = turnOf(item, episode, at);
    if (!turn.ok) return turn;
    turns.push(turn.value);
  }
  const all = nonEmpty(turns);
  return all === null ? failed("step-missing", "RP") : built(all);
}
