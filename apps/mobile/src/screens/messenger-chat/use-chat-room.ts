// 방 UI 상태 + 출처 호출 훅입니다(messenger-chat-ui spec §3.2 · §6.2 · §11). 리듀서에 출처 호출 · 초점 호출 ·
// 정착 타이머 · 접근성 초점 복귀 · 겹침 뒤로가기를 한곳에서 잇습니다. 출처 호출은 이 훅만 합니다.

import { useCallback, useEffect, useReducer, useRef, useState } from "@lynx-js/react";

import type { KeyboardDockEdges } from "../../lib/keyboard-dock";
import { screenHeightFrom } from "../../lib/learning-density";
import { useLayerBack } from "../../lib/use-back-handler";
import {
  blurPhoneInput,
  clearPhoneInput,
  focusPhoneInput,
  requestAccessibilityFocusOn,
  restoreAccessibilityFocus,
} from "./chat-input-focus";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import {
  chatRoomReducer,
  focusOriginOf,
  initialChatRoomState,
  overlayParent,
  type ChatFocusOrigin,
  type ChatOverlay,
  type ChatRoomAction,
  type ChatRoomState,
} from "./chat-room-state";
import { canSend } from "./chat-rules";
import type { ChatSource, ChatThread } from "./chat-source.contract";
import { resolveChatKeyboardHeight } from "./keyboard-height";
import { keyboardPlanFor, type KeyboardPlan } from "./keyboard-plan";
import type { KeyboardHeightStore, KoreanKeyboardProbe } from "./keyboard-ports";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { useChatThread } from "./use-chat-source";

export type UseChatRoomProps = {
  readonly roomId: string;
  readonly source: ChatSource;
  readonly keyboardProbe: KoreanKeyboardProbe;
  readonly keyboardHeightStore: KeyboardHeightStore;
  readonly edges: KeyboardDockEdges;
  readonly onExit: () => void;
};

export type ChatRoomApi = {
  readonly state: ChatRoomState;
  readonly plan: KeyboardPlan;
  readonly thread: ChatThread | null;
  readonly keyboardHeight: number;
  readonly dispatch: (action: ChatRoomAction) => void;
  readonly send: () => void;
};

const originTestId: Readonly<Record<ChatFocusOrigin, string>> = {
  more: ids.more,
  settings: ids.settings,
  "snapshot-pill": ids.snapshot,
  "voice-pill": ids.snapVoice,
  "sidebar-story-point": ids.sidebarStoryPoint,
  "sidebar-delete": ids.sidebarDelete,
  // 젬 화면을 연 것은 사이드바의 「Get gems」 단추입니다(젬 상자 전체가 아니라 접근성 요소인 단추에 id가 있습니다).
  "sidebar-gems": ids.sidebarGetGems,
};

/** 뒤 화면의 accessibility-elements-hidden이 풀린 다음 프레임에 초점을 보냅니다(a11y C1). 한 프레임은 16 ms입니다. */
const NEXT_FRAME_MS = 16;

function screenHeight(): number {
  return screenHeightFrom(typeof SystemInfo === "undefined" ? undefined : SystemInfo);
}

