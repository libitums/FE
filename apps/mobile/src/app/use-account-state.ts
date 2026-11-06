// 앱이 「누구로」 도는지 쥐는 훅입니다(ADR-0111). 첫 값은 저장된 세션 · 비회원 표식에서 읽고, 전이는 결선이
// setter로 적습니다.

import { useState } from "@lynx-js/react";

import { loadAuthSession } from "../lib/auth-session";
import { accountStateFrom, loadGuestSession } from "../lib/guest-session";
import type { AccountState } from "../lib/guest-session";

export function useAccountState(): readonly [AccountState, (state: AccountState) => void] {
  const [state, setState] = useState<AccountState>(() =>
    accountStateFrom(loadAuthSession(), loadGuestSession()),
  );
  return [state, setState];
}
