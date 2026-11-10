import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { SLOP_TOGGLE } from "./hit-slop";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { ComposerKeyboard } from "./keyboard-plan";

import "./messenger-chat.css";

export type KeyboardToggleRowProps = {
  readonly mode: ComposerKeyboard;
  readonly onSelect: (mode: ComposerKeyboard) => void;
};

// 한국어 키보드 ↔ 휴대폰 키보드 토글 두 칸입니다. 켜진 칸은 낭독에 selected가 들고, 다시 눌러도 아무 일도 없습니다.
export function KeyboardToggleRow({ mode, onSelect }: KeyboardToggleRowProps): ReactNode {
  const copy = useUiCopy().messengerChat.toggle;
  const cells: readonly { readonly value: ComposerKeyboard; readonly label: string }[] = [
    { value: "learning", label: copy.learning },
    { value: "phone", label: copy.phone },
  ];
  return (
    <view className="messenger-chat-toggle-row" data-testid={ids.toggleRow}>
      <view className="messenger-chat-toggle-track">
        {cells.map(({ value, label }) => {
          const selected = value === mode;
          return (
            <view
              key={value}
              className={
                selected
                  ? "messenger-chat-toggle messenger-chat-toggle-selected"
                  : "messenger-chat-toggle"
              }
              data-testid={ids.toggle(value)}
              data-selected={selected ? "true" : "false"}
              hit-slop={SLOP_TOGGLE}
              accessibility-element={true}
              accessibility-traits="button"
              accessibility-label={selected ? copy.selected(label) : label}
              bindtap={() => {
                "background only";
                if (!selected) onSelect(value);
              }}
            >
              <text className="messenger-chat-toggle-label" accessibility-element={false}>
                {label}
              </text>
            </view>
          );
        })}
      </view>
    </view>
  );
}
