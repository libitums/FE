// 「Hide me from ranking」의 기기 사본(ADR-0170) — 정본은 서버(`ranking.preferences`)입니다. 설정 화면을 열 때마다 서버를 부르지
// 않으려고 마지막으로 안 값을 둡니다: 토글을 바꾸거나 순위 보드를 읽을 때(숨김이면 참, 아니면 거짓) 고칩니다.

import { getItem, setItem } from "./storage";

export const rankingHiddenStorageKey = "libitum.ranking.hidden";

export function loadRankingHidden(): boolean {
  return getItem(rankingHiddenStorageKey) === "1";
}

export function saveRankingHidden(hidden: boolean): void {
  setItem(rankingHiddenStorageKey, hidden ? "1" : "0");
}
