// 낱말 고르기의 문항 타입을 소유합니다(ADR-0006 D4 — 순수 로직은 unit 계층 대상입니다). UI를 import하지
// 않습니다. 듣기(`listening-questions.ts`)와 같은 자리에 같은 꼴로 섭니다.

import type { QuestionAudio } from "../../lib/question-audio";
import type { TextSpan } from "../../lib/romanization-segments";

// ---------------------------------------------------------------- 도메인 타입

export type WordChoicePicture = {
  /** 절대 URL입니다(매핑이 `imageUrlOf`로 풉니다). */
  readonly url: string;
  /** 정답 낱말의 로마자입니다 — 답한 뒤 이름표에 섭니다. */
  readonly answerRomanization: string | null;
};

/** 문화 확인 장면의 상대 대사입니다 — 한글은 늘, 로마자 · 뜻은 있을 때만 있습니다. */
export type CultureSceneLine = {
  readonly ko: string;
  readonly romanization?: string;
  readonly meaning?: string;
};

/** 장면: 앞 문화 카드의 그림(없으면 `null`)과 따옴표로 감싼 대사입니다. */
export type CultureScene = {
  readonly imageUrl: string | null;
  readonly line: CultureSceneLine;
};

/** 답한 뒤 해설 판에 서는 영어 · 한국어 해설입니다. */
export type CultureExplanation = { readonly en?: string; readonly ko?: string };

/** 문화 확인 문항의 장면(없으면 `null` — 질문 카드)과 해설입니다. */
export type WordChoiceCulture = {
  readonly scene: CultureScene | null;
  readonly explanation: CultureExplanation;
};

export type WordChoiceQuestion = {
  /** 문항 제시문입니다. 빈칸 문장이면 그 빈칸이 이 문자열 안에 있습니다 — 요소로 쪼개지 않습니다. */
  readonly prompt: string;
  readonly choices: readonly [string, string, ...string[]];
  readonly answerIndex: number;
  /** 제시문 아래 작은 로마자 줄입니다. */
  readonly romanization?: string;
  /** 그 아래 작은 뜻 줄입니다 — 정답을 드러내는 문항에는 싣지 않습니다. */
  readonly translation?: string;
  /** 있으면 `copy.wordChoice.instruction` 대신 서는 지시문입니다. */
  readonly instruction?: string;
  /**
   * 있으면 제시문 대신 그림이 섭니다. 이때 `prompt`는 정답 낱말의 영어 뜻입니다 — 그림의 접근성 이름이자
   * 그림이 못 설 때 그 자리에 서는 글자입니다.
   */
  readonly picture?: WordChoicePicture;
  /** 보기마다 아래 작은 번역 줄입니다. 있으면 길이 = `choices.length`(매핑이 보장)이고 보기는 세로로 쌓입니다. */
  readonly choiceTranslations?: readonly string[];
  /** 문항 음성입니다 — 단어 선택(REPLY_SELECT)은 듣기 갈래, 그림 고르기 · 뜻 고르기는 판정 뒤 재생 갈래. 없으면 키가 없습니다. */
  readonly audio?: QuestionAudio /** 로마자 줄 안에서 정답이 들어간 자리입니다(빈칸 채우기). 없으면 강조가 없습니다. */;
  readonly romanizationEmphasis?: TextSpan;
  /** 있으면 문화 확인입니다 — 답한 뒤 자동으로 넘기지 않고 해설 판을 세웁니다. */
  readonly culture?: WordChoiceCulture;
};
