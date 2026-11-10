import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import lock from "@libitums/icons/lynx/lock";
import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";

import { useUiCopy } from "../../lib/ui-copy";
import type { ChatStoryPoint } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./chat-overlays.css";

export type StoryPointSheetProps = {
  readonly name: string;
  readonly storyPoints: readonly ChatStoryPoint[];
  /** 지금 설정된 시점 id입니다. */
  readonly currentId: string;
  /** 시트에서 고른 시점 id입니다. */
  readonly selected: string;
  readonly onSelect: (id: string) => void;
  readonly onChange: () => void;
  readonly onClose: () => void;
};

type StoryPointRowProps = {
  readonly point: ChatStoryPoint;
  readonly selected: boolean;
  readonly onSelect: (id: string) => void;
};

// 시점 줄은 라디오입니다. 잠긴 줄은 흐리고 탭이 무동작이며, 낭독에 풀리는 조건이 듭니다.
function StoryPointRow({ point, selected, onSelect }: StoryPointRowProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  const locked = !point.unlocked;
  const heading = copy.storyPoint.episodeTitle(point.episodeNumber, point.title);
  const relation = copy.storyPoint.relation[point.relation];
  const base = `${heading}, ${relation}`;
  const spoken = locked
    ? `${base}, ${copy.storyPoint.lockedCondition(point.episodeNumber)}`
    : selected
      ? copy.toggle.selected(base)
      : base;
  const handleTap = () => {
    "background only";
    onSelect(point.id);
  };
  return (
    <view
      className={`chat-radio-row${selected ? " chat-radio-row-selected" : ""}${locked ? " chat-radio-row-locked" : ""}`}
      data-testid={ids.storyPointOption(point.id)}
      data-selected={selected ? "true" : "false"}
      data-locked={locked ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={spoken}
      accessibility-traits={locked ? "disabled" : "button"}
      accessibility-role-description="radio"
      accessibility-enable-tap={!locked}
      bindtap={locked ? undefined : handleTap}
    >
      <view
        className={`chat-radio${selected ? " chat-radio-on" : ""}`}
        accessibility-elements-hidden={true}
      >
        {selected ? <view className="chat-radio-dot" /> : null}
      </view>
      <view className="chat-radio-text" accessibility-elements-hidden={true}>
        <text className="chat-radio-title">{heading}</text>
        <text className="chat-radio-subtitle">{relation}</text>
      </view>
      {locked ? (
        <svg
          className="chat-radio-lock"
          content={lock}
          current-color={color.fg["neutral-subtle"]}
          accessibility-elements-hidden={true}
        />
      ) : null}
    </view>
  );
}

// 이야기 시점 시트(O5)입니다. 지금 값과 다른 열린 시점을 골라야 「Change」가 켜집니다.
export function StoryPointSheet({
  name,
  storyPoints,
  currentId,
  selected,
  onSelect,
  onChange,
  onClose,
}: StoryPointSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat.storyPoint;
  return (
    <view data-testid={ids.storyPointSheet}>
      <BottomSheet
        title={copy.title}
        description={copy.description(name)}
        closeAccessibilityLabel={copy.close}
        actions={[
          { id: "change", label: copy.change, disabled: selected === currentId, bindtap: onChange },
        ]}
        ondismiss={onClose}
      >
        <view className="chat-radio-list">
          {storyPoints.map((point) => (
            <StoryPointRow
              key={point.id}
              point={point}
              selected={point.id === selected}
              onSelect={onSelect}
            />
          ))}
        </view>
      </BottomSheet>
    </view>
  );
}
