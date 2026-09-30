import type { ReactNode } from "@lynx-js/react";

import { Dialog } from "@libitums/ui-lynx/dialog";
import { SettingsGroup } from "@libitums/ui-lynx/settings-cell";
import type { SettingsGroupItem } from "@libitums/ui-lynx/settings-cell";

import {
  accountActions,
  accountDeletionFailureMessage,
  accountActionsLayerOpen,
  deleteDialogActions,
  signOutDialogActions,
} from "./account-actions";
import type { SettingsScreenProps } from "./settings.contract";
import { useAccountActions } from "./use-account-actions";
import { settingsNavLabel, settingsNavTargets } from "./settings";
import { sessionOptionKeys, sessionOptionLabel } from "../../lib/session-options";
import { useUiCopy } from "../../lib/ui-copy";

import "./settings-screen.css";

// 제목 텍스트 하나와 흐름 영역의 목록 상자를 그립니다. 흐름 영역의 유일한 직계
// 자식은 목록 상자(`settings-screen-list`) 하나이고(ADR-0022 D4), 안에는 ui-lynx
// `SettingsGroup` 둘이 섭니다 — 계정(이동 항목 둘, `settingsNavTargets` 순서)과
// 학습(토글 항목 둘, `sessionOptionKeys` 순서). 셀의 모양 · 낭독(이름 · 켜짐/꺼짐) ·
// 탭은 ui-lynx가 집니다. 화면은 목록을 계산·정렬·거르지 않고 토글 값도 판정하지
// 않습니다 — 받은 것을 그대로 내립니다. 항목 `id`는 이동 대상 · 옵션 키 그대로라
// 그룹의 항목 testid(`ui-lynx-settings-group-item-{id}`)가 그 이름을 씁니다.
export function SettingsScreen({
  sessionOptions,
  onSelectNavTarget,
  onToggleSessionOption,
  onSignOut,
  onDeleteAccount,
  onLayerChange,
}: SettingsScreenProps): ReactNode {
  const copy = useUiCopy();
  const account = useAccountActions({ onSignOut, onDeleteAccount, onLayerChange });
  const { state } = account;
  const layerOpen = accountActionsLayerOpen(state);
  const actionItems: readonly SettingsGroupItem[] = accountActions.map((id) => ({
    id,
    trailing: "navigation",
    title: copy.settings.action[id],
    onNavigate: () => account.open(id),
  }));
  const accountItems: readonly SettingsGroupItem[] = settingsNavTargets.map((target) => ({
    id: target,
    trailing: "navigation",
    title: settingsNavLabel(target, copy),
    onNavigate: () => onSelectNavTarget(target),
  }));
  // 셀은 바뀐 뒤 값을 넘기지만 여기서는 쓰지 않습니다 — 값의 진실은 App의 `sessionOptions`
  // 이고, 토글은 그 값을 뒤집는 일 하나입니다(`toggleSessionOption`).
  const learningItems: readonly SettingsGroupItem[] = sessionOptionKeys.map((key) => ({
    id: key,
    trailing: "toggle",
    title: sessionOptionLabel(key, copy),
    checked: sessionOptions[key],
    onChange: () => onToggleSessionOption(key),
  }));

  return (
    <view className="settings-screen">
      <text
        data-testid="settings-screen-title"
        className="settings-screen-title"
        accessibility-traits="header"
        accessibility-elements-hidden={layerOpen ? true : undefined}
      >
        {copy.settings.title}
      </text>
      {/* [흐름] 내용 슬롯 — `scroll-orientation`·`scroll-bar-enable`을 적습니다.
          안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로 불가능합니다.
          `accessibility-*`는 붙이지 않습니다 — 조작 단위가 아니라 상자입니다. */}
      <scroll-view
        className="settings-screen-scroll"
        data-testid="settings-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
        accessibility-elements-hidden={layerOpen ? true : undefined}
      >
        {/* `<scroll-view>`의 직계 자식은 이 상자 하나입니다(ADR-0022 D4) — 간격은
            이 상자가 집니다(`<scroll-view>` 안은 강제 linear라 `gap`이 무동작입니다). */}
        <view className="settings-screen-list" data-testid="settings-screen-list">
          <SettingsGroup accessibilityLabel={copy.settings.group.account} items={accountItems} />
          <SettingsGroup accessibilityLabel={copy.settings.group.learning} items={learningItems} />
          <SettingsGroup
            accessibilityLabel={copy.settings.group.accountActions}
            items={actionItems}
          />
          {state.kind === "idle" && state.failure !== null ? (
            <text
              className="settings-screen-account-error"
              data-testid="settings-screen-account-error"
            >
              {accountDeletionFailureMessage(state.failure, copy)}
            </text>
          ) : null}
        </view>
      </scroll-view>
      {state.kind === "confirming-sign-out" ? (
        <view data-testid="settings-screen-sign-out-dialog">
          <Dialog
            title={copy.settings.signOutDialog.title}
            actions={signOutDialogActions(copy)}
            bindaction={account.onDialogAction}
          />
        </view>
      ) : null}
      {state.kind === "confirming-delete" || state.kind === "deleting" ? (
        <view data-testid="settings-screen-delete-dialog">
          <Dialog
            title={copy.settings.deleteDialog.title}
            description={copy.settings.deleteDialog.description}
            actions={deleteDialogActions(state, copy)}
            bindaction={account.onDialogAction}
          />
        </view>
      ) : null}
    </view>
  );
}
