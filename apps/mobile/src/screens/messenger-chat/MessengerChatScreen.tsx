import { useMemo, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import { ChatRoomHeader } from "./ChatRoomHeader";
import { ChatWordsStrip } from "./ChatWords";
import { useChatWordsStrip, type ChatWordsProps } from "./use-chat-words-strip";
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
import { useAutoIdeas } from "./use-auto-ideas";
import { guideTargetClass, MessengerRoomGuide } from "./MessengerGuide";
import { deviceGuideStore } from "./messenger-guide";
import type { GuestGateProps } from "./messenger-access";
import { useRoomGuide } from "./use-room-guide";
import { useGuestGate } from "./use-guest-gate";
import { ChatHistoryFailed, ChatRecoveryRow } from "./ChatDelivery";
import { useChatFeedback } from "./use-chat-feedback";
import { LastFreeStrip } from "./ChatTurns";
import { MoreMenu, overlayForMore } from "./MoreMenu";
import { OutOfFreePanel } from "./OutOfFreePanel";
import { TRIAL_TOTAL } from "./free-turns";
import { openPhotoAction } from "./chat-room-state";
import { chatKeyboardSlotHeight } from "./keyboard-height";
import {
  messengerChatTestIds as ids,
  type MessengerChatScreenProps,
} from "./messenger-chat.contract";
import { useAnnounceArrivals } from "./use-announce-arrivals";
import { useBubbleTools } from "./use-bubble-tools";
import { useChatRoom } from "./use-chat-room";
import { useChatEntrances } from "./use-chat-entrance";
import { useChatTurns } from "./use-chat-turns";
import { useCoinBalance } from "./use-coin-balance";

import "./messenger-chat.css";

// 자유 대화 방 — 머리 · 로그 · 입력 독(기능 줄 · 입력 줄 · 토글 · 키보드 자리) · 겹침 하나. 상태 · 출처 호출은 useChatRoom, 화면은 조립만.
export function MessengerChatScreen({
  roomId,
  source,
  keyboardProbe,
  keyboardHeightStore,
  edges,
  learnerName,
  wallet,
  trial,
  tier,
  planOffer,
  onExit,
  onOpenMemories,
  onOpenAlbum,
  onOpenMyProfile,
  guideStore = deviceGuideStore,
  onSignInRequired = null,
  chatWords = null,
}: MessengerChatScreenProps & GuestGateProps & ChatWordsProps): ReactNode {
  const copy = useUiCopy().messengerChat;
  const coinBalance = useCoinBalance(wallet);
  // 보내기 관문(턴 · 엽전)은 useChatTurns가 지고 방의 dispatch가 필요해 — 서로를 기다리지 않게 방이 관문을 참조로 부릅니다.
  const gate = useRef<() => boolean>(() => true);
  // 서버 모드는 답을 기다리는 동안 다시 보내지 않습니다 — 서버가 409 turn_in_progress로 거절해 로그 순서가 섞였습니다(리뷰 W3).
  const serverBusy = useRef(false);
  const guest = useGuestGate(onSignInRequired); // 비회원 — 보내기 · 계정 동작은 로그인 권유(ADR-0166)
  const room = useChatRoom({
    roomId,
    source,
    keyboardProbe,
    keyboardHeightStore,
    edges,
    onExit,
    authorizeSend: () => !serverBusy.current && gate.current(),
    guest: guest.active,
  });
  const { state, plan, thread, birthYear, preferences, keyboardHeight, send } = room;
  const dispatch = useMemo(() => guest.guard(room.dispatch), [room.dispatch, guest.active]);
  // 겹침이 열린 동안 뒤 화면(머리 · 로그 · 독)은 낭독에서 숨습니다. 「…」 메뉴는 독 안의 가벼운 팝업이라 제외합니다.
  const overlayOpen =
    guest.open || (state.overlay.kind !== "none" && state.overlay.kind !== "more-menu");
  const turn = useChatTurns({
    trial,
    wallet,
    tier,
    // 서버 방은 서버가 엽전을 냅니다(ADR-0155) — 앱 지갑에서 빼지 않습니다.
    charging: thread !== null && thread.server !== null ? "server" : "local",
    onTopUp: () => dispatch({ type: "open-overlay", overlay: { kind: "coin-shop", from: "send" } }),
    onOutPanelOpen: () => dispatch({ type: "close-keyboard" }),
    muted: overlayOpen,
  });
  gate.current = guest.authorize(turn.authorizeSend, () => dispatch({ type: "close-keyboard" }));
  const server = thread !== null && thread.server !== null;
  // 답 · 첫 인사를 기다리는 중 — 이때 온 말만 「새로 도착」으로 봅니다(방을 열며 읽은 기록은 아님, 리뷰 W2 · W4).
  const busy = thread !== null && (thread.typing || thread.awaitingReply);
  serverBusy.current = server && busy;
  const tools = useBubbleTools({ roomId, source, thread, announce });
  const guide = useRoomGuide(
    roomId,
    thread,
    guideStore,
    state.overlay.kind !== "none",
    source.sampleSnapshot,
  );
  useAutoIdeas({
    ideas: server && thread.settings.autoIdeas ? thread.ideas : null, // 서버 모드 · 방 「보기 자동」(리뷰 W1)
    enabled: preferences.replyIdeas,
    busy,
    text: state.text,
    ideasOpen: state.slot.kind === "ideas",
    dispatch,
  });
  const feedback = useChatFeedback({
    roomId,
    source,
    thread,
    dispatch,
    authorizeSend: gate.current,
  });
  const motion = resolveReducedMotion(undefined, useMotion()) ? "reduced" : "standard";
  const entrances = useChatEntrances(thread?.messages ?? null, motion);

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
    server ? { busy } : null,
  );

  const strip = useChatWordsStrip(chatWords, thread); // 이번 주 채팅 단어(ADR-0170)
  if (thread === null) return <view className="messenger-chat-screen" data-testid={ids.screen} />; // 지운 직후 — onExit이 곧 걷음

  const slotHeight = chatKeyboardSlotHeight({
    keyboard: state.keyboard,
    slot: state.slot,
    phoneFocus: state.phoneFocus,
    underlay: state.underlay,
    height: keyboardHeight,
    bottomInset: edges.bottom,
  });

  // 내가 보낸 말이 늘거나 마지막 글 id가 바뀌면(고친 문장 다시 보내기, ADR-0129) 읽던 자리와 상관없이 끝으로 내립니다(기기 F2).
  const lastOwnId =
    [...thread.messages]
      .reverse()
      .find((message) => message.kind === "text" && message.from === "me")?.id ?? "";

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
          <ChatRoomHeader
            name={thread.counterpart.name}
            plan={guest.active ? null : turn.plan}
            used={turn.panelOpen}
            onBack={exit}
            onMenu={() => dispatch({ type: "open-overlay", overlay: { kind: "sidebar" } })}
          />
          {strip === null || chatWords === null ? null : (
            <ChatWordsStrip words={strip.words} rank={strip.rank} onOpen={chatWords.onOpen} />
          )}
          <ChatLog
            testId={ids.log}
            followKey={slotHeight}
            jumpKey={lastOwnId}
            onTap={
              state.slot.kind === "closed" ? undefined : () => dispatch({ type: "close-keyboard" })
            }
          >
            {thread.server?.history === "failed" ? (
              <ChatHistoryFailed
                empty={thread.messages.length === 0}
                onRetry={() => source.server?.reload(roomId)}
              />
            ) : null}
            {thread.messages.map((message) => (
              <ChatMessageRow
                key={message.id}
                entrance={entrances.get(message.id) ?? null}
                message={message}
                thread={thread}
                learnerName={learnerName}
                openTools={tools.open}
                motion={motion}
                onToggleTool={tools.toggle}
                feedback={feedback}
                onOpenPhoto={(id) => dispatch(openPhotoAction(id))}
              />
            ))}
            {thread.typing ? (
              <ChatTypingRow
                avatar={{ name: thread.counterpart.name, imageUrl: thread.counterpart.avatarUrl }}
                label={copy.room.typing(thread.counterpart.name)}
                testId={ids.typing}
              />
            ) : null}
            <ChatRecoveryRow
              recovery={thread.server?.recovery ?? "none"}
              onRefresh={() => source.server?.reload(roomId)}
            />
          </ChatLog>
          {guide.step === null || thread.server === null ? null : (
            <MessengerRoomGuide
              steps={guide.steps}
              index={guide.index}
              name={thread.counterpart.name}
              avatarUrl={thread.counterpart.avatarUrl}
              onNext={guide.next}
              sampleOnly={guide.sampleOnly}
            />
          )}
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
              total={TRIAL_TOTAL}
              price={CHAT_COIN_PRICES.message}
              balance={coinBalance}
              bottomInset={edges.bottom}
              onKeepChatting={turn.keepChatting}
              onBackToChats={exit}
              offer={planOffer}
            />
          </view>
        ) : (
          <ChatRoomDock
            state={state}
            plan={plan}
            thread={thread}
            edges={edges}
            keyboard={{ height: keyboardHeight, measure: room.measureKeyboard }}
            dispatch={dispatch}
            onSend={send}
            sendCost={turn.sendCost}
            birthYear={birthYear}
            guideClass={guideTargetClass(guide.step)}
            {...(guide.step === "sample" ? { onTakeSample: guide.takeSample } : {})}
            {...(guide.step === "voice" ? { onTakeVoiceSample: guide.takeSample } : {})}
            guest={guest.active}
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
        {...{ onOpenMemories, onOpenAlbum, onOpenMyProfile }}
      />
      {guest.layer}
    </view>
  );
}
