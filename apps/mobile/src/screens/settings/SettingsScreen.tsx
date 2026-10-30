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
import { appVersionLabel } from "../../lib/app-version";
import { useAccountActions } from "./use-account-actions";
import { settingsNavLabel, settingsNavTargets } from "./settings";
import { useUiCopy } from "../../lib/ui-copy";

import "./settings-screen.css";

// 계정 정보·알림·문서 및 계정 동작을 표시합니다.
export function SettingsScreen({
  onSelectNavTarget,
  learnerProfileSummary,
  appVersion,
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
  // 「레슨에 쓰는 이름 · 나라」 줄의 설명이 지금 값을 보입니다.
  const accountItems: readonly SettingsGroupItem[] = settingsNavTargets.map((target) => ({
    id: target,
    trailing: "navigation",
    title: settingsNavLabel(target, copy),
    description: target === "learner-profile" ? learnerProfileSummary : undefined,
    onNavigate: () => onSelectNavTarget(target),
  }));

  return (
    <view className="settings-screen">
      <text
        data-testid="settings-screen-title"
        className="settings-screen-title"
        flatten={false}
        accessibility-element={true}
        accessibility-traits="header"
        accessibility-heading={true}
        accessibility-elements-hidden={layerOpen ? true : undefined}
      >
        {copy.settings.title}
      </text>
      {/* [흐름] 내용 슬롯 — `scroll-orientation`은 적습니다(안 적으면 초기값이 가로라
          세로 스크롤이 원리적으로 불가능합니다). 스크롤 바는 `scroll-bar-enable={false}`로 끕니다.
          `accessibility-*`는 붙이지 않습니다 — 조작 단위가 아니라 상자입니다. */}
      <scroll-view
        className="settings-screen-scroll"
        data-testid="settings-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
        accessibility-elements-hidden={layerOpen ? true : undefined}
      >
        {/* `<scroll-view>`의 직계 자식은 이 상자 하나입니다(ADR-0022 D4) — 간격은
            이 상자가 집니다(`<scroll-view>` 안은 강제 linear라 `gap`이 무동작입니다). */}
        <view className="settings-screen-list" data-testid="settings-screen-list">
          <SettingsGroup accessibilityLabel={copy.settings.group.account} items={accountItems} />
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
          {/* 목록 끝 앱 버전 줄입니다(ADR-0086) — 호스트가 보낸 값이 없으면(Explorer · 테스트) 줄이 없습니다. 조작
              단위가 아니라 읽기만 하는 요소 하나입니다. */}
          {appVersion !== null ? (
            <text
              className="settings-screen-version"
              data-testid="settings-screen-version"
              flatten={false}
              accessibility-element={true}
              accessibility-label={appVersionLabel(appVersion, copy)}
            >
              {appVersionLabel(appVersion, copy)}
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
