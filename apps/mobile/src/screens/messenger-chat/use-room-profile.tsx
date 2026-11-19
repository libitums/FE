// 대화방 머리에서 여는 인물 프로필(ADR-0164 앱 추가 2026-11-20) — 열린 방이면 아홉 모두, 잠긴 방 · 모르는 인물은 누를 수 없습니다.
// 모델은 순수 `roomProfileModelOf`, 시트는 추천 줄과 같은 `SuggestedFriendSheet`를 읽기 전용(Close만)으로 씁니다. 뒤로가기는 시트가
// 스스로 겹 뒤로가기(`useLayerBack`)로 받습니다 — 방 겹침 상태(`useChatRoom`)는 건드리지 않습니다(비회원 관문과 같은 자리).

import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { ChatHeaderProps } from "../../components/chat/chat.contract";
import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import type { ChatSource, ChatThread } from "./chat-source.contract";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { roomProfileModelOf, roomProfileOpenedEvent, voicePlayedEvent } from "./friend-profile";
import { SuggestedFriendSheet } from "./SuggestedFriendSheet";

export type RoomProfile = {
  /** 시트가 떠 있는가 — 방 화면이 뒤 화면을 낭독에서 가립니다. */
  readonly open: boolean;
  /** 머리 이름을 누르는 자리 — 포트 없음 · 닫힌 방 · 카탈로그에 없는 인물이면 undefined(지금처럼 글자만). */
  readonly titleTap: ChatHeaderProps["titleTap"];
  readonly layer: ReactNode;
};

const noop = (): void => undefined;

export function useRoomProfile({
  port,
  source,
  thread,
}: {
  readonly port: SuggestedFriendsPort | undefined;
  readonly source: ChatSource;
  readonly thread: ChatThread | null;
}): RoomProfile {
  const copy = useUiCopy().messengerChat.suggested.profile;
  const { emit } = useChatEvents();
  const [open, setOpen] = useState(false);
  if (port === undefined || thread === null)
    return { open: false, titleTap: undefined, layer: null };
  const access =
    source.snapshot().rooms.find((room) => room.roomId === thread.roomId)?.access ?? null;
  const model = roomProfileModelOf({
    catalog: port.catalog(),
    counterpart: thread.counterpart,
    access,
    ...(port.mediaUrlOf === undefined ? {} : { mediaUrlOf: port.mediaUrlOf }),
  });
  if (model === null) return { open: false, titleTap: undefined, layer: null };
  const { character } = model;
  return {
    open,
    titleTap: {
      label: copy.openProfile(character.name),
      onTap: () => {
        "background only";
        emit(roomProfileOpenedEvent(character));
        setOpen(true);
      },
    },
    layer: open ? (
      <SuggestedFriendSheet
        model={model}
        now={Date.now()}
        readOnly
        onStart={noop}
        onEarly={noop}
        onClose={() => setOpen(false)}
        onVoicePlayed={() => emit(voicePlayedEvent(character.id))}
      />
    ) : null,
  };
}
