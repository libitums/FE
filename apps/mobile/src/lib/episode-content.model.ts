// 에피소드 콘텐츠의 **도메인 모델**입니다(타입만). 와이어(delivery-2 JSON)는
// `episode-content.schema.ts`가 검사하고, `decodeEpisode`가 이 모양으로 바꿉니다.
// 와이어 정본은 `docs/specs/episode-content-json-contract.md`입니다.

export type Text = { ko: string; roman?: string; en?: string };
export type Option = {
  id: string;
  ko: string;
  roman: string;
  en?: string;
  correct: boolean;
  whyWrong?: string;
};
export type Stimulus = {
  audio?: Text;
  text?: Text;
  imageBrief?: string;
  audioUrl?: string;
  imageUrl?: string;
  /** 와이어 `stimulus.en` — 옮길 영어 원문(TRANSLATE_TO_KO · WORD_ORDER · SYLLABLE_BUILD). 빈 값은 없음. */
  en?: string;
};

export type EpisodeCut =
  | {
      kind: "speech";
      index: number;
      speaker: string;
      line: Text;
      aside: Text;
      imageBrief: string;
      imageUrl?: string;
      audioUrl?: string;
    }
  | {
      kind: "monologue";
      index: number;
      speaker: string;
      line: Text;
      imageBrief: string;
      imageUrl?: string;
      audioUrl?: string;
    }
  | {
      kind: "narration";
      index: number;
      narration: Text;
      imageBrief: string;
      imageUrl?: string;
      audioUrl?: string;
    };

export type DialogueLine = {
  seq: number;
  role: "counterpart" | "player";
  text: Text;
  textbook?: Text;
  audioUrl?: string;
};

/** 와이어 `event` — E 노출 · R 회상 · D 변별(2026-10-15 MIN_PAIR_AB). */
export type ItemEvent = "E" | "R" | "D";

type ItemBase<T extends string> = {
  id: string;
  type: T;
  event: ItemEvent;
  ref?: string;
  /** 디코드만 하고 쓰지 않습니다(난이도 · 스킬은 뒤 작업). `skill`은 콘텐츠의 불투명 문자열입니다. */
  level?: number;
  skill?: string;
  skillLevel?: number;
};

/** 문항 피드백의 정답 줄 — `feedback.correct`. */
export type CorrectFeedback = { correct: Text };
/** TURN_ORDER 타일 — 2026-10-15부터 화자가 실려 옵니다. */
export type TurnTile = Text & { speaker?: DialogueLine["role"] };

export type LearningItem =
  | (ItemBase<"VOCAB_CARD"> & { context: Text; example?: Text; cardKind: string })
  | (ItemBase<"CLOZE"> & { prompt: Text; context: Text; tiles: Text[]; answers: Text[] })
  | (ItemBase<"IMG_MATCH"> & { prompt: Text; stimulus: Stimulus; options: Option[] })
  | (ItemBase<"WORD_ORDER"> & {
      prompt: Text;
      stimulus?: Stimulus;
      tiles: Text[];
      answers: Text[];
    })
  | (ItemBase<"LISTEN_SELECT"> & {
      prompt: Text;
      context?: Text;
      stimulus: Stimulus;
      options?: Option[];
    })
  | (ItemBase<"TURN_ORDER"> & { prompt: Text; context: Text; tiles: TurnTile[]; answer: number[] })
  | (ItemBase<"ROLE_LINE"> & {
      prompt: Text;
      context: Text;
      options: Option[];
      feedback: { correct: Text; wrong?: Text; wrongOption?: string };
    })
  | (ItemBase<"TRANSLATE_TO_KO"> & { prompt: Text; stimulus?: Stimulus; answers: Text[] })
  | (ItemBase<"TRANSLATE_TO_EN"> & { prompt: Text; stimulus: Stimulus; options: Option[] })
  | (ItemBase<"DICTATION"> & { prompt: Text; stimulus: Stimulus; answers: Text[] })
  | (ItemBase<"SENT_BUILD"> & { prompt: Text; context: Text; answers: Text[] })
  | (ItemBase<"PAIR_MATCH"> & {
      prompt: Text;
      tiles: Text[];
      pairs: { left: Text; right: string }[];
    })
  | (ItemBase<"ROLEPLAY_TURN"> & {
      prompt: Text;
      context: Text;
      stimulus: Stimulus;
      tiles: Text[];
      answers: Text[];
      feedback: { correct: Text };
      roleplay: { lineId: string; tilesGloss: { tile: string; en?: string }[] };
    })
  | AddedLearningItem;

