// 설정 화면의 계정 동작(로그아웃 · 계정 삭제)의 props · 상태 · 식별자입니다. 구현 · JSX는 두지
// 않습니다. 순수 전이는 `account-actions.ts`, 상태를 쥐는 훅은 `use-account-actions.ts`, 그리는
// 자리는 `SettingsScreen.tsx`(행 묶음은 목록 끝, 대화상자는 화면 루트의 마지막 자식)입니다.
//
// `SettingsScreenProps`는 이 파일의 `AccountActionsProps`를 교차로 더합니다(`settings.contract.ts`).

import type { DialogAction } from "@libitums/ui-lynx/dialog";

import type { AccountDeletionFailure, AccountDeletionResult } from "../../lib/account.contract";
import type { UiCopy } from "../../lib/ui-copy.contract";

// ------------------------------------------------------------------ 어휘

/**
 * 「Account actions」 묶음의 항목 id입니다. 순서가 곧 표시 순서입니다(덜 파괴적인 것이 먼저).
 * `SettingsGroup` 항목 testid(`ui-lynx-settings-group-item-{id}`)가 이 이름을 씁니다.
 */
export type AccountAction = "sign-out" | "delete-account";

/**
 * 대화상자 액션 id입니다. 순서는 늘 **확인 → 취소**입니다 — `Dialog`는 마지막 액션을 취소
 * 경로(`cancelActionId`)로 노출하므로, 취소가 마지막이어야 뒤로가기가 삭제를 실행하지 않습니다.
 *
 * - 로그아웃: `sign-out`(확인) · `stay`(취소)
 * - 삭제: `delete`(확인) · `keep`(취소)
 */
export type AccountDialogActionId = "sign-out" | "stay" | "delete" | "keep";

// ------------------------------------------------------------------ props

/**
 * 설정 화면이 더 받는 셋입니다. **셋 다 필수입니다**(옵셔널 없음).
 *
 * - `onSignOut` — 로그아웃 대화상자의 `sign-out`에서 정확히 한 번. 결선이 곧장 화면을 내립니다.
 * - `onDeleteAccount` — 삭제 대화상자의 `delete`에서 정확히 한 번. 거부하지 않습니다.
 * - `onLayerChange` — 대화상자가 열리고 닫힐 때(`useScreenLayer`). 전역 머리를 낭독에서 가립니다.
 */
export type AccountActionsProps = {
  readonly onSignOut: () => void;
  readonly onDeleteAccount: () => Promise<AccountDeletionResult>;
  readonly onLayerChange: (open: boolean) => void;
};

// ------------------------------------------------------------------ 화면 로컬 상태

/**
 * 한 번에 대화상자 하나만 섭니다(DS dialog).
 *
 * - `idle` — 대화상자 없음. `failure`가 있으면 묶음 아래 실패 문구가 섭니다(`null`이면 없음 — 도메인상
 *   없을 수 있는 값이라 ADR-0007 D5의 대상이 아닙니다).
 * - `confirming-sign-out` — 로그아웃 대화상자.
 * - `confirming-delete` — 삭제 대화상자(두 액션 누를 수 있음).
 * - `deleting` — 삭제 대화상자가 **그대로 선 채** 확인 액션 로딩 · 취소 비활성. Apple 시트가 그 위에 뜰
 *   수 있습니다.
 */
export type AccountActionsState =
  | { readonly kind: "idle"; readonly failure: AccountDeletionFailure | null }
  | { readonly kind: "confirming-sign-out" }
  | { readonly kind: "confirming-delete" }
  | { readonly kind: "deleting" };

/**
 * - `open` — 묶음의 행을 눌렀습니다.
 * - `dismiss` — 대화상자의 취소(`stay` · `keep`).
 * - `confirm` — 대화상자의 확인(`sign-out` · `delete`).
 * - `settle` — `onDeleteAccount`가 끝났습니다.
 */
export type AccountActionsEvent =
  | { readonly type: "open"; readonly action: AccountAction }
  | { readonly type: "dismiss" }
  | { readonly type: "confirm" }
  | { readonly type: "settle"; readonly result: AccountDeletionResult };

/** 전이가 요구하는 부수효과입니다. 훅이 이 값대로 콜백을 **한 번** 부릅니다. */
export type AccountActionsEffect = "none" | "sign-out" | "delete-account";

export type AccountActionsTransition = {
  readonly state: AccountActionsState;
  readonly effect: AccountActionsEffect;
};

