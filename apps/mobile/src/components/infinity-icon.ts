// 무한 기호 아이콘입니다(ADR-0115). 글자 「∞」는 Jost에서 가늘고 작게 찍혀, 무제한 티켓의 칩 · 태그 · 모달은 이 그림을
// 씁니다. 선 그림이라 색은 `current-color`가 선(stroke)에 들어갑니다(다른 아이콘과 같은 규약).

const infinityPath =
  "M6.6 8.2c-2.1 0-3.8 1.7-3.8 3.8s1.7 3.8 3.8 3.8c3.4 0 7.4-7.6 10.8-7.6 2.1 0 3.8 1.7 3.8 3.8s-1.7 3.8-3.8 3.8c-3.4 0-7.4-7.6-10.8-7.6z";

export const infinityIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${infinityPath}"/></svg>`;

/** 모달의 큰 무한 기호입니다 — 가로로 긴 상자(128 × 80)에 맞게 위아래 여백을 잘라 낸 viewBox와 가는 선입니다. */
export const infinityHeroIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="64" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="2 7 20 10"><path d="${infinityPath}"/></svg>`;
