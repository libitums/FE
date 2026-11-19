// 방 머리에서 여는 인물 프로필(ADR-0162 2026-11-19 추가) — 열린 방이면 아홉 모두. 모델은 순수 `roomProfileModelOf`, 겹침은 방의
// `profile` 겹침(useChatRoom이 뒤로가기 · 낭독 가림의 주인)이고, 시트는 추천 줄과 같은 판을 읽기 전용으로 씁니다.

import type { ReactNode } from "@lynx-js/react";

import type { ChatHeaderProps } from "../../components/chat/chat.contract";
import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import type { ChatRoomAction } from "./chat-room-state";
import type { ChatSource, ChatThread } from "./chat-source.contract";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { friendProfileTestIds as ids } from "./friend-profile.contract";
import { roomProfileModelOf } from "./friend-profile";
import { profileOpenedEvent, voicePlayedEvent } from "./friend-profile-events";
import { SuggestedFriendSheet } from "./SuggestedFriendSheet";

export type RoomProfile = {
  /** 머리 제목을 누르는 자리 — 카탈로그에 없는 인물 · 닫힌 방 · 포트 없음이면 undefined(지금처럼 글자만). */
  readonly titleTap: ChatHeaderProps["titleTap"];
  readonly layer: ReactNode;
};

const noop = (): void => undefined;

export function useRoomProfile({
  port,
  source,
  thread,
  open,
  dispatch,
}: {
  readonly port: SuggestedFriendsPort | undefined;
  readonly source: ChatSource;
  readonly thread: ChatThread | null;
  /** 방 겹침이 `profile`인가. */
  readonly open: boolean;
  readonly dispatch: (action: ChatRoomAction) => void;
}): RoomProfile {
  const copy = useUiCopy().messengerChat.suggested;
  const { emit } = useChatEvents();
  if (port === undefined || thread === null) return { titleTap: undefined, layer: null };
  const access =
    source.snapshot().rooms.find((room) => room.roomId === thread.roomId)?.access ?? null;
  const model = roomProfileModelOf({
    catalog: port.catalog(),
    counterpart: thread.counterpart,
    access,
    ...(port.mediaUrlOf === undefined ? {} : { mediaUrlOf: port.mediaUrlOf }),
  });
  if (model === null) return { titleTap: undefined, layer: null };
  const { id, name } = model.character;
  return {
    titleTap: {
      label: copy.profile.openProfile(name),
      testId: ids.roomTitle,
      onTap: () => {
        "background only";
        emit(profileOpenedEvent(id, "room"));
        dispatch({ type: "open-overlay", overlay: { kind: "profile" } });
      },
    },
    layer: open ? (
      <SuggestedFriendSheet
        model={model}
        now={Date.now()}
        onStart={noop}
        onEarly={noop}
        onClose={() => dispatch({ type: "close-overlay" })}
        onVoicePlayed={() => emit(voicePlayedEvent(id))}
        ownBack={false}
      />
    ) : null,
  };
}
