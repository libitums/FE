// `App`이 쥐는 유일한 상태(`AppStart`)의 초기값과 다음 값입니다. 어휘는 `leave-app.contract.ts`입니다.

import type { AppStart, NextAppStart } from "./leave-app.contract";
import { entryInitialNav, signedOutNav } from "./nav-state";

/** 부팅입니다 — 스플래시부터 시작합니다. */
export const initialAppStart: AppStart = { key: 0, nav: entryInitialNav, exit: null };

/** `key + 1`, `nav`는 늘 `signedOutNav`, `exit`은 받은 이유. 입력을 고치지 않습니다. */
export const nextAppStart: NextAppStart = (start, exit) => ({
  key: start.key + 1,
  nav: signedOutNav,
  exit,
});
