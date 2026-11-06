// 세션 저장 한 자리입니다(ADR-0111 · docs/specs/entry-flow.md). 부팅 갱신 · 소셜 · 코드 검증 · 비회원
// 로그인 넷이 이 함수 하나를 부릅니다.

import type { AnalyticsUser } from "../lib/analytics-user.contract";
import { saveAuthSession } from "../lib/auth-session";
import type { AuthSession } from "../lib/auth-session.contract";
import { authUserIdFrom } from "../lib/auth-user-id";
import { clearGuestSession } from "../lib/guest-session";
import type { AccountState } from "../lib/guest-session";

export type StoreSessionDeps = {
  readonly analyticsUser: AnalyticsUser | null;
  readonly syncProgress: () => Promise<void>;
  readonly setAccountState: (state: AccountState) => void;
};

/**
 * 세션 저장 → 비회원 표식 삭제 → 상태 `signed-in` → 진행 동기화 → 식별. 사용자 ID(없으면 `null`)를 돌려줍니다.
 * 세션을 저장한 자리마다 그 사용자로 분석을 식별합니다(ADR-0029 D8). 저장한 세션에는 사용자 ID가 없어 손에 든
 * 액세스 토큰에서 읽습니다. 못 읽으면 식별하지 않고, 식별의 실패는 로그인을 막지 않습니다.
 */
export function storeSignedInSession(session: AuthSession, deps: StoreSessionDeps): string | null {
  saveAuthSession(session);
  clearGuestSession();
  deps.setAccountState("signed-in");
  void deps.syncProgress().catch(() => undefined);
  const userId = authUserIdFrom(session.accessToken);
  if (userId === null) {
    return null;
  }
  try {
    deps.analyticsUser?.identify(userId);
  } catch {
    // 분석은 화면을 막지 않습니다.
  }
  return userId;
}
