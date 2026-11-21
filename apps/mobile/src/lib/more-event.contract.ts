// 더보기 메뉴 · Letters · 단어장 · Letters 추천의 제품 사용 이벤트입니다(ADR-0169). 타입만 둡니다.
// 공통 속성(`surface` · `daysSinceFirstOpen`)은 `companion-event.contract.ts`의 묶음과 같은 규약으로 붙습니다 — 보내는 자리는
// `emitCompanionEvent`입니다. 값은 문자열 · 불리언뿐입니다(수는 10진 문자열).

import type { MoreRoot } from "../app/nav-state";
import type { WordbookFilter } from "../screens/wordbook/wordbook.contract";

type Common = {
  readonly surface: "learning";
  readonly daysSinceFirstOpen: string;
};

/** Letters 추천의 이유 — 어렵게 끝냄(hard) · 실패 또는 나가기(failed). */
export type LettersRecommendReasonValue = "hard" | "failed";

/** 별을 누른 자리. */
export type WordStarSource = "lesson_card" | "wordbook";

/** 단어장 걸러보기 칩. */
export type WordbookFilterValue = WordbookFilter;

export type MoreEvent =
  /** ⋯를 눌러 메뉴 카드를 열었을 때. */
  | (Common & { readonly name: "more_menu_opened" })
  /** 메뉴 줄을 눌렀을 때. */
  | (Common & { readonly name: "more_menu_item_clicked"; readonly item: MoreRoot })
  /** Letters 칸을 눌렀을 때 — `audio`는 소리가 났는가(소리 파일이 아직 없으면 unavailable). */
  | (Common & {
      readonly name: "letters_cell_tapped";
      readonly letter: string;
      readonly group: "consonants" | "vowels" | "doubles" | "combined";
      readonly audio: "played" | "unavailable";
    })
  /** 합치기 퀴즈 판정 — `round`는 1부터, `target`은 만들 글자. */
  | (Common & {
      readonly name: "letters_quiz_answered";
      readonly round: string;
      readonly target: string;
      readonly correct: boolean;
    })
  /** 합치기 퀴즈 세 라운드를 다 끝냄 — `firstTry`는 첫 시도에 맞힌 라운드 수. */
  | (Common & {
      readonly name: "letters_quiz_completed";
      readonly rounds: string;
      readonly firstTry: string;
    })
  /** 단어장 목록을 열었을 때 — 단어 수 · 오늘 복습 수. */
  | (Common & { readonly name: "wordbook_opened"; readonly words: string; readonly due: string })
  /** 복습 한 문항의 답. */
  | (Common & { readonly name: "wordbook_review_answered"; readonly correct: boolean })
  /** 단어의 별(즐겨찾기)을 달거나 뗌 — 레슨 단어 카드 · 단어장 줄(ADR-0169 즐겨찾기 개정). */
  | (Common & {
      readonly name: "wordbook_star_toggled";
      readonly starred: boolean;
      readonly source: WordStarSource;
    })
  /** 단어장 걸러보기 칩을 바꿈. */
  | (Common & { readonly name: "wordbook_filter_switched"; readonly filter: WordbookFilterValue })
  /** 여정맵 Letters 추천 대화상자. */
  | (Common & {
      readonly name: "letters_recommend_shown";
      readonly reason: LettersRecommendReasonValue;
    })
  | (Common & {
      readonly name: "letters_recommend_clicked";
      readonly reason: LettersRecommendReasonValue;
    })
  | (Common & {
      readonly name: "letters_recommend_dismissed";
      readonly reason: LettersRecommendReasonValue;
      readonly choice: "keep_going" | "back";
    });