// ------------------------------------------------------------------ 순수 함수 모양 (`account-actions.ts`)

/**
 * 전이표입니다. 표에 없는 조합은 **같은 상태 객체(참조 동일)** 와 `none`을 돌려줍니다 — 그래서
 * `deleting` 동안의 다시 누름 · 취소가 무시됩니다.
 *
 * | 지금 | 사건 | 다음 | 효과 |
 * |---|---|---|---|
 * | `idle` | `open(sign-out)` | `confirming-sign-out` | none |
 * | `idle` | `open(delete-account)` | `confirming-delete` | none |
 * | `confirming-sign-out` | `dismiss` | `idle(null)` | none |
 * | `confirming-sign-out` | `confirm` | `idle(null)` | sign-out |
 * | `confirming-delete` | `dismiss` | `idle(null)` | none |
 * | `confirming-delete` | `confirm` | `deleting` | delete-account |
 * | `deleting` | `settle(deleted)` | `deleting`(그대로) | none |
 * | `deleting` | `settle(cancelled)` | `confirming-delete` | none |
 * | `deleting` | `settle(failed r)` | `idle(r)` | none |
 *
 * `idle(failure)`에서 `open`은 실패 문구를 지우고 대화상자를 엽니다(위 첫 두 줄과 같음).
 */
export type AccountActionsTransitionFn = (
  state: AccountActionsState,
  event: AccountActionsEvent,
) => AccountActionsTransition;

/** `confirming-*` · `deleting`이면 `true` — 화면 본문을 낭독에서 가리고 머리를 가립니다. */
export type AccountActionsLayerOpen = (state: AccountActionsState) => boolean;

/** `[{ id: "sign-out", label }, { id: "stay", label }]` — 확인 → 취소. */
export type SignOutDialogActions = (copy: UiCopy) => readonly DialogAction[];

/**
 * `confirming-delete` → `[{ id: "delete" }, { id: "keep" }]`,
 * `deleting` → `[{ id: "delete", loading: true }, { id: "keep", disabled: true }]`.
 * 라벨은 둘 다 같습니다(로딩 낭독 `, loading`은 `Button`이 붙입니다).
 */
export type DeleteDialogActions = (
  state: Extract<AccountActionsState, { readonly kind: "confirming-delete" | "deleting" }>,
  copy: UiCopy,
) => readonly DialogAction[];

/** `network` → `copy.settings.deleteFailure.network`, 나머지 넷 → `…other`. */
export type AccountDeletionFailureMessage = (
  reason: AccountDeletionFailure,
  copy: UiCopy,
) => string;

/**
 * `Dialog`의 `bindaction(id)` → 사건입니다. `sign-out` · `delete` → `confirm`, `stay` · `keep` →
 * `dismiss`, 모르는 id → `null`(무시).
 */
export type AccountDialogEventFor = (
  actionId: string,
) => Extract<AccountActionsEvent, { readonly type: "confirm" | "dismiss" }> | null;

// ------------------------------------------------------------------ 훅 (`use-account-actions.ts`)

/**
 * 설정 화면이 쥐는 것입니다. 훅은 전이(`AccountActionsTransitionFn`)의 효과대로 `onSignOut` ·
 * `onDeleteAccount`를 **정확히 한 번** 부르고, `settle`로 `idle(failure)`가 되는 순간 그 실패 문구를
 * `announce`하고, `useScreenLayer(layerOpen, onLayerChange)`를 겁니다. `onDeleteAccount`가 뜻밖에
 * 거부하면 `failed/unavailable`로 `settle`합니다.
 */
export type AccountActionsController = {
  readonly state: AccountActionsState;
  readonly open: (action: AccountAction) => void;
  readonly onDialogAction: (actionId: string) => void;
};

export type UseAccountActions = (props: AccountActionsProps) => AccountActionsController;

// ------------------------------------------------------------------ 식별자

/**
 * 테스트가 질의하는 식별자입니다. 행은 `SettingsGroup`이, 대화상자 액션은 `Dialog`가 붙입니다 —
 * 화면이 붙이는 것은 앞의 셋뿐입니다(대화상자 래퍼 `view` 둘 · 실패 문구).
 */
export type AccountActionsTestId =
  | "settings-screen-account-error"
  | "settings-screen-sign-out-dialog"
  | "settings-screen-delete-dialog"
  | `ui-lynx-settings-group-item-${AccountAction}`
  | `ui-lynx-dialog-action-${AccountDialogActionId}`;
