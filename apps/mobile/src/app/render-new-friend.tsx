// 결과 화면을 새 친구 시트 층으로 감쌉니다(messenger-chat-1-5 spec §7.1). `render-catalog.tsx`가 커지지 않게 떼어 둔 자리입니다.
// 시트 타이머는 층의 기본(`defaultTimers` — 맨 식별자 `setTimeout`, 배경 스레드에 `globalThis.setTimeout`이 없어서)을 그대로 씁니다.

import type { ReactNode } from "@lynx-js/react";

import { NewFriendLayer } from "../screens/messenger-chat/NewFriendLayer";
import { newFriendModelOf } from "./new-friend-wiring";
import type { ScreenWiring } from "./screen-wiring";

export function withNewFriendLayer(
  result: ReactNode,
  characterId: string | undefined,
  wiring: ScreenWiring,
  /** Reply가 부르는 지금 나가기(결과 화면의 나가기와 같음). */
  exitResult: () => void,
): ReactNode {
  if (characterId === undefined) return result;
  const model = newFriendModelOf(characterId, wiring);
  if (model === null) return result;
  return (
    <NewFriendLayer
      model={model}
      resultFocusId="lesson-complete-screen-title"
      onReply={() => {
        exitResult();
        wiring.messengerChat.onOpenChatRoomFromNewFriend(model.roomId);
      }}
    >
      {result}
    </NewFriendLayer>
  );
}
