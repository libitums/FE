import type { ReactNode } from "@lynx-js/react";
import lock from "@libitums/icons/lynx/lock";
import { color } from "@libitums/design-tokens";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import type { MessengerChatCopy } from "./messenger-chat.contract";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import { chatRowPreview, chatTimeOf, newBadgeShown, unreadBadge } from "./chat-list";
import { ChatListNewBadge } from "./ChatListNewBadge";
import type { ChatRowPreview, ChatTime } from "./chat-list";
import { voiceDurationLabel } from "./chat-rules";
import type { ChatRoomSummary } from "./chat-source.contract";
import type { FriendStory } from "./friend-stories.contract";

import "./messenger-list.css";
import "./friend-stories.css";

export type ChatListRowProps = {
  readonly room: ChatRoomSummary;
  /** 시간 표기 기준 시각(epoch ms)입니다. */
  readonly now: number;
  readonly onOpen: (roomId: string) => void;
  /** 그 인물의 안 본 친구 스토리(ADR-0178 D3) — 안 읽은 메시지 · 진행 중 활동이 없을 때만 줄이 「New story」가 되고 누르면 스토리를 엽니다. */
  readonly story?: FriendStory | null;
  readonly onOpenStory?: () => void;
};

type PreviewTone = "activity" | "unread" | "muted" | "greeting" | "story";

// 미리보기 한 줄의 글입니다. 대화 내용은 한국어 원문을 보입니다(번역은 방 안에서 봅니다).
function previewText(preview: ChatRowPreview, name: string, copy: MessengerChatCopy): string {
  switch (preview.kind) {
    case "activity":
      if (preview.activity === "typing") return copy.list.typing(name);
      if (preview.activity === "sending-photo") return copy.list.sendingPhoto(name);
      return copy.list.recordingVoice(name);
    case "locked":
      return copy.list.lockedCondition(preview.unlockEpisode);
    case "text":
      return preview.from === "me" ? copy.list.mine(preview.text.ko) : preview.text.ko;
    case "photo":
      return copy.list.photo;
    case "voice":
      // 서버 음성은 길이를 모릅니다(0) — 「Voice message」만(ADR-0146 「앱 연결」).
      return preview.durationMs > 0
        ? copy.list.voice(voiceDurationLabel(preview.durationMs))
        : copy.media.listVoice;
    case "greeting":
      return preview.text;
    case "empty":
      return "";
    default: {
      const unreachable: never = preview;
      return unreachable;
    }
  }
}

function timeText(time: ChatTime, copy: MessengerChatCopy): string {
  switch (time.kind) {
    case "now":
      return copy.time.now;
    case "today":
      return copy.time.today(time.hours, time.minutes);
    case "yesterday":
      return copy.time.yesterday;
    case "weekday":
      return copy.time.weekdays[time.weekday];
    case "date":
      return copy.time.date(time.month, time.day);
    default: {
      const unreachable: never = time;
      return unreachable;
    }
  }
}

/** 채팅 목록의 한 줄입니다. 열린 줄만 버튼이고, 잠긴 줄은 조건을 읽어 주기만 합니다. */
export function ChatListRow({
  room,
  now,
  onOpen,
  story = null,
  onOpenStory,
}: ChatListRowProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  const { counterpart } = room;
  const locked = room.access.kind === "locked";
  const preview = chatRowPreview(room);
  // 안 본 스토리 줄 — 메시지가 더 급하면(안 읽음 · 입력 중) 보통 줄 그대로입니다.
  const storyRow =
    story !== null &&
    onOpenStory !== undefined &&
    !locked &&
    room.unread === 0 &&
    preview.kind !== "activity";
  const text = storyRow
    ? copy.stories.listPreview(story.line.ko)
    : previewText(preview, counterpart.name, copy);
  const tone: PreviewTone = storyRow
    ? "story"
    : preview.kind === "activity"
      ? "activity"
      : preview.kind === "greeting"
        ? "greeting"
        : room.unread > 0 && !locked
          ? "unread"
          : "muted";
  const badge = locked ? null : unreadBadge(room.unread);
  const time = locked || room.lastMessage === null ? null : chatTimeOf(room.updatedAt, now);
  const when = time === null ? null : timeText(time, copy);

  const isNew = newBadgeShown(room, preview);

  const rowLabel = locked
    ? copy.list.lockedRowLabel(counterpart.name, text)
    : copy.list.rowLabel(
        counterpart.name,
        text,
        when ?? "",
        badge === null ? null : copy.list.unreadLabel(room.unread),
      );
  // 새 친구 줄은 낭독이 「New friend」로, 첫 인사 줄은 「New greeting」으로 시작합니다(알약은 숨깁니다).
  const label = storyRow
    ? copy.stories.listRowLabel(counterpart.name, story.line.ko)
    : room.isNew
      ? `${copy.list.newFriendLabel}, ${rowLabel}`
      : isNew
        ? `${copy.list.greetingLabel}, ${rowLabel}`
        : rowLabel;

  function handleTap() {
    "background only";
    if (locked) return;
    playSound("button");
    if (storyRow) return onOpenStory?.();
    onOpen(room.roomId);
  }

  return (
    <view
      className={locked ? "messenger-list-row messenger-list-row-locked" : "messenger-list-row"}
      data-testid={ids.row(room.roomId)}
      data-locked={locked ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits={locked ? undefined : "button"}
      accessibility-enable-tap={!locked}
      bindtap={locked ? undefined : handleTap}
    >
      <view className="messenger-list-avatar">
        <view
          className={
            locked
              ? "messenger-list-avatar-dim"
              : storyRow
                ? "messenger-list-story-ring"
                : "messenger-list-avatar-face"
          }
          data-testid={storyRow ? `messenger-list-story-ring-${room.roomId}` : undefined}
        >
          <Avatar
            imageSource={counterpart.avatarUrl ?? undefined}
            name={counterpart.name}
            size="md"
            accessibility="hidden"
          />
        </view>
        {locked ? (
          <view className="messenger-list-lock" accessibility-elements-hidden={true}>
            <svg className="messenger-list-lock-icon" content={lock} current-color={color.white} />
          </view>
        ) : null}
      </view>
      <view className="messenger-list-body">
        <view className="messenger-list-line">
          {isNew ? (
            <view className="messenger-list-name-group">
              <text className="messenger-list-name messenger-list-name-fit">
                {counterpart.name}
              </text>
              <ChatListNewBadge roomId={room.roomId} />
            </view>
          ) : (
            <text
              className={
                locked ? "messenger-list-name messenger-list-name-locked" : "messenger-list-name"
              }
            >
              {counterpart.name}
            </text>
          )}
          {when === null ? null : (
            <text
              className={
                room.unread > 0
                  ? "messenger-list-time messenger-list-time-unread"
                  : "messenger-list-time"
              }
              data-testid={ids.rowTime(room.roomId)}
            >
              {when}
            </text>
          )}
        </view>
        <view className="messenger-list-line">
          <text
            className={`messenger-list-preview messenger-list-preview-${tone}`}
            data-testid={ids.rowPreview(room.roomId)}
            data-tone={tone}
          >
            {text}
          </text>
          {badge === null ? null : (
            <view className="messenger-list-unread" data-testid={ids.rowUnread(room.roomId)}>
              <text className="messenger-list-unread-text">{badge}</text>
            </view>
          )}
        </view>
      </view>
    </view>
  );
}
