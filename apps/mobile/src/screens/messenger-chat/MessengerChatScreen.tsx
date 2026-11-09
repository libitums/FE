import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import menu from "@libitums/icons/lynx/menu";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { ChatHeader, ChatHeaderSide } from "../../components/chat/ChatHeader";
import { ChatLog } from "../../components/chat/ChatLog";
import {
  ChatIncomingRow,
  ChatOutgoingRow,
  ChatTextBubble,
} from "../../components/chat/ChatMessageRow";
import { ChatTypingRow } from "../../components/chat/ChatTypingRow";
import { keyboardDockBodyStyle } from "../../lib/keyboard-dock";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import {
  PhotoBubble,
  PhotoPendingBubble,
  VoiceBubble,
  VoicePendingBubble,
} from "./ChatMediaBubbles";
import { ChatRoomDock } from "./ChatRoomDock";
import { ChatRoomOverlays } from "./ChatRoomOverlays";
import type { ChatMessage, ChatThread } from "./chat-source.contract";
import { chatKeyboardSlotHeight } from "./keyboard-height";
import {
  messengerChatTestIds as ids,
  type MessengerChatScreenProps,
} from "./messenger-chat.contract";
import { useAnnounceArrivals } from "./use-announce-arrivals";
import { useChatRoom } from "./use-chat-room";

import "./messenger-chat.css";

type MessageRowProps = {
  readonly message: ChatMessage;
  readonly thread: ChatThread;
  readonly learnerName: string;
};

// 메시지 하나가 서는 줄입니다. 같은 id의 pending → 도착은 같은 key 자리에서 바뀝니다.
function MessageRow({ message, thread, learnerName }: MessageRowProps): ReactNode {
  const { counterpart } = thread;
  const avatar = { name: counterpart.name, imageUrl: counterpart.avatarUrl };
  switch (message.kind) {
    case "text":
      if (message.from === "me") {
        return (
          <ChatOutgoingRow testId={ids.outgoing}>
            <ChatTextBubble
              direction="outgoing"
              speaker={learnerName}
              message={message.text.ko}
              translation={null}
            />
          </ChatOutgoingRow>
        );
      }
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <ChatTextBubble
            direction="incoming"
            speaker={counterpart.name}
            message={message.text.ko}
            translation={message.text.en}
          />
        </ChatIncomingRow>
      );
    case "photo-pending":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <PhotoPendingBubble name={counterpart.name} testId={ids.photoPending} />
        </ChatIncomingRow>
      );
    case "photo":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <PhotoBubble src={message.imageUrl} name={counterpart.name} testId={ids.photo} />
        </ChatIncomingRow>
      );
    case "voice-pending":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <VoicePendingBubble name={counterpart.name} testId={ids.voicePending} />
        </ChatIncomingRow>
      );
    case "voice":
      return (
        <ChatIncomingRow avatar={avatar} testId={ids.incoming}>
          <VoiceBubble
            durationMs={message.durationMs}
            text={message.text}
            name={counterpart.name}
            testId={ids.voice}
          />
        </ChatIncomingRow>
      );
    default: {
      const unreachable: never = message;
      return unreachable;
    }
  }
}

// 자유 대화 방입니다 — 머리 · 대화 로그 · 입력 독(기능 줄 · 입력 줄 · 토글 · 키보드 자리) · 겹침 하나.
// 방 UI 상태와 출처 호출은 useChatRoom이 지고, 이 화면은 조립만 합니다.
export function MessengerChatScreen({
  roomId,
  source,
  keyboardProbe,
  keyboardHeightStore,
  edges,
  learnerName,
  gemBalance,
  onExit,
}: MessengerChatScreenProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  const room = useChatRoom({ roomId, source, keyboardProbe, keyboardHeightStore, edges, onExit });
  const { state, plan, thread, keyboardHeight, dispatch, send } = room;

  const exit = () => {
    "background only";
    onExit();
  };
  useScreenBack(exit);

  // 겹침이 열린 동안 뒤 화면(머리 · 로그 · 독)은 낭독에서 숨습니다. 「…」 메뉴는 독 안의 가벼운 팝업이라 제외합니다.
  const overlayOpen = state.overlay.kind !== "none" && state.overlay.kind !== "more-menu";
  // 상대 말 도착을 낭독합니다(초점은 입력 줄에 있어 로그를 다시 훑기 전에는 답이 왔는지 모릅니다 — a11y M1).
  useAnnounceArrivals(
    thread === null ? null : thread.messages,
    thread === null ? "" : thread.counterpart.name,
    copy.room,
    overlayOpen,
  );

  // 방이 사라지는 순간(지운 직후)에는 onExit이 곧 화면을 걷어 가므로 빈 상자만 남깁니다.
  if (thread === null) return <view className="messenger-chat-screen" data-testid={ids.screen} />;

  const slotHeight = chatKeyboardSlotHeight({
    plan,
    keyboard: state.keyboard,
    slot: state.slot,
    phoneFocus: state.phoneFocus,
    height: keyboardHeight,
    bottomInset: edges.bottom,
  });

  return (
    <view className="messenger-chat-screen" data-testid={ids.screen}>
      <view
        className="messenger-chat-body"
        accessibility-elements-hidden={overlayOpen ? true : undefined}
      >
        <view className="messenger-chat-main" style={keyboardDockBodyStyle(edges, "keyboard")}>
          <ChatHeader
            title={thread.counterpart.name}
            insetTop={0}
            testIds={{ root: ids.header, title: ids.title }}
            start={
              <ChatHeaderSide testId={ids.back}>
                <RoundButton
                  accessibilityLabel={copy.room.back}
                  icon={arrowLeft03}
                  variant="neutral"
                  size="l"
                  bindtap={exit}
                />
              </ChatHeaderSide>
            }
            end={
              <ChatHeaderSide
                testId={ids.settings}
                id={ids.settings}
                accessibilityLabel={copy.room.settings}
                onTap={() => dispatch({ type: "open-overlay", overlay: { kind: "sidebar" } })}
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
          <ChatLog testId={ids.log} followKey={slotHeight}>
            {thread.messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                thread={thread}
                learnerName={learnerName}
              />
            ))}
            {thread.typing ? (
              <ChatTypingRow
                avatar={{ name: thread.counterpart.name, imageUrl: thread.counterpart.avatarUrl }}
                label={copy.room.typing(thread.counterpart.name)}
                testId={ids.typing}
              />
            ) : null}
          </ChatLog>
        </view>
        <ChatRoomDock
          state={state}
          plan={plan}
          thread={thread}
          edges={edges}
          keyboardHeight={keyboardHeight}
          dispatch={dispatch}
          onSend={send}
        />
      </view>
      <ChatRoomOverlays
        state={state}
        dispatch={dispatch}
        thread={thread}
        source={source}
        learnerName={learnerName}
        gemBalance={gemBalance}
      />
    </view>
  );
}
