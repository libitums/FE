// 정답 뒤 음성의 출처를 에피소드 안 녹음에서 찾습니다(순수, ADR-0172). 문항 자신에게 음성 id가 없어도 정답 한국어와
// 글자 그대로 같은 줄이 이 에피소드에 녹음돼 있으면 그 id를 씁니다 — 새 음성 파일은 만들지 않습니다.
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import type { Episode, EpisodeCut, LearningItem, Option } from "../lib/episode-content.model";
import type { AnswerEchoItemType, ListenItemType } from "../lib/question-audio";

/**
 * 정답 한국어 원문(치환 전)으로 녹음 id들을 찾습니다 — 본 차례대로, 없으면 빈 목록. 여럿을 내는 까닭은 레슨 단위 받기에서
 * 다른 유닛의 녹음 파일은 아직 기기에 없을 수 있어서, 받은 파일이 있는 id를 고르게 하기 위해서입니다.
 */
export type RecordedAudioOf = (ko: string) => readonly string[];

/** 색인이 읽는 에피소드 조각입니다. */
export type RecordedAudioSources = Pick<
  Episode,
  "prologue" | "dialogue" | "units" | "finalTest" | "epilogue"
>;

type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;
type SoundItem = ItemOf<ListenItemType | AnswerEchoItemType>;

const BLANK = "___";

const correctKoOf = (options: readonly Option[] | undefined): string | undefined =>
  options?.find((option) => option.correct)?.ko;

/** 소리가 읽는 원문입니다 — 치환 **전** 값이라 자리표시자가 남아 있는지 가릴 수 있습니다. 없으면 `""`. */
export function spokenKoOf(item: SoundItem): string {
  switch (item.type) {
    case "LISTEN_SELECT":
    case "MIN_PAIR_AB":
    case "REPLY_SELECT":
    case "LISTEN_BUILD":
    case "DICTATION":
      return item.stimulus.audio?.ko ?? "";
    case "SHADOW":
      return item.stimulus.audio?.ko ?? item.stimulus.text?.ko ?? "";
    case "TRANSLATE_TO_EN":
      return item.stimulus.text?.ko ?? "";
    case "TRANSLATE_TO_KO":
    case "WORD_ORDER":
    case "SYLLABLE_BUILD":
    case "SPEAK_WORD":
      return item.answers[0]?.ko ?? "";
    case "IMG_MATCH":
      return correctKoOf(item.options) ?? "";
  }
}

/** 문맥의 첫 `___`를 정답으로 채운 문장입니다. 빈칸 · 정답이 없으면 `null`. */
function filledOf(context: string | undefined, answer: string | undefined): string | null {
  if (context === undefined || answer === undefined || !context.includes(BLANK)) return null;
  return context.replace(BLANK, answer);
}

/** 정답 한국어 원문(치환 전)입니다. 한 문장으로 정할 수 없는 유형이면 `null`. */
export function answerEchoTextOf(item: LearningItem): string | null {
  switch (item.type) {
    case "ROLE_LINE":
    case "REPLY_SELECT":
    case "CULTURE_CHECK":
      return correctKoOf(item.options) ?? null;
    case "CLOZE":
    case "CLOZE_TYPING":
      return filledOf(item.context.ko, item.answers[0]?.ko);
    case "CLOZE_CHOICE":
      return filledOf(item.context.ko, correctKoOf(item.options));
    case "PARTICLE_FILL":
      return filledOf(item.stimulus.text?.ko, correctKoOf(item.options));
    case "SENT_BUILD":
      return item.answers[0]?.ko ?? null;
    case "TRANSLATE_TO_KO":
    case "TRANSLATE_TO_EN":
    case "WORD_ORDER":
    case "SYLLABLE_BUILD":
    case "SPEAK_WORD":
    case "IMG_MATCH":
      return spokenKoOf(item) || null;
    // 조사 한 조각(PARTICLE_SWAP) · 여러 줄(TURN_ORDER · PAIR_MATCH) · 카드 · 최종 테스트 · 듣기가 곧 정답인 유형.
    default:
      return null;
  }
}

