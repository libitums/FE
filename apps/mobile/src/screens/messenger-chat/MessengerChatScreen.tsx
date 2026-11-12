import { useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import menu from "@libitums/icons/lynx/menu";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { ChatHeader, ChatHeaderSide } from "../../components/chat/ChatHeader";
import { ChatLog } from "../../components/chat/ChatLog";
import { ChatTypingRow } from "../../components/chat/ChatTypingRow";
import { announce } from "../../lib/accessibility";
import { keyboardDockBodyStyle } from "../../lib/keyboard-dock";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { CHAT_COIN_PRICES } from "./chat-coins";
import { ChatMessageRow } from "./ChatMessageRows";
import { ChatRoomDock } from "./ChatRoomDock";
import { ChatRoomOverlays } from "./ChatRoomOverlays";
import { LastFreeStrip, TurnLine } from "./ChatTurns";
import { MoreMenu, overlayForMore } from "./MoreMenu";
import { OutOfFreePanel } from "./OutOfFreePanel";
import { FREE_TURNS_PER_DAY } from "./free-turns";
import { chatKeyboardSlotHeight } from "./keyboard-height";
import {
  messengerChatTestIds as ids,
  type MessengerChatScreenProps,
} from "./messenger-chat.contract";
import { useAnnounceArrivals } from "./use-announce-arrivals";
import { useBubbleTools } from "./use-bubble-tools";
import { useChatRoom } from "./use-chat-room";
import { useChatTurns } from "./use-chat-turns";
import { useCoinBalance } from "./use-coin-balance";

import "./messenger-chat.css";

// 자유 대화 방입니다 — 머리 · 대화 로그 · 입력 독(기능 줄 · 입력 줄 · 토글 · 키보드 자리) · 겹침 하나.
// 방 UI 상태와 출처 호출은 useChatRoom이 지고, 이 화면은 조립만 합니다.
export function MessengerChatScreen({
  roomId,
  source,
  keyboardProbe,
  keyboardHeightStore,
  edges,
  learnerName,
  wallet,
  turns,
  tier,
  now,
  timers,
  onExit,
  onOpenMemories,
}: MessengerChatScreenProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  const coinBalance = useCoinBalance(wallet);
  // 보내기 관문(턴 · 엽전)은 useChatTurns가 지는데, 그 훅은 방의 dispatch(키보드 접기 · 상점 열기)가 필요합니다 —
  // 서로를 기다리지 않게 방이 관문을 참조로 부릅니다.
  const gate = useRef<() => boolean>(() => true);
  const room = useChatRoom({
    roomId,
    source,
    keyboardProbe,
    keyboardHeightStore,
    edges,
    onExit,
    authorizeSend: () => gate.current(),
  });
  const { state, plan, thread, birthYear, preferences, keyboardHeight, dispatch, send } = room;
  // 겹침이 열린 동안 뒤 화면(머리 · 로그 · 독)은 낭독에서 숨습니다. 「…」 메뉴는 독 안의 가벼운 팝업이라 제외합니다.
  const overlayOpen = state.overlay.kind !== "none" && state.overlay.kind !== "more-menu";
  const turn = useChatTurns({
    ledger: turns,
    wallet,
    tier,
    now,
    ...(timers === undefined ? {} : { timers }),
    onTopUp: () => dispatch({ type: "open-overlay", overlay: { kind: "coin-shop", from: "send" } }),
    onOutPanelOpen: () => dispatch({ type: "close-keyboard" }),
    muted: overlayOpen,
  });
  gate.current = turn.authorizeSend;
  const tools = useBubbleTools({ roomId, source, thread, announce });
  const motion = resolveReducedMotion(undefined, useMotion()) ? "reduced" : "standard";

  const exit = () => {
    "background only";
    onExit();
  };
  useScreenBack(exit);

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
    keyboard: state.keyboard,
    slot: state.slot,
    phoneFocus: state.phoneFocus,
    underlay: state.underlay,
    height: keyboardHeight,
    bottomInset: edges.bottom,
  });

  // 내가 보낸 말이 늘 때마다 읽던 자리와 상관없이 끝으로 내립니다(기기 F2).
  const ownMessageCount = thread.messages.filter(
    (message) => message.kind === "text" && message.from === "me",
  ).length;

  return (
    <view className="messenger-chat-screen" data-testid={ids.screen}>
      <view
        className="messenger-chat-body"
        accessibility-elements-hidden={overlayOpen ? true : undefined}
      >
        <view
          className="messenger-chat-main"
          style={keyboardDockBodyStyle(edges, "keyboard")}
          accessibility-elements-hidden={turn.panelOpen ? true : undefined}
        >
          <ChatHeader
            title={thread.counterpart.name}
            subtitle={
              turn.plan.kind === "unlimited" ? undefined : (
                <TurnLine plan={turn.plan} reset={turn.reset} />
              )
            }
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
          <ChatLog
            testId={ids.log}
            followKey={slotHeight}
            jumpKey={ownMessageCount}
            onTap={
              state.slot.kind === "closed" ? undefined : () => dispatch({ type: "close-keyboard" })
            }
          >
            {thread.messages.map((message) => (
              <ChatMessageRow
                key={message.id}
                message={message}
                thread={thread}
                learnerName={learnerName}
                openTools={tools.open}
                motion={motion}
                onToggleTool={tools.toggle}
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
          {state.overlay.kind === "more-menu" ? (
            <MoreMenu
              showIdeas={preferences.replyIdeas}
              onSelect={(action) =>
                dispatch({ type: "open-overlay", overlay: overlayForMore(action) })
              }
              onDismiss={() => dispatch({ type: "close-overlay" })}
            />
          ) : null}
        </view>
        {turn.panelOpen ? (
          <view style={keyboardDockBodyStyle(edges, "keyboard")}>
            <OutOfFreePanel
              total={FREE_TURNS_PER_DAY}
              price={CHAT_COIN_PRICES.message}
              balance={coinBalance}
              reset={turn.reset}
              bottomInset={edges.bottom}
              onKeepChatting={turn.keepChatting}
              onBackToChats={exit}
            />
          </view>
        ) : (
          <ChatRoomDock
            state={state}
            plan={plan}
            thread={thread}
            edges={edges}
            keyboardHeight={keyboardHeight}
            dispatch={dispatch}
            onSend={send}
            sendCost={turn.sendCost}
            birthYear={birthYear}
            aboveComposer={
              turn.plan.kind === "last-free" ? <LastFreeStrip price={turn.plan.price} /> : null
            }
          />
        )}
      </view>
      <ChatRoomOverlays
        state={state}
        dispatch={dispatch}
        thread={thread}
        source={source}
        learnerName={learnerName}
        wallet={wallet}
        coinBalance={coinBalance}
        birthYear={birthYear}
        preferences={preferences}
        onOpenMemories={onOpenMemories}
      />
    </view>
  );
}