/** 2026-10-15에 더한 11종(와이어 `episode-content.schema-items.ts`). `ItemOf<T>`로 좁힐 수 있게 유형마다 한 갈래입니다. */
type StimulusChoice<T extends string> = ItemBase<T> & {
  prompt: Text;
  stimulus: Stimulus;
  options: Option[];
  feedback: CorrectFeedback;
};
type TilesBuild<T extends string> = ItemBase<T> & {
  prompt: Text;
  stimulus: Stimulus;
  tiles: Text[];
  answers: Text[];
};
type Speech<T extends string> = ItemBase<T> & { prompt: Text; stimulus: Stimulus; answers: Text[] };

export type AddedLearningItem =
  | (ItemBase<"CLOZE_CHOICE"> & {
      prompt: Text;
      context: Text;
      options: Option[];
      answers: Text[];
      feedback: CorrectFeedback;
    })
  | StimulusChoice<"REPLY_SELECT">
  | StimulusChoice<"MIN_PAIR_AB">
  | StimulusChoice<"PARTICLE_FILL">
  | StimulusChoice<"PARTICLE_SWAP">
  | (ItemBase<"CULTURE_CHECK"> & {
      prompt: Text;
      context: Text;
      options: Option[];
      feedback: CorrectFeedback;
    })
  | (ItemBase<"CULTURE_CARD"> & { context: Text; stimulus: Stimulus; feedback: CorrectFeedback })
  | TilesBuild<"LISTEN_BUILD">
  | TilesBuild<"SYLLABLE_BUILD">
  | Speech<"SHADOW">
  | Speech<"SPEAK_WORD">;

export type LearningUnit = { id: string; order: number; items: LearningItem[] };
/** `id`는 `"RP"`입니다. 마지막 자리 최종 테스트(ADR-0024 D10). */
export type FinalTest = { id: string; order: number; items: LearningItem[] };

export type Word = {
  id: string;
  ko: string;
  roman: string;
  glossEn: string;
  role: "target" | "exposure" | "contrast" | "prereq";
  grade?: string;
  example?: Text;
};
export type Pattern = { id: string; ko: string; roman: string; glossEn: string };

/** 와이어 `completion` — 에피소드 완료에 필요한 단계 id(중복 제거, 와이어 순서). 비지 않습니다. */
export type EpisodeCompletion = { requires: string[] };

export type Episode = {
  /** 와이어의 `unit_id` — 이름은 유닛이지만 에피소드 식별자입니다(계약 문서 §0 · Q1). */
  id: string;
  schema: "delivery-2";
  title: string;
  day: number;
  timeOfDay: string;
  place: string;
  counterpart: string;
  /** `pre_cuts` — 첫 자리 표지. `index` 오름차순. */
  prologue: EpisodeCut[];
  /** `seq` 오름차순. */
  dialogue: DialogueLine[];
  /** `steps` 가운데 `id !== "RP"` — `order` 오름차순. */
  units: LearningUnit[];
  /** `steps` 가운데 `id === "RP"`. */
  finalTest: FinalTest;
  /** `post_cuts` — 최종 테스트 통과 뒤 화면. `index` 오름차순. */
  epilogue: EpisodeCut[];
  words: Word[];
  patterns: Pattern[];
  /** 없으면 기존 규칙(최종 테스트 통과 = 완료). */
  completion?: EpisodeCompletion;
};

export type DecodeIssueCode =
  | "schema-mismatch"
  | "invalid-shape"
  | "option-correct-count"
  | "unknown-item-type"
  | "duplicate-item-id"
  | "final-test-missing"
  | "final-test-position"
  | "string-answer-malformed"
  /** `completion.requires`가 비었거나 없는 단계 id를 가리킴. */
  | "completion-malformed"
  /** 경고 전용 — 성공 결과의 `warnings`에만 나옵니다. */
  | "unresolved-ref";

/** `path`는 **와이어** 경로입니다(`steps[0].items[3].options`) — 콘텐츠 쪽에 그대로 돌려줄 수 있게. */
export type DecodeIssue = { code: DecodeIssueCode; path: string; message: string };

export type DecodeResult =
  | { ok: true; episode: Episode; warnings: DecodeIssue[] }
  | { ok: false; errors: DecodeIssue[] };
