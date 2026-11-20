// 「Hide me from ranking」의 기기 사본(ADR-0170) — 정본은 서버(`ranking.preferences`)입니다. 설정 화면을 열 때마다 서버를 부르지
// 않으려고 마지막으로 안 값을 **계정별 칸**에 둡니다(같은 기기의 다른 계정에 새지 않게 — 리뷰 W2). 토글을 바꾸거나 순위 보드를
// 읽을 때(숨김이면 참, 아니면 거짓) 고칩니다. 로그인이 없으면 읽지도 쓰지도 않습니다.

import { loadAuthSession } from "./auth-session";
import { authUserIdFrom } from "./auth-user-id";
import { getItem, setItem } from "./storage";

export const rankingHiddenStoragePrefix = "libitum.ranking.hidden.";

function keyOfCurrentUser(): string | null {
  const session = loadAuthSession();
  const userId = session === null ? null : authUserIdFrom(session.accessToken);
  return userId === null ? null : `${rankingHiddenStoragePrefix}${userId}`;
}

export function loadRankingHidden(): boolean {
  const key = keyOfCurrentUser();
  return key !== null && getItem(key) === "1";
}

export function saveRankingHidden(hidden: boolean): void {
  const key = keyOfCurrentUser();
  if (key !== null) setItem(key, hidden ? "1" : "0");
}
