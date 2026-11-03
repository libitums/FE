// 여정맵 이야기 파이널(level-3 S8)의 계약입니다. 타입만 둡니다.
//
// 화면 껍데기는 RP 최종 테스트(`CatalogFinalScreen`)와 같습니다 — 전면 장면 · 머리 · 상대 대사 대화창 · 어두운 답안
// 판. 판 안은 문항 갈래(choice · tiles · write)마다 답하는 방법만 다릅니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { NonEmpty } from "../../lib/non-empty";
import type { SafeAreaInsets } from "../../lib/safe-area";

export type StoryFinalTile = { readonly ko: string; readonly roman: string };
export type StoryFinalOption = { readonly ko: string; readonly roman: string | null };

type StoryFinalTurnBase = {
  readonly id: string;
  /** en(prompt.en) */
  readonly instruction: string;
  /** 상대 이름 — 장면 앞 줄의 화자, 없으면 에피소드 상대. */
  readonly speakerName: string;
  /** 장면의 마지막 앞 줄(상대 대사). */
  readonly line: {
    readonly ko: string;
    readonly roman: string | null;
    readonly en: string | null;
  };
  /** 내 대답의 틀 — `context.ko`에 `___`이 있을 때만. 빈칸 자리에 답이 들어갑니다. */
  readonly template: string | null;
  /** en(story.line.en) — 「Say: …」 */
  readonly replyTranslation: string | null;
  /** 틀렸을 때 보여 줄 완성 문장 — ko(story.line.ko). */
  readonly answer: string;
  /** 맞혔을 때 한 줄 — en(feedback.correct.en). */
  readonly correctNote: string | null;
  readonly imageUrl: string | null;
  /** 상대 줄 소리의 전체 주소. 없으면 키가 없습니다. */
  readonly counterpartAudioSource?: string;
  /** 정답 뒤 들려줄 내 줄 소리. 없으면 키가 없습니다. */
  readonly replyAudioSource?: string;
};

/** 보기 고르기(REPLY_SELECT · CLOZE_CHOICE) — 고르면 바로 판정합니다. */
export type StoryFinalChoiceTurn = StoryFinalTurnBase & {
  readonly kind: "choice";
  readonly options: NonEmpty<StoryFinalOption>;
  readonly correctIndex: number;
};

/** 타일 잇기(CLOZE · WORD_ORDER · SYLLABLE_BUILD) — 음절 잇기는 붙여(`""`), 나머지는 띄어(`" "`) 잇습니다. */
export type StoryFinalTilesTurn = StoryFinalTurnBase & {
  readonly kind: "tiles";
  /** 보이는 순서(섞인 뒤)입니다. */
  readonly tiles: NonEmpty<StoryFinalTile>;
  readonly accepted: NonEmpty<string>;
  readonly joiner: " " | "";
};

/** 따라 쓰기(HANGUL_WRITE) — 음절을 하나씩 씁니다. */
export type StoryFinalWriteTurn = StoryFinalTurnBase & {
  readonly kind: "write";
  readonly syllables: NonEmpty<string>;
};

export type StoryFinalTurn = StoryFinalChoiceTurn | StoryFinalTilesTurn | StoryFinalWriteTurn;
export type StoryFinalTurns = NonEmpty<StoryFinalTurn>;

export type StoryFinalPhase = "answering" | "checked";

export type StoryFinalState = {
  readonly turnIndex: number;
  readonly phase: StoryFinalPhase;
  /** 고른 보기(choice). */
  readonly picked: number | null;
  /** 놓은 타일 순서(tiles). */
  readonly placed: readonly number[];
  /** 쓴 음절마다 통과 여부(write) — 길이가 쓴 음절 수입니다. */
  readonly written: readonly boolean[];
  readonly results: readonly AnswerResult[];
};

export type StoryFinalAction =
  | { readonly type: "pick"; readonly optionIndex: number; readonly result: AnswerResult }
  | { readonly type: "toggleTile"; readonly tileIndex: number }
  | { readonly type: "check"; readonly result: AnswerResult }
  /** 음절 하나를 판정해 다음으로 — `total`째 음절이면 턴을 판정합니다. */
  | { readonly type: "writeSyllable"; readonly passed: boolean; readonly total: number }
  | { readonly type: "nextTurn" };

/** 따라 쓰기 음절 판정의 시작 문턱 — 성능 보고서 handwriting-trace-module-…-01 「둘 다 0.6에서 시작」. */
export const STORY_FINAL_TRACE_THRESHOLD = 0.6;

/** 이야기 파이널만의 문구 — 진행 · Say · 정답 머리는 RP 최종 테스트 문구(`catalogFinal`)를 함께 씁니다. */
export type CatalogStoryFinalCopy = {
  readonly redo: string;
  readonly listen: string;
  readonly nextLetter: string;
  /** 음절 칸 낭독 — 쓴 칸은 글자, 쓰는 칸 · 빈 칸은 상태로 읽습니다. */
  readonly letterLabel: (
    ordinal: number,
    total: number,
    state:
      | { readonly kind: "written"; readonly syllable: string }
      | { readonly kind: "writing" | "empty" },
  ) => string;
  /** 따라 쓰기 칸 낭독. */
  readonly padLabel: (syllable: string) => string;
};

export type CatalogStoryFinalScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly ordinal: number;
  readonly turns: StoryFinalTurns;
  /** 마지막 턴 뒤 See results — 한 번만 부릅니다. */
  readonly onFinish: (results: readonly AnswerResult[]) => void;
  /** 머리 나가기 · 시스템 뒤로. */
  readonly onExit: () => void;
};
