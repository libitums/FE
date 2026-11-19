import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import menu from "@libitums/icons/lynx/menu";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { ChatHeader, ChatHeaderSide } from "../../components/chat/ChatHeader";
import { useUiCopy } from "../../lib/ui-copy";
import { TurnLine } from "./ChatTurns";
import type { TurnPlan } from "./free-turns";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

export type ChatRoomHeaderProps = {
  readonly name: string;
  readonly plan: TurnPlan;
  /** 무료 소진 판이 떠 있는가 — 턴 줄이 「다 씀」으로 섭니다. */
  readonly used: boolean;
  readonly onBack: () => void;
  readonly onMenu: () => void;
};

// 방 머리 — 뒤로 · 상대 이름(+ 턴 줄) · 메뉴(사이드바). `MessengerChatScreen`에서 떼어 냈습니다(300줄).
export function ChatRoomHeader({
  name,
  plan,
  used,
  onBack,
  onMenu,
}: ChatRoomHeaderProps): ReactNode {
  const copy = useUiCopy().messengerChat.room;
  return (
    <ChatHeader
      title={name}
      subtitle={plan.kind === "unlimited" ? undefined : <TurnLine plan={plan} used={used} />}
      insetTop={0}
      testIds={{ root: ids.header, title: ids.title }}
      start={
        <ChatHeaderSide testId={ids.back}>
          <RoundButton
            accessibilityLabel={copy.back}
            icon={arrowLeft03}
            variant="neutral"
            size="l"
            bindtap={onBack}
          />
        </ChatHeaderSide>
      }
      end={
        <ChatHeaderSide
          testId={ids.settings}
          id={ids.settings}
          accessibilityLabel={copy.settings}
          onTap={onMenu}
        >
          <RoundButton accessibilityLabel={copy.settings} icon={menu} variant="neutral" size="l" />
        </ChatHeaderSide>
      }
    />
  );
}
