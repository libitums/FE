// 앱 구간을 떠나 진입 구간(로그인)으로 돌아가는 어휘입니다 — 로그아웃 · 계정 삭제의 뒤처리.
//
// **떠나기는 `NavAction`이 아닙니다.** 앱 구간의 기억(진행 · 알림 · 세션 옵션 · 젬 · 겹침 레이어)은
// 전부 App 상태에 살아 있어, 스택만 진입 구간으로 돌리면 다음 사람이 같은 실행에서 앞사람의 진행을
// 봅니다. 그래서 `App`(바깥)이 `AppSession`(지금의 App 몸통)을 **새 key로 다시 세웁니다** — 모든
// 상태가 처음 값으로 돌아가고, 첫 `Nav`만 스플래시가 아니라 `[온보딩, 로그인]`입니다.
//
// 타입만 있습니다. 값(`initialAppStart` · `nextAppStart` · `signedOutNav`)은 `app-start.ts` ·
// `nav-state.ts`가 가집니다.

import type { AccountDeletionResult } from "../lib/account.contract";
import type { AnalyticsResetScope, AnalyticsUser } from "../lib/analytics-user.contract";
import type { EntryEventSink } from "../lib/entry-flow";
import type { Nav } from "./nav-state";

// ------------------------------------------------------------------ App 세션

/**
 * `App`이 쥐는 유일한 상태입니다. `key`가 바뀌면 `AppSession`이 처음부터 다시 섭니다.
 *
 * - 부팅: `{ key: 0, nav: entryInitialNav }`(스플래시).
 * - 떠난 뒤: `{ key: 앞 + 1, nav: signedOutNav }`(`[온보딩, 로그인]`, 탭 스택은 루트).
 */
export type AppStart = {
  readonly key: number;
  readonly nav: Nav;
  /** 떠난 이유 — 새 세션이 한 번 낭독합니다(부팅이면 `null`). */
  readonly exit: AccountExit | null;
};

/** 순수 함수입니다 — `key + 1`, `nav`는 늘 `signedOutNav`, `exit`은 받은 이유. 입력을 고치지 않습니다. */
export type NextAppStart = (start: AppStart, exit: AccountExit) => AppStart;

/**
 * `AppSession`이 `App`에게서 받는 두 값입니다. 둘 다 필수입니다 — 테스트는 `App`을 그리므로
 * `AppSession`을 직접 그리는 자리는 `App` 하나뿐입니다.
 */
export type AppSessionControl = {
  /** `useReducer(navReducer, start)`의 초기값입니다. */
  readonly start: Nav;
  /** 앞 세션이 떠난 이유입니다. `null`이 아니면 새 세션이 선 뒤 결과를 한 번 낭독합니다. */
  readonly exit: AccountExit | null;
  /** 부르면 `App`이 `nextAppStart`로 상태를 바꿉니다. 여러 번 불러도 한 번에 한 칸씩 늡니다. */
  readonly onLeaveApp: (exit: AccountExit) => void;
};

// ------------------------------------------------------------------ 결선

/** 앱 구간을 떠나는 이유입니다. 뒤처리가 이것 하나로 갈립니다(분석 대기열을 버리는가). */
export type AccountExit = "signed-out" | "deleted";

/** 순수 함수입니다 — `signed-out` → `identity`, `deleted` → `identity-and-queue`. */
export type AnalyticsResetScopeFor = (exit: AccountExit) => AnalyticsResetScope;

export type AccountWiringArgs = {
  readonly analyticsUser: AnalyticsUser | null;
  readonly entryEventSink: EntryEventSink;
  /** `AppSessionControl.onLeaveApp`입니다. */
  readonly leaveApp: (exit: AccountExit) => void;
};

/**
 * `app/account-wiring.ts`가 만드는 설정 화면의 콜백 둘입니다.
 *
 * 뒤처리 순서(둘 공통): 세션 삭제 → 분석 되돌리기(`analyticsResetScopeFor`) →
 * `entry_screen_viewed { screen: "login" }` → `leaveApp()`. 이벤트가 되돌리기 **뒤**라 새 익명 ID로
 * 나갑니다 — 떠난 사용자의 ID로 남는 이벤트가 없습니다.
 *
 * - `onSignOut` — 저장된 세션의 액세스 토큰으로 로그아웃 요청을 **시작만 하고 기다리지 않고** 곧장
 *   뒤처리합니다. 세션이 없어도 뒤처리합니다. 던지지 않습니다.
 * - `onDeleteAccount` — `deleteAccount(session, saveAuthSession)`을 기다려, `deleted`일 때만
 *   뒤처리합니다. 저장된 세션이 없으면 요청 없이 `failed/session-expired`. 거부하지 않습니다.
 */
export type AccountWiring = {
  readonly onSignOut: () => void;
  readonly onDeleteAccount: () => Promise<AccountDeletionResult>;
};
