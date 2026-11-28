import type { ReactNode } from "@lynx-js/react";

import arrowDown from "@libitums/icons/lynx/arrow-down";
import arrowUp from "@libitums/icons/lynx/arrow-up";
import camera from "@libitums/icons/lynx/camera";
import mic from "@libitums/icons/lynx/mic";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";

import type { ChatAvatar } from "../../components/chat/chat.contract";
import {
  newMessagePillTestIds as ids,
  type NewMessagePillCopy,
  type PillView,
} from "./new-message-pill.contract";

import "./messenger-chat.css";
import "./new-message-pill.css";

export type NewMessagePillProps = {
  readonly view: PillView;
  readonly avatar: ChatAvatar;
  readonly copy: NewMessagePillCopy;
  readonly onJump: () => void;
};

// 로그 아래의 「새 메시지 ↓」 알약(보낸 사람 얼굴 · 문구 · ↓) 또는 오른쪽 아래 맨 아래로 단추. 둘 다 단추로 읽히고, 얼굴 · 아이콘은
// 낭독에서 숨습니다 — 도착 자체는 useAnnounceArrivals가 이미 읽습니다.
export function NewMessagePill({ view, avatar, copy, onJump }: NewMessagePillProps): ReactNode {
  if (view === null) return null;
  const jump = () => {
    "background only";
    onJump();
  };
  if (view.kind === "latest") {
    return (
      <view
        className="messenger-chat-latest"
        data-testid={ids.latest}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={copy.latest}
        bindtap={jump}
      >
        <svg
          className="messenger-chat-icon-xs"
          content={arrowDown}
          current-color={color.fg["neutral-muted"]}
        />
      </view>
    );
  }
  // 「위에 도착 ↑」(안내의 무료 예시 — 첫 인사 아래에 도착): 같은 알약에 문구 · ↑만 다릅니다.
  const above = view.kind === "above";
  const media = above ? view.media : view.arrival.latest;
  const label = above ? copy.above(view.media) : copy.label(view.arrival);
  return (
    <view className="messenger-chat-newpill-row">
      <view
        className="messenger-chat-newpill"
        data-testid={above ? ids.above : ids.pill}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={above ? label : copy.jump}
        bindtap={jump}
      >
        <Avatar
          name={avatar.name}
          imageSource={avatar.imageUrl ?? undefined}
          size="sm"
          accessibility="hidden"
        />
        {media === "message" ? null : (
          <svg
            className="messenger-chat-icon-xs messenger-chat-newpill-media"
            content={media === "photo" ? camera : mic}
            current-color={color.white}
          />
        )}
        <text className="messenger-chat-newpill-label">{label}</text>
        <svg
          className="messenger-chat-icon-xs"
          content={above ? arrowUp : arrowDown}
          current-color={color.white}
        />
      </view>
    </view>
  );
}
