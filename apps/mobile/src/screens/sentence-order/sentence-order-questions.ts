export type DialogueSpeaker = "counterpart" | "me";

/** 대화 조립 — 칸마다 화자입니다. 길이 = `answerOrder.length`(매핑이 보장). */
export type SentenceOrderDialogueTurns = { readonly speakers: readonly DialogueSpeaker[] };

export type SentenceOrderQuestion = {
  /**
   * 상대의 말입니다 — 대화 카드의 왼쪽 말풍선에 섭니다. 학습자는 그 말에 답하는 문장을
   * 만듭니다(Figma 65-14 「Complete the conversation」). 빈칸 표기 규약을 두지 않습니다.
   */
  readonly prompt: string;
  /** 처음 보는 표현의 뜻·발음과 조작 안내입니다. 없는 문항은 기존 방식으로 표시합니다. */
  readonly support?: {
    readonly translation: string;
    readonly romanization: string;
    readonly instruction: string;
  };
  /**
   * 화면에 제시되는 조각입니다. 이 배열의 순서가 곧 창고의 제시 순서이고 정답 순서가
   * 아닙니다. ⟨2026-09-28⟩ **정답에 쓰이지 않는 조각(오답 낱말)이 섞일 수 있습니다** —
   * 정답에 없는 인덱스가 그것입니다.
   */
  readonly chips: readonly string[];
  /**
   * 정답 = chips의 인덱스를 정답 순서대로 나열한 것입니다. 문자열이 아니라 인덱스입니다.
   * chips의 부분집합이고, 이 길이가 곧 「놓을 칸 수」입니다.
   */
  readonly answerOrder: readonly number[];
  /**
   * 대화 조립 문항입니다(카탈로그 대화 순서). 지시문 말풍선 없이 정답 길이만큼 칸이 말풍선으로 서고,
   * 이때 `prompt`는 화면에 그리지 않습니다. 칸마다 `speakers`의 화자로 섭니다(콘텐츠의 턴 화자). 채점은
   * 다른 문장 순서와 같습니다.
   */
  readonly dialogue?: SentenceOrderDialogueTurns;
  /** 있으면 `support.instruction` · 문구표 기본보다 앞서는 지시문입니다(카탈로그 문항). */
  readonly instruction?: string;
};
