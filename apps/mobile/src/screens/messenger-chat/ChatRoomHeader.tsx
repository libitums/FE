import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import menu from "@libitums/icons/lynx/menu";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { ChatHeader, ChatHeaderSide } from "../../components/chat/ChatHeader";
import type { ChatHeaderProps } from "../../components/chat/chat.contract";
import { useUiCopy } from "../../lib/ui-copy";
import { TurnLine } from "./ChatTurns";
import type { TurnPlan } from "./free-turns";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

export type ChatRoomHeaderProps = {
  readonly name: string;
  readonly plan: TurnPlan;
  /** 턴 패널(체험 끝)이 떠 있는가 — 턴 줄이 「다 씀」으로 읽힙니다. */
  readonly panelOpen: boolean;
  /** 제목(인물 이름)을 누르면 프로필(ADR-0162 2026-11-19 추가) — 없으면 누를 수 없는 제목. */
  readonly titleTap: ChatHeaderProps["titleTap"];
  readonly onBack: () => void;
  readonly onSettings: () => void;
};

// 방 머리(뒤로 · 인물 이름 + 턴 줄 · 설정) — 방 화면에서 나눴습니다(300줄 상한). 새 단추 없이 제목이 프로필 입구입니다.
export function ChatRoomHeader({
  name,
  plan,
  panelOpen,
  titleTap,
  onBack,
  onSettings,
}: ChatRoomHeaderProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  return (
    <ChatHeader
      title={name}
      subtitle={plan.kind === "unlimited" ? undefined : <TurnLine plan={plan} used={panelOpen} />}
      insetTop={0}
      testIds={{ root: ids.header, title: ids.title }}
      {...(titleTap === undefined ? {} : { titleTap })}
      start={
        <ChatHeaderSide testId={ids.back}>
          <RoundButton
            accessibilityLabel={copy.room.back}
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
          accessibilityLabel={copy.room.settings}
          onTap={onSettings}
        >
          <RoundButton
            accessibilityLabel={copy.room.settings}
            icon={menu}
            variant="neutral"
            size="l"
          />
        </ChatHeaderSide>
      }
    />
  );
}
