// 조합 스토리의 부분(ADR-0191 D15) — 바탕(색 · 사진) 위에 직접 쓴 글(`text`)과 배운 단어(`word` · `card`)가 섞여 얹힌다. 런타임 중립.
// - 글: 사진 설명 · 색 바탕의 쓴 글(`ko`) + 직접 쓴 얹은 글. 글 검수 · 반응 지시 · 대화 맥락이 쓴다.
// - 배운 단어: 얹은 단어 · 카드(배열 순서). 카탈로그 글이라 검수하지 않는다. 첫 단어가 퀴즈 단어다(서버 `companion.my_story_quiz_word`와 같은 규칙).

export type StoryWord = { readonly ko: string; readonly meaning: string };

type OverlayLike = { readonly kind?: unknown; readonly ko?: unknown; readonly meaning?: unknown };

const flat = (text: string) => text.replace(/\s+/gu, " ").trim();
const asOverlays = (value: unknown): OverlayLike[] =>
  Array.isArray(value)
    ? value.filter((item): item is OverlayLike => typeof item === "object" && item !== null)
    : [];

/** 글 — 쓴 글(사진 설명)과 직접 쓴 얹은 글. 빈 글은 뺀다. */
export function storyTexts(ko: string, overlays: unknown): string[] {
  return [
    ko,
    ...asOverlays(overlays)
      .filter((overlay) => overlay.kind === "text" && typeof overlay.ko === "string")
      .map((overlay) => overlay.ko as string),
  ]
    .map(flat)
    .filter((text) => text !== "");
}

/** 배운 단어 — 얹은 단어 · 카드(배열 순서). */
export function storyWords(overlays: unknown): StoryWord[] {
  return asOverlays(overlays).flatMap((overlay) =>
    (overlay.kind === "word" || overlay.kind === "card") &&
    typeof overlay.ko === "string" &&
    flat(overlay.ko) !== ""
      ? [
          {
            ko: flat(overlay.ko),
            meaning: typeof overlay.meaning === "string" ? flat(overlay.meaning) : "",
          },
        ]
      : [],
  );
}

/** 퀴즈 단어 — 첫 배운 단어(1 ~ 40자). 없으면 null. */
export function storyQuizWord(words: readonly StoryWord[]): StoryWord | null {
  return words.find((word) => [...word.ko].length <= 40) ?? null;
}

/** 글 검수에 넣을 글 — 글을 줄로 잇는다. 없으면 빈 글(검수하지 않는다). */
export function storyCheckText(ko: string, overlays: unknown): string {
  return storyTexts(ko, overlays).join("\n");
}
