// 에피소드 콘텐츠 도메인 모델의 바탕 타입입니다(글 · 보기 · 자극 · 컷 · 대화 줄). `episode-content.model.ts`가 다시
// 내보냅니다 — 막간 타입 파일과 문항 모델이 함께 기대도 순환이 생기지 않게 떼었습니다.

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
