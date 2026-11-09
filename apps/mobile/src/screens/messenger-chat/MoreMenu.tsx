import type { ReactNode } from "@lynx-js/react";

import flag from "@libitums/icons/lynx/flag";
import pen from "@libitums/icons/lynx/pen";
import refresh from "@libitums/icons/lynx/refresh";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { messengerChatTestIds as ids, type ChatMoreAction } from "./messenger-chat.contract";

import "./messenger-chat.css";

export type MoreMenuProps = {
  readonly onSelect: (action: ChatMoreAction) => void;
  readonly onDismiss: () => void;
};

// 「…」 메뉴 — 항목 셋이 고정 순서(ideas · fix · 구분선 · report)로 섭니다. 메뉴 밖 투명 면을 탭하면 닫힙니다.
export function MoreMenu({ onSelect, onDismiss }: MoreMenuProps): ReactNode {
  const copy = useUiCopy().messengerChat.more;
  return (
    <>
      <view
        className="messenger-chat-more-scrim"
        accessibility-elements-hidden={true}
        bindtap={() => {
          "background only";
          onDismiss();
        }}
      />
      <view
        className="messenger-chat-more-menu"
        data-testid={ids.moreMenu}
        accessibility-role-description="menu"
      >
        <MenuItem
          action="ideas"
          label={copy.ideas}
          icon={refresh}
          iconColor={color.fg.neutral}
          onSelect={onSelect}
        />
        <MenuItem
          action="fix"
          label={copy.fix}
          icon={pen}
          iconColor={color.fg.neutral}
          onSelect={onSelect}
        />
        <view className="messenger-chat-more-divider" accessibility-elements-hidden={true} />
        <MenuItem
          action="report"
          label={copy.report}
          icon={flag}
          iconColor={color.feedback["incorrect-text"]}
          danger={true}
          onSelect={onSelect}
        />
      </view>
    </>
  );
}

type MenuItemProps = {
  readonly action: ChatMoreAction;
  readonly label: string;
  readonly icon: string;
  readonly iconColor: string;
  readonly danger?: boolean;
  readonly onSelect: (action: ChatMoreAction) => void;
};

function MenuItem({ action, label, icon, iconColor, danger, onSelect }: MenuItemProps): ReactNode {
  return (
    <view
      className={`messenger-chat-more-item${danger === true ? " messenger-chat-more-item-danger" : ""}`}
      id={ids.moreItem(action)}
      data-testid={ids.moreItem(action)}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={label}
      bindtap={() => {
        "background only";
        onSelect(action);
      }}
    >
      <svg className="messenger-chat-icon-sm" content={icon} current-color={iconColor} />
      <text className="messenger-chat-more-item-label">{label}</text>
    </view>
  );
}
