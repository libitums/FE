// 답장 도착 토스트의 결선입니다(ADR-0200). 원천은 대화 출처의 스냅숏 — 닫힌 방에 답(한 턴) · 채운 답 · 첫 인사가 서면 안 읽음이
// 하나 오릅니다(서버 턴 SSE · 끊긴 답 채우기 · 해금 인사). 그 오름을 지금 화면에 맞춰 띄우거나 · 미루거나 · 버립니다.
// 앱이 앞으로 막 돌아온 3초 안의 도착은 뒤에 있는 동안 온 것으로 보고 띄우지 않습니다(시스템 푸시가 이미 알림).

import {
  useEffect,
  useLynxGlobalEventListener,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "@lynx-js/react";
import { useMotion } from "@libitums/ui-lynx/motion";

import { emitCompanionEvent } from "../lib/companion-events";
import { createKeyHaptic } from "../lib/sound-effects";
import { useUiCopy } from "../lib/ui-copy";
import type { ChatRoomSummary, ChatSource } from "../screens/messenger-chat/chat-source.contract";
import { messengerAccessOf } from "../screens/messenger-chat/messenger-access";
import { ReplyToast, type ReplyToastView } from "../screens/messenger-chat/ReplyToast";
import {
  setReplyToastShown,
  storyViewerOpen,
  subscribeReplyToastPresence,
} from "../screens/messenger-chat/reply-toast-presence";
import { companionPushActions } from "./companion-push";
import { currentScreen } from "./nav-reducer";
import type { Nav, NavAction } from "./nav-state";
import {
  initialReplyToastState,
  replyArrivals,
  replyToastPlaceOf,
  replyToastPreviewOf,
  replyToastReducer,
} from "./reply-toast";
import {
  REPLY_TOAST_RESUME_QUIET_MS,
  type ReplyToastCard,
  type ReplyToastPlace,
} from "./reply-toast.contract";
import type { ScreenWiring } from "./screen-wiring";
import { contentSyncEventName } from "./use-episode-content-refresh";

/** `top` 화면 위 안전 영역(pt) · `closeSheets` 카드를 눌러 방으로 갈 때 닫을 앱 전역 시트(상점). */
export function useReplyToast(
  nav: Nav,
  dispatch: Dispatch<NavAction>,
  wiring: ScreenWiring,
  top: number,
  closeSheets: () => void,
): ReactNode {
  const { source, eventSink, now } = wiring.messengerChat;
  const canOpenChats = messengerAccessOf(wiring.accountState) === "open";
  const [viewerOpen, setViewerOpen] = useState(storyViewerOpen);
  useEffect(() => subscribeReplyToastPresence(() => setViewerOpen(storyViewerOpen())), []);
  const [state, send] = useReducer(replyToastReducer, initialReplyToastState);
  // 자리 판정은 효과(배경 스레드)에서만 — 첫 화면을 그리는 메인 스레드에 판정 코드를 싣지 않습니다(번들 천장 ADR-0149).
  const placeRef = useRef<ReplyToastPlace>({ kind: "off" });
  const screenRef = useRef<string>("");
  useEffect(() => {
    const screen = currentScreen(nav);
    const place = replyToastPlaceOf({
      inApp: nav.entry.length === 0,
      canOpenChats,
      screen,
      storyViewerOpen: viewerOpen,
    });
    const before = placeRef.current;
    placeRef.current = place;
    screenRef.current = screen.name;
    if (
      place.kind === before.kind &&
      (place.kind !== "room" || before.kind !== "room" || place.roomId === before.roomId)
    )
      return;
    send({ type: "place", place, now: now() });
  }, [nav, viewerOpen, canOpenChats, now]);
  const resumedAt = useRef<number | null>(null);
  useLynxGlobalEventListener(contentSyncEventName, () => {
    "background only";
    resumedAt.current = now();
  });

  // 스냅숏 사이의 오름만 셉니다 — 처음 읽은 스냅숏(앱 시작 · 로그인 직후 기록)은 기준일 뿐입니다. 세션 루트는 도착 · 화면 바뀜에만
  // 다시 그려지고, 떠 있는 카드의 미리보기(조각마다 자람)는 아래 층이 혼자 다시 읽습니다.
  useEffect(() => {
    let prev: readonly ChatRoomSummary[] = source.snapshot().rooms;
    return source.subscribe(() => {
      const next = source.snapshot().rooms;
      const arrivals = replyArrivals(prev, next);
      prev = next;
      if (arrivals.length === 0) return;
      const at = now();
      if (resumedAt.current !== null && at - resumedAt.current < REPLY_TOAST_RESUME_QUIET_MS)
        return;
      send({ type: "arrive", arrivals, place: placeRef.current, now: at });
    });
  }, [source, now]);

  // 새 카드(빈 자리 · 다른 인물)가 설 때만 — 같은 인물의 내용 바꿔 끼움은 세지 않습니다.
  const shownRef = useRef<ReplyToastCard | null>(null);
  useEffect(() => {
    const before = shownRef.current;
    const card = state.card;
    shownRef.current = card;
    setReplyToastShown(card !== null);
    if (card === null || (before !== null && before.characterId === card.characterId)) return;
    createKeyHaptic()();
    emitCompanionEvent(eventSink, {
      name: "chat_reply_toast_shown",
      surface: "chat",
      characterId: card.characterId,
      kind: card.kind,
      more: String(card.more),
      deferred: card.deferred ? "true" : "false",
      screen: screenRef.current,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.card?.key]);
  useEffect(() => () => setReplyToastShown(false), []);

  const card = state.card;
  return (
    <ReplyToastLayer
      card={card}
      source={source}
      top={top}
      onOpen={() => {
        if (card === null) return;
        emitCompanionEvent(eventSink, {
          name: "chat_reply_toast_opened",
          surface: "chat",
          characterId: card.characterId,
          kind: card.kind,
        });
        send({ type: "dismiss" });
        closeSheets();
        for (const action of companionPushActions(source, card.characterId, canOpenChats))
          dispatch(action);
      }}
      onDismiss={() => send({ type: "dismiss" })}
    />
  );
}

/** 떠 있는 카드를 그리는 층 — 그 방의 마지막 미리보기 줄을 출처가 바뀔 때마다 다시 읽습니다(카드가 떠 있는 동안만 구독). */
function ReplyToastLayer({
  card,
  source,
  top,
  onOpen,
  onDismiss,
}: {
  readonly card: ReplyToastCard | null;
  readonly source: ChatSource;
  readonly top: number;
  readonly onOpen: () => void;
  readonly onDismiss: () => void;
}): ReactNode {
  const [, setVersion] = useState(0);
  const shown = card !== null;
  useEffect(() => {
    if (!shown) return undefined;
    return source.subscribe(() => setVersion((value) => value + 1));
  }, [source, shown]);
  const copy = useUiCopy().messengerChat;
  const reducedMotion = useMotion() === "reduced";
  const room =
    card === null ? undefined : source.snapshot().rooms.find((each) => each.roomId === card.roomId);
  let view: ReplyToastView | null = null;
  if (card !== null && room !== undefined) {
    const preview = replyToastPreviewOf(room.lastMessage);
    view = {
      key: card.key,
      name: room.counterpart.name,
      avatarUrl: room.counterpart.avatarUrl,
      more: card.more,
      preview:
        preview?.kind === "text"
          ? preview.text
          : copy.newMessages.label({ count: 1, latest: preview?.kind ?? "message" }),
    };
  }
  return (
    <ReplyToast
      view={view}
      top={top}
      reducedMotion={reducedMotion}
      onOpen={onOpen}
      onDismiss={onDismiss}
    />
  );
}
