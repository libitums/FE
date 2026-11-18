// 요금제 그림(ADR-0160 · 시안 S2 · A3 ~ A6) — 왕관(Premium · PLANS 칩) · 말풍선(Chat Plus) · 물결 티켓(Unlimited Tickets).
// 한 색 그림이라 `current-color`가 칠합니다(아이콘 패키지 규약). 장식이라 이름이 없습니다 — 칩 · 카드가 이름을 답니다.

const crownPath = "M2 16h20l1.5-11-6 4.5L12 1 6.5 9.5 0.5 5z";

/** 채운 왕관 — 24 × 18 상자. */
export const crownIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18" viewBox="0 0 24 18" fill="currentColor"><path d="${crownPath}"/></svg>`;

/** 선 말풍선. */
export const bubbleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 5h16v10H9l-5 4z"/></svg>`;

/** 선 티켓 + 물결. */
export const waveTicketIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M9 12c1-1.5 2-1.5 3 0s2 1.5 3 0"/></svg>`;
