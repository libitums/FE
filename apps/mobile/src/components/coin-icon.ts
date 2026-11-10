// 엽전 아이콘입니다(ADR-0116 · 시안 「엽전 재화」 Main 보드). 둥근 황동에 네모 구멍, 아래로 두께 한 겹 — 지도 노드 버튼과
// 같은 입체 말투입니다. 면 넷이 겹친 다색 그림이라 `current-color` 한 색으로 칠하는 아이콘 패키지 규약을 따르지 않고 색을
// 그림에 둡니다(옛 젬 아이콘과 같은 사정). 구멍은 뚫려 있어 바탕이 비칩니다. 장식이라 이름이 없습니다.

const thickness = "M3 12.6a9 9 0 1 0 18 0a9 9 0 1 0 -18 0Z M9.6 10.2h4.8v4.8H9.6Z";
const rim = "M3 11.4a9 9 0 1 0 18 0a9 9 0 1 0 -18 0Z M9.6 9h4.8v4.8H9.6Z";
const face = "M4.6 11.4a7.4 7.4 0 1 0 14.8 0a7.4 7.4 0 1 0 -14.8 0Z M8.2 7.6h7.6v7.6H8.2Z";
const shine = "M6.3 9.7A5.6 5.6 0 0 1 9.9 6.1";

/** 칩 · 카드 · 날아가는 엽전이 함께 쓰는 그림입니다. 24 칸 안에 동전이 약 17로 서서 불 · 트로피 아이콘과 무게가 같습니다. */
export const coinIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-1.5 -1.5 27 27"><path fill-rule="evenodd" fill="#8E5414" d="${thickness}"/><path fill-rule="evenodd" fill="#C27A22" d="${rim}"/><path fill-rule="evenodd" fill="#E8A848" d="${face}"/><path fill="none" stroke="#FFD98A" stroke-width="1.2" stroke-linecap="round" d="${shine}"/></svg>`;

/** 엽전 칩 숫자 · 보상 카드 글자 색입니다(흰 바탕 명도비 5.3:1 · 카드 #FFF4E0 위 4.8:1). 색 토큰 패키지에 황동 계열이 없어 디자인 값을 적습니다. */
export const coinTextColor = "#9A5E12";

/**
 * 엽전 칩 숫자 뒤의 작은 「+」입니다(시안 B). 흰 획 하나라 상자 색은 CSS(`.stat-chip-plus`)가 칠합니다.
 */
export const coinPlusIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M5 2v6M2 5h6" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/></svg>`;