export function useChatRoom({
  roomId,
  source,
  keyboardProbe,
  keyboardHeightStore,
  edges,
  onExit,
}: UseChatRoomProps): ChatRoomApi {
  // 키보드 규칙은 마운트 때 한 번만 읽습니다(앞으로 나올 때 다시 읽기는 2단계).
  const [plan] = useState(() => keyboardPlanFor("chat", keyboardProbe.presence()));
  const [state, rawDispatch] = useReducer(chatRoomReducer, plan, initialChatRoomState);
  // 휴대폰 입력을 비우지 못했을 때 입력 칸을 다시 마운트하기 위한 덧셈입니다(리듀서의 epoch과 더해 key가 됩니다).
  const [remount, setRemount] = useState(0);
  const thread = useChatThread(source, roomId);

  const stateRef = useRef(state);
  stateRef.current = state;
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  // 방이 열리면 안 읽은 수가 0이 됩니다.
  useEffect(() => {
    source.openRoom(roomId);
  }, [source, roomId]);

  // 열려 있던 방이 출처에서 사라지면(다른 곳에서 지움) 한 번만 나갑니다.
  const exited = useRef(false);
  const gone = thread === null;
  useEffect(() => {
    if (!gone || exited.current) return;
    exited.current = true;
    exitRef.current();
  }, [gone]);

  const dispatch = useCallback((action: ChatRoomAction) => {
    const current = stateRef.current;
    const phone = current.keyboard === "phone";
    switch (action.type) {
      case "switch-keyboard":
        if (action.to !== current.keyboard) {
          if (action.to === "phone") focusPhoneInput();
          else blurPhoneInput();
        }
        break;
      case "open-ideas":
      case "open-overlay":
        // 휴대폰 키보드가 보기 패널 · 모달을 덮지 않게 먼저 내립니다.
        if (phone) blurPhoneInput();
        break;
      case "type-myself":
        if (phone) focusPhoneInput();
        break;
      default:
        break;
    }
    rawDispatch(action);
  }, []);

  const send = useCallback(() => {
    const current = stateRef.current;
    if (!canSend(current.text)) return;
    try {
      source.sendText(roomId, current.text);
    } catch {
      // 출처 계약은 던지지 않는 것이지만, 던져도 입력 칸 비우기가 끊기지 않게 합니다(device-findings-1 D5 — 출처 호출 뒤에서
      // 끊겨 보낸 글이 입력 칸에 남았습니다).
    }
    rawDispatch({ type: "sent" });
    if (current.keyboard !== "phone") return;
    // 입력 칸을 비웁니다. 못 비우면 새로 마운트하고 다시 초점을 줍니다.
    clearPhoneInput(() => {
      setRemount((count) => count + 1);
      focusPhoneInput();
    });
  }, [source, roomId]);

  // 학습 키보드를 깔아 둔 채 휴대폰 키보드가 올라오면 자리를 비웁니다 — focus 뒤 정착 시간만큼 기다립니다.
  const settling = state.underlay === "learning" && state.phoneFocus === "focused";
  useEffect(() => {
    if (!settling) return;
    const handle = setTimeout(
      () => rawDispatch({ type: "underlay-settled" }),
      CHAT_PLACEHOLDERS.timing.underlaySettleMs,
    );
    return () => clearTimeout(handle);
  }, [settling]);

  // 겹침이 닫히면(부모로 돌아가면) 접근성 초점을 연 자리로 돌립니다. 다른 겹침으로 바뀌는 것은 닫힘이 아닙니다.
  // 「…」 메뉴가 열리면 첫 항목으로 초점을 보냅니다(a11y M7). 둘 다 다음 프레임에 부릅니다(a11y C1).
  const previousOverlay = useRef<ChatOverlay>(state.overlay);
  useEffect(() => {
    const previous = previousOverlay.current;
    previousOverlay.current = state.overlay;
    if (previous === state.overlay) return;
    let call: (() => void) | null = null;
    if (previous.kind !== "none" && state.overlay.kind === overlayParent(previous).kind) {
      const origin = focusOriginOf(previous);
      if (origin !== null) call = () => restoreAccessibilityFocus(originTestId[origin]);
    } else if (previous.kind === "none" && state.overlay.kind === "more-menu") {
      call = () => requestAccessibilityFocusOn(ids.moreItem("ideas"));
    }
    if (call === null) return;
    const handle = setTimeout(call, NEXT_FRAME_MS);
    return () => clearTimeout(handle);
  }, [state.overlay]);

  // 시스템 뒤로가기는 겹침부터 닫습니다.
  const overlayOpen = state.overlay.kind !== "none";
  useLayerBack(
    overlayOpen
      ? () => {
          "background only";
          rawDispatch({ type: "close-overlay" });
        }
      : null,
  );

  const keyboardHeight = resolveChatKeyboardHeight({
    stored: keyboardHeightStore.read(),
    screenHeight: screenHeight(),
    bottomInset: edges.bottom,
  });

  return {
    state: remount === 0 ? state : { ...state, inputEpoch: state.inputEpoch + remount },
    plan,
    thread,
    keyboardHeight,
    dispatch,
    send,
  };
}
