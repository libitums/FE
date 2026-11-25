// 채팅 첫 답장 뒤 알림 권한 카드 · 켠 뒤 한 줄(ADR-0197). 대화 기록에 남는 메시지가 아니라 로그 끝의 지역 줄입니다 — 방을 새로 열면
// 다시 정합니다. 판정 · 등록은 결선이 내린 포트가 지고, 여기서는 「이번 입장에서 보낸 말에 첫 답이 다 왔다」를 보고 한 번 묻습니다.

import { createContext, useContext, useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import notification03 from "@libitums/icons/lynx/notification-03";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import { initialReplyWatch, replyArrived, replyWatchNext } from "./chat-push-ask-rules";
import {
  chatPushAskTestIds as ids,
  type ChatPushAskPort,
  type ChatPushAskView,
} from "./chat-push-ask.contract";
import type { ChatThread } from "./chat-source.contract";

import "./chat-push-ask.css";

/** 결선이 회원 방에만 내리는 포트(ADR-0197 D5). 없으면 카드 자리가 아무것도 하지 않습니다. */
export const ChatPushAskContext = createContext<ChatPushAskPort | null>(null);

export type ChatPushAskCardProps = {
  readonly name: string;
  /** 시스템 창의 답을 기다리는 중 — 두 단추가 눌리지 않습니다. */
  readonly asking: boolean;
  readonly onTurnOn: () => void;
  readonly onNotNow: () => void;
};

export function ChatPushAskCard({
  name,
  asking,
  onTurnOn,
  onNotNow,
}: ChatPushAskCardProps): ReactNode {
  const copy = useUiCopy().messengerChat.pushAsk;
  const title = copy.title(name);
  return (
    <view className="chat-push-ask" data-testid={ids.card} flatten={false}>
      <view
        className="chat-push-ask-head"
        data-testid={`${ids.card}-text`}
        flatten={false}
        accessibility-element={true}
        accessibility-label={`${title} ${copy.body}`}
      >
        <view className="chat-push-ask-bell" accessibility-elements-hidden={true}>
          <svg
            className="chat-push-ask-bell-icon"
            content={notification03}
            current-color={color.fg.brand}
          />
        </view>
        <view className="chat-push-ask-text" accessibility-elements-hidden={true}>
          <text className="chat-push-ask-title">{title}</text>
          <text className="chat-push-ask-body">{copy.body}</text>
        </view>
      </view>
      <view className="chat-push-ask-actions">
        <view className="chat-push-ask-action" data-testid={ids.turnOn}>
          <Button
            label={copy.turnOn}
            variant="brand"
            size="m"
            width="fill"
            loading={asking}
            bindtap={onTurnOn}
          />
        </view>
        <view className="chat-push-ask-action" data-testid={ids.notNow}>
          <Button
            label={copy.notNow}
            variant="subtle"
            size="m"
            width="fill"
            disabled={asking}
            bindtap={onNotNow}
          />
        </view>
      </view>
    </view>
  );
}

export function ChatPushAskOn({ name }: { readonly name: string }): ReactNode {
  const text = useUiCopy().messengerChat.pushAsk.on(name);
  return (
    <view
      className="chat-push-ask-on"
      data-testid={ids.on}
      flatten={false}
      accessibility-element={true}
      accessibility-label={text}
    >
      <svg className="chat-push-ask-on-icon" content={tick} current-color={color.fg.brand} />
      <text className="chat-push-ask-on-text" accessibility-elements-hidden={true}>
        {text}
      </text>
    </view>
  );
}

export type ChatPushAskSlotProps = {
  readonly thread: ChatThread;
  /** 답 · 첫 인사를 기다리는 중(입력 중 · 답 대기). */
  readonly busy: boolean;
};

/** 방 로그 끝의 카드 자리 — 첫 답이 다 오면 포트에 한 번 묻고, 답에 따라 카드 · 한 줄을 그립니다. */
export function ChatPushAskSlot({ thread, busy }: ChatPushAskSlotProps): ReactNode {
  const port = useContext(ChatPushAskContext);
  const { emit } = useChatEvents();
  const [view, setView] = useState<ChatPushAskView>("none");
  const watch = useRef(initialReplyWatch);
  const asked = useRef(false);
  const live = useRef(true);
  const characterId = thread.counterpart.id;
  const messages = thread.messages;

  useEffect(
    () => () => {
      live.current = false;
    },
    [],
  );

  useEffect(() => {
    watch.current = replyWatchNext(watch.current, messages);
    if (port === null || asked.current || !replyArrived(watch.current, busy)) return;
    asked.current = true;
    void port.due().then((due) => {
      if (!due.show || !live.current) return;
      setView("card");
      emit({ name: "chat_push_ask_shown", surface: "chat", characterId, count: String(due.count) });
    });
  }, [messages, busy, port]);

  if (view === "none") return null;
  if (view === "on") return <ChatPushAskOn name={thread.counterpart.name} />;

  const turnOn = () => {
    "background only";
    if (port === null || view !== "card") return;
    setView("asking");
    emit({ name: "chat_push_ask_tapped", surface: "chat", characterId, choice: "turn_on" });
    void port.turnOn().then((answer) => {
      if (answer !== null)
        emit({ name: "chat_push_ask_answered", surface: "chat", characterId, result: answer });
      if (live.current) setView(answer === "allowed" ? "on" : "none");
    });
  };
  const notNow = () => {
    "background only";
    if (view !== "card") return;
    setView("none");
    emit({ name: "chat_push_ask_tapped", surface: "chat", characterId, choice: "not_now" });
  };
  return (
    <ChatPushAskCard
      name={thread.counterpart.name}
      asking={view === "asking"}
      onTurnOn={turnOn}
      onNotNow={notNow}
    />
  );
}
