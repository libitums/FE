// 대화방 안 상대 프로필 시트(ADR-0178 개정 ⟨대화방⟩) — 스토리 보기 아바타와 같은 시트(`SuggestedFriendSheet`)를 다시 쓰되, 이미 그
// 인물과 대화 중이라 행동 단추(Start chatting · Chat now) 없이 Close 하나만 둡니다. 열고 닫는 상태는 방의 겹침(`profile`)입니다.

import { useContext } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { chatProfileModelOf, chatProfileVoiceUrlOf, ChatProfileContext } from "./chat-profile";
import type { ChatCounterpart } from "./chat-source.contract";
import { SuggestedFriendSheet } from "./SuggestedFriendSheet";

const NOTHING = (): void => undefined;

export function ChatProfileSheet({
  counterpart,
  onClose,
}: {
  readonly counterpart: ChatCounterpart;
  readonly onClose: () => void;
}): ReactNode {
  const port = useContext(ChatProfileContext);
  const model = chatProfileModelOf(port, counterpart);
  return (
    <SuggestedFriendSheet
      model={model}
      now={Date.now()}
      voiceSampleUrl={chatProfileVoiceUrlOf(port, model)}
      romanization={port?.romanization?.() === true ? "shown" : "hidden"}
      actions="close"
      onStart={NOTHING}
      onEarly={NOTHING}
      onClose={onClose}
    />
  );
}
