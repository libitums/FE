// 에피소드 콘텐츠의 **도메인 모델**입니다(타입만). 와이어(delivery-2 JSON)는
// `episode-content.schema.ts`가 검사하고, `decodeEpisode`가 이 모양으로 바꿉니다.
// 와이어 정본은 `docs/specs/episode-content-json-contract.md`입니다.

export type * from "./episode-content.model-base";
import type {
  DialogueLine,
  EpisodeCut,
  Option,
  Stimulus,
  Text,
} from "./episode-content.model-base";

/** 와이어 `event` — E 노출 · R 회상 · D 변별(2026-10-15 MIN_PAIR_AB). */
export type ItemEvent = "E" | "R" | "D";

/** 이야기 문항의 앞 상대 줄 — 녹음이 비면 `audioUrl` 키가 없습니다. */
export type StoryLead = { speaker: string; line: Text; audioUrl?: string };

/**
 * 이야기 문항(level-3 S8)의 장면입니다 — `lead`(앞 상대 줄들) 뒤에 내가 할 `line`이 옵니다. `lineId`는
 * `dialogue`의 줄 id입니다. 비어 있는 그림 · 상황은 키가 없습니다.
 */
export type ItemStory = {
  lineId: string;
  hintAfterMiss: boolean;
  lead: StoryLead[];
  line: Text;
  situation?: Text;
  imageUrl?: string;
};

type ItemBase<T extends string> = {
  id: string;
  type: T;
  event: ItemEvent;
  ref?: string;
  /** 디코드만 하고 쓰지 않습니다(난이도 · 스킬은 뒤 작업). `skill`은 콘텐츠의 불투명 문자열입니다. */
  level?: number;
  skill?: string;
  skillLevel?: number;
  /** 이야기 문항이면 장면 — 여정맵 파이널이 씁니다. */
  story?: ItemStory;
};

/** 문항 피드백의 정답 줄 — `feedback.correct`. */
export type CorrectFeedback = { correct: Text };
/** 대답 고르기의 해설 — 틀림 줄 · 틀린 보기 id는 있을 때만. */
export type ChoiceFeedback = { correct: Text; wrong?: Text; wrongOption?: string };
/** TURN_ORDER 타일 — 2026-10-15부터 화자가 실려 옵니다. */
export type TurnTile = Text & { speaker?: DialogueLine["role"] };

export type LearningItem =
  | (ItemBase<"VOCAB_CARD"> & {
      context: Text;
      example?: Text;
      cardKind: string;
      /** 와이어 `audio_url` — 낱말 음성 id. 빈 값은 없음. */
      audioUrl?: string;
      /** 와이어 `example_audio_url` — 예문 음성 id. 빈 값은 없음. */
      exampleAudioUrl?: string;
    })
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
  /** 이야기 빈칸의 문맥(`___` 자리) — 없으면 키가 없습니다. */
  context?: Text;
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
      feedback?: CorrectFeedback;
    })
  | (ItemBase<"REPLY_SELECT"> & {
      prompt: Text;
      /** 와이어에 없으면 `context`가 `text`로 옵니다. */
      stimulus: Stimulus;
      context?: Text;
      options: Option[];
      feedback?: ChoiceFeedback;
    })
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
  | Speech<"SPEAK_WORD">
  /** 빈칸 타자 입력 — `context`의 `___` 자리에 `answers` 가운데 하나를 쳐 넣습니다. */
  | (ItemBase<"CLOZE_TYPING"> & { prompt: Text; context: Text; answers: Text[] })
  /** 따라 쓰기 — `answers[0]`의 음절을 차례로 씁니다. `context`의 `___` 자리입니다. */
  | (ItemBase<"HANGUL_WRITE"> & {
      prompt: Text;
      context: Text;
      answers: Text[];
      feedback?: CorrectFeedback;
    });

export type * from "./episode-content.model-interlude";
import type { EpisodeStory } from "./episode-content.model-interlude";

/** `story`가 있으면 문항 없는 이야기 유닛입니다(`items`는 비어 있습니다). */
export type LearningUnit = {
  id: string;
  order: number;
  items: LearningItem[];
  story?: EpisodeStory;
};
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
  /** `title_en` — 영어 제목입니다. 맵 말풍선 · 머리 띠가 씁니다. 없거나 비면 키가 없습니다. */
  titleEn?: string;
  day: number;
  timeOfDay: string;
  place: string;
  counterpart: string;
  /** `counterpart_avatar` — 상대 아바타 그림의 버킷 상대 경로입니다. 없거나 어긋나면 키가 없습니다. */
  counterpartAvatar?: string;
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
  /** `translations` — 언어마다 「영어 원문 → 번역」 표입니다(ADR-0091 D1). 남은 항목이 없으면 키가 없습니다. */
  translations?: EpisodeTranslations;
};

/** 콘텐츠 번역표가 있는 언어입니다(ADR-0091 · ADR-0093 · ADR-0097 · ADR-0098). */
export type ContentLanguage = "vi" | "id" | "es" | "ja";
export type EpisodeTranslations = {
  readonly [L in ContentLanguage]?: Readonly<Record<string, string>>;
};

export type DecodeIssueCode =
  | "schema-mismatch"
  | "invalid-shape"
  | "option-correct-count"
  /** 경고 전용 — 모르는 형식 문항은 그 문항만 버립니다(에피소드는 성공). */
  | "unknown-item-type"
  | "duplicate-item-id"
  | "final-test-missing"
  | "final-test-position"
  | "string-answer-malformed"
  /** `completion.requires`가 비었거나 없는 단계 id를 가리킴. */
  | "completion-malformed"
  /** 경고 전용 — 성공 결과의 `warnings`에만 나옵니다. */
  | "unresolved-ref"
  /** 경고 전용 — 자산 경로 규칙(상대 경로 · 이미지 확장자)에 어긋나 그 키를 버렸습니다. */
  | "invalid-asset-path"
  /** 경고 전용 — 막간 스텝의 `interlude`가 틀렸거나 그릴 컷이 없어 그 스텝을 버렸습니다(ADR-0088). */
  | "invalid-interlude"
  /** 경고 전용 — 번역표의 모양이 틀렸거나 문자열이 아닌 · 빈 번역이 있어 그 부분을 버렸습니다(ADR-0091). */
  | "invalid-translation";

/** `path`는 **와이어** 경로입니다(`steps[0].items[3].options`) — 콘텐츠 쪽에 그대로 돌려줄 수 있게. */
export type DecodeIssue = { code: DecodeIssueCode; path: string; message: string };

export type DecodeResult =
  | { ok: true; episode: Episode; warnings: DecodeIssue[] }
  | { ok: false; errors: DecodeIssue[] };
