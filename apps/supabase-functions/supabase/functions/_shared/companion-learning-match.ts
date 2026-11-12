// 학습 표현이 글에 들어 있는지 가리는 규칙(PRD §3.7 「판별 규칙」). 순수 함수입니다.
//
// - 어휘(`voca`) · 고정 표현(`expr`) · 수 단위(`nume`): 공백 · 문장부호를 걷고 글자 일치. 끝의 「요」는 떼고 본다(괜찮아요 ↔ 괜찮아).
//   「-다」로 끝나는 용언은 어간으로 보고, 어간이 두 글자 이상이면 끝 글자를 뗀 앞부분도 받는다(따뜻하다 → 따뜻해요).
// - 문형(`patt`) · 문법(`gram`)과 `{수단}` 같은 자리가 있는 표현: 자리를 경계로 조각을 나눠 조각이 차례대로 모두 있어야 한다.
//   활용이 바뀌는 문형(먹고 싶어요 ↔ 가고 싶었어요)은 글자로 다 잡지 못한다 — 캐릭터 쪽은 모델의 `@state` 보고를, 유저 쪽은 피드백
//   모델의 판정을 함께 쓴다(`isPatternLike`).

export type MatchableExpression = {
  readonly id: string;
  readonly kind: string;
  readonly surface: string;
};

const strip = (text: string) => text.replace(/[\s\p{P}\p{S}]/gu, "");
const slot = /\{[^}]*\}/g;

/** 자리 · 활용 때문에 글자 일치만으로 판정하기 어려운 표현 — 문형 · 문법이거나 `{자리}`가 있다. */
export function isPatternLike(expression: MatchableExpression): boolean {
  return (
    expression.kind === "patt" || expression.kind === "gram" || expression.surface.includes("{")
  );
}

/** 비교할 조각들(차례대로 모두 있어야 한다). 비면 판정하지 않는다. */
export function expressionFragments(expression: MatchableExpression): string[] {
  const surface = expression.surface.trim().replace(/^[~\-–]+/, "");
  if (surface.includes("{")) {
    return surface
      .split(slot)
      .map((part) => strip(part).replace(/요$/, ""))
      .filter((part) => part !== "");
  }
  const core = strip(surface).replace(/요$/, "");
  if (core === "") return [];
  if (expression.kind === "voca" && core.length >= 2 && core.endsWith("다")) {
    const stem = core.slice(0, -1);
    return [stem.length >= 2 ? stem.slice(0, -1) : stem];
  }
  return [core];
}

/** 표현이 글에 들어 있는가. 조각이 없으면 false. */
export function containsExpression(expression: MatchableExpression, text: string): boolean {
  const fragments = expressionFragments(expression);
  if (fragments.length === 0) return false;
  const haystack = strip(text);
  let from = 0;
  for (const fragment of fragments) {
    const at = haystack.indexOf(fragment, from);
    if (at < 0) return false;
    from = at + fragment.length;
  }
  return true;
}

/** 배운 표현 가운데 글에 들어 있는 것(글자 판정만). 한 글자 어휘는 다른 낱말 속에 흔히 들어 있어 빼고 본다. */
export function matchedExpressions<T extends MatchableExpression>(
  pool: readonly T[],
  text: string,
): T[] {
  return pool.filter((expression) => {
    const fragments = expressionFragments(expression);
    if (fragments.length === 1 && [...fragments[0]!].length < 2) return false;
    return containsExpression(expression, text);
  });
}
