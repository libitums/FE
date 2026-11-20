// 더보기 메뉴 카드의 prop 계약과 testid입니다(ADR-0169). 타입만 둡니다.

import type { MoreRoot } from "../app/nav-state";

export type MoreMenuProps = {
  /** 단어장 줄 설명의 수 — 단어 수 · 오늘 복습 수. */
  readonly words: number;
  readonly due: number;
  readonly onSelect: (root: MoreRoot) => void;
  readonly onClose: () => void;
};

export const moreMenuTestIds = {
  menu: "more-menu",
  catch: "more-menu-catch",
  row: (root: MoreRoot) => `more-menu-row-${root}`,
} as const;
