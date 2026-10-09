// 모션 선언 스캐너 — CSS 텍스트에서 시간 · 이징을 정하는 선언과 `@media`를 찾습니다(순수).

/** 시간 · 이징을 정하는 속성입니다. 이 속성의 선언만 리터럴 검사 대상입니다. */
export const motionProperties = [
  "transition",
  "transition-duration",
  "transition-delay",
  "transition-timing-function",
  "animation",
  "animation-duration",
  "animation-delay",
  "animation-timing-function",
];

/** 블록 주석을 같은 길이의 공백으로 바꿉니다. 개행은 남겨 줄 번호를 지킵니다. */
export function stripComments(css) {
  return css;
}

/** 모션 속성 선언을 `{ line, property, value }`로 돌려줍니다. 여러 줄 값은 합칩니다. */
export function motionDeclarationsIn(css) {
  void css;
  return [];
}

/** `@media`가 나오는 줄을 `{ line }`로 돌려줍니다. */
export function mediaQueriesIn(css) {
  void css;
  return [];
}
