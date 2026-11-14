// 여정 맵의 새 친구 시트 자리입니다(messenger-chat-1-5 spec §7.1 — 2026-11-10부터 해금은 에피소드 막간 클리어). 막간을 끝내면
// 이야기 결선이 해금을 확정하고 인물 id를 기억한 뒤 맵으로 돌아옵니다(`new-friend-pending.ts`). 이야기 화면이 서 있던 동안
// 맵은 내려가 있었으므로 돌아오면 이 자리가 새로 마운트되고, 그때 한 번 꺼내 시트 층으로 맵을 감쌉니다.
// 감쌀지는 마운트 때 한 번만 정합니다 — 맵은 탭 사이에서 지우지 않고 남기므로(ADR-0106) 시트 때문에 트리를 바꿔 맵을 다시
// 만들지 않습니다. 시트 타이머는 층의 기본(`defaultTimers` — 맨 식별자 `setTimeout`, 배경 스레드에 `globalThis.setTimeout`이
// 없어서)을 그대로 씁니다.

import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { emitCompanionEvent } from "../lib/companion-events";
import { NewFriendLayer } from "../screens/messenger-chat/NewFriendLayer";
import type { NewFriendModel } from "../screens/messenger-chat/new-friend.contract";
import { takeNewFriend } from "./new-friend-pending";
import { newFriendModelOf } from "./new-friend-wiring";
import type { ScreenWiring } from "./screen-wiring";

export type NewFriendMapHostProps = {
  readonly wiring: ScreenWiring;
  /** 여정 탭이 지금 보이는가 — 숨은 동안 시트는 서지 않습니다. */
  readonly active: boolean;
  readonly children: ReactNode;
};

export function NewFriendMapHost({ wiring, active, children }: NewFriendMapHostProps): ReactNode {
  // 모델을 못 만들면(이름 · 얼굴 · 첫 메시지 등이 없음) 시트 없이 맵만 둡니다 — 해금은 이미 됐고 목록에 NEW 줄이 남습니다.
  const [model] = useState<NewFriendModel | null>(() => {
    const characterId = takeNewFriend();
    return characterId === null ? null : newFriendModelOf(characterId, wiring);
  });
  if (model === null) return children;
  const closed = (choice: "reply" | "later") =>
    emitCompanionEvent(wiring.messengerChat.eventSink, {
      name: "new_friend_sheet_closed",
      surface: "learning",
      characterId: model.characterId,
      choice,
    });
  return (
    <NewFriendLayer
      model={model}
      active={active}
      onVisibleChange={wiring.onScreenLayerChange}
      onReply={() => {
        closed("reply");
        wiring.messengerChat.onOpenChatRoomFromNewFriend(model.roomId);
      }}
      onLater={() => closed("later")}
    >
      {children}
    </NewFriendLayer>
  );
}