const ANSWER_ECHO_TYPES: ReadonlySet<LearningItem["type"]> = new Set([
  "TRANSLATE_TO_KO",
  "TRANSLATE_TO_EN",
  "WORD_ORDER",
  "SYLLABLE_BUILD",
  "SPEAK_WORD",
  "IMG_MATCH",
]);

/**
 * 문항 자신의 음성 id입니다 — 정답 뒤 음성 여섯만 수준 5의 `answerAudioUrl`까지 봅니다. 듣기 유형은 `stimulus.audioUrl`뿐입니다
 * (듣기 자동 재생 음성을 바꾸지 않습니다).
 */
export function ownAudioIdOf(item: SoundItem): string | undefined {
  const own = "stimulus" in item ? item.stimulus?.audioUrl : undefined;
  if (own !== undefined && own !== "") return own;
  if (!ANSWER_ECHO_TYPES.has(item.type)) return undefined;
  return "answerAudioUrl" in item ? item.answerAudioUrl : undefined;
}

/** 띄어쓰기도 문장부호도 없는 낱말 하나 — 같은 글자의 다른 뜻 녹음(「배」 · 「눈」)이 있을 수 있어 색인에서 찾지 않습니다. */
export function isBareWord(ko: string): boolean {
  return !/[\s.,!?…~]/.test(ko.trim());
}

function itemPairsOf(
  item: LearningItem,
  add: (ko: string | undefined, id: string | undefined) => void,
) {
  for (const lead of item.story?.lead ?? []) add(lead.line.ko, lead.audioUrl);
  switch (item.type) {
    case "VOCAB_CARD":
      add(item.context.ko, item.audioUrl);
      add(item.example?.ko, item.exampleAudioUrl);
      return;
    case "ROLEPLAY_TURN":
    case "CULTURE_CARD":
    case "PARTICLE_FILL":
    case "PARTICLE_SWAP":
      add(item.stimulus.audio?.ko ?? item.stimulus.text?.ko, item.stimulus.audioUrl);
      return;
    case "LISTEN_SELECT":
    case "MIN_PAIR_AB":
    case "REPLY_SELECT":
    case "LISTEN_BUILD":
    case "DICTATION":
    case "SHADOW":
    case "TRANSLATE_TO_EN":
    case "TRANSLATE_TO_KO":
    case "WORD_ORDER":
    case "SYLLABLE_BUILD":
    case "SPEAK_WORD":
    case "IMG_MATCH":
      add(
        spokenKoOf(item),
        ownAudioIdOf(item) ?? ("answerAudioUrl" in item ? item.answerAudioUrl : undefined),
      );
      return;
    default:
      return;
  }
}

function cutKoOf(cut: EpisodeCut): string {
  return cut.kind === "narration" ? cut.narration.ko : cut.line.ko;
}

/** 이 에피소드에서 글과 짝인 음성 id를 모은 색인입니다. 같은 글이면 본 차례대로 모읍니다(겹친 id는 한 번). */
export function recordedAudioIndexOf(episode: RecordedAudioSources): RecordedAudioOf {
  const index = new Map<string, string[]>();
  const add = (ko: string | undefined, id: string | undefined): void => {
    const key = ko?.trim() ?? "";
    if (key === "" || id === undefined || id === "") return;
    const ids = index.get(key);
    if (ids === undefined) index.set(key, [id]);
    else if (!ids.includes(id)) ids.push(id);
  };
  for (const line of episode.dialogue) add(line.text.ko, line.audioUrl);
  for (const cut of [...episode.prologue, ...episode.epilogue]) add(cutKoOf(cut), cut.audioUrl);
  for (const unit of episode.units) for (const item of unit.items) itemPairsOf(item, add);
  for (const item of episode.finalTest.items) itemPairsOf(item, add);
  return (ko) => index.get(ko.trim()) ?? [];
}
