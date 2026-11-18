// 방 머리의 인물 프로필입니다 — 뒤로 단추 옆 아바타 단추가 프로필 시트를 엽니다(인물 표의 아홉 인물, 들어온 방은 늘 열린 방).
// 방 안에서는 「친구 추가」가 없고, 서버가 더는 보이지 않게 한 추가한 친구면 대화 불가 한 줄이 섭니다.

import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { ChatHeaderSide } from "../../components/chat/ChatHeader";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { useChatEvents } from "./chat-events";
import { friendsTestIds as ids } from "./chat-friends.contract";
import type { ChatSource, ChatThread } from "./chat-source.contract";
import { friendProfileModel, friendWithdrawn } from "./companion-friends";
import { companionCharacterOf } from "./companion-roster";
import { FriendProfileSheet } from "./FriendProfileSheet";
import { useFriendsState } from "./use-friends";

import "./friends.css";

export type RoomProfile = {
  /** 아바타 단추를 세울지 — 인물 표 밖의 방(가짜 출처 연습 방)은 없습니다. */
  readonly enabled: boolean;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly open: () => void;
  /** 열려 있으면 시트, 아니면 null. */
  readonly sheet: ReactNode;
};

export function useRoomProfile(source: ChatSource, thread: ChatThread | null): RoomProfile {
  const copy = useUiCopy().messengerChat.friends;
  const { emit } = useChatEvents();
  const state = useFriendsState(source);
  const [opened, setOpened] = useState(false);
  const close = () => setOpened(false);
  useLayerBack(opened ? close : null);
  const characterId = thread?.counterpart.id ?? "";
  const enabled = thread !== null && companionCharacterOf(characterId) !== null;
  const model =
    enabled && opened
      ? friendProfileModel(characterId, { language: copy.profileLanguage, addable: false })
      : null;
  return {
    enabled,
    name: thread?.counterpart.name ?? "",
    avatarUrl: thread?.counterpart.avatarUrl ?? null,
    open: () => {
      "background only";
      if (!enabled) return;
      playSound("button");
      emit({ name: "friend_profile_opened", surface: "chat", characterId, source: "room" });
      setOpened(true);
    },
    sheet:
      model === null ? null : (
        <FriendProfileSheet
          model={model}
          avatarUrl={thread?.counterpart.avatarUrl ?? null}
          unavailable={friendWithdrawn(characterId, state)}
          onAdd={close}
          onClose={close}
        />
      ),
  };
}

export type RoomHeaderStartProps = {
  readonly backLabel: string;
  readonly backTestId: string;
  readonly onBack: () => void;
  readonly profile: RoomProfile;
};

/** 방 머리 앞 칸 — 뒤로 단추와 (인물 방이면) 아바타 단추. */
export function RoomHeaderStart({
  backLabel,
  backTestId,
  onBack,
  profile,
}: RoomHeaderStartProps): ReactNode {
  const copy = useUiCopy().messengerChat.friends;
  return (
    <view className="friends-header-start">
      <ChatHeaderSide testId={backTestId}>
        <RoundButton
          accessibilityLabel={backLabel}
          icon={arrowLeft03}
          variant="neutral"
          size="l"
          bindtap={onBack}
        />
      </ChatHeaderSide>
      {profile.enabled ? (
        <view
          className="friends-header-avatar"
          data-testid={ids.roomAvatar}
          accessibility-element={true}
          accessibility-label={copy.openProfile(profile.name)}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          bindtap={profile.open}
        >
          <Avatar
            imageSource={profile.avatarUrl ?? undefined}
            name={profile.name}
            size="sm"
            accessibility="hidden"
          />
        </view>
      ) : null}
    </view>
  );
}
