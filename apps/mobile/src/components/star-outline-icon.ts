// 꺼진 별(외곽선)입니다(ADR-0169 즐겨찾기 개정). @libitums/icons에는 채운 별(`five-pointed-star`)만 있어, 같은 path를 선으로만
// 그려 꺼짐을 모양으로도 가립니다(색만으로 상태를 전하지 않음, WCAG 1.4.1). 색은 `current-color`가 선(stroke)에 들어갑니다.

import fivePointedStar from "@libitums/icons/lynx/five-pointed-star";

export const starOutlineIcon = fivePointedStar.replace(
  'fill="currentColor"',
  'fill="none" stroke="currentColor" stroke-width=".7" stroke-linejoin="round"',
);
