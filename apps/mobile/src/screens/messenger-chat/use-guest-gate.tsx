// 비회원 「로그인 필요」 권유(ADR-0166) — 목록 · 방이 함께 씁니다. 판정은 `guest-gate`, 여기서는 대화상자 상태 · 뒤로가기 · 이벤트만.

import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { emitCompanionEvent } from "../../lib/companion-events";
import type { CompanionEventInput } from "../../lib/companion-event.contract";
import { useLayerBack } from "../../lib/use-back-handler";
import type { EpisodeIntroEventSink } from "../episode-intro/episode-intro.contract";
import { useChatEvents } from "./chat-events";
import type { ChatRoomAction } from "./chat-room-state";
import { guestGateOf, type GuestGateTrigger } from "./guest-gate";
import { SignInPromptDialog } from "./SignInPromptDialog";

export type GuestGate = {
  /** 비회원인가(권유 길이 있음). 아니면 아래 함수는 모두 그대로 통과합니다. */
  readonly active: boolean;
  /** 대화상자가 떠 있는가 — 뒤 화면을 낭독에서 숨깁니다. */
  readonly open: boolean;
  /** 비회원이면 대화상자를 띄우고 true(호출한 동작을 멈춤), 회원이면 false. */
  readonly prompt: (trigger: GuestGateTrigger) => boolean;
  /** 방의 dispatch를 감쌉니다 — 계정 동작(`guestGateOf`)이면 키보드를 내리고 대화상자로 바꿉니다. */
  readonly guard: (dispatch: (action: ChatRoomAction) => void) => (action: ChatRoomAction) => void;
  /** 보내기 관문을 감쌉니다 — 비회원이면 `onBlocked`(키보드 내리기) 뒤 대화상자(send)를 띄우고 거절합니다. */
  readonly authorize: (
    inner: (fromSuggestion?: boolean) => boolean,
    onBlocked: () => void,
  ) => (fromSuggestion?: boolean) => boolean;
  readonly layer: ReactNode;
};

/**
 * `sink`를 주면 이벤트를 메신저 맥락(`ChatEventsContext`) 대신 그 sink로 보냅니다 — 메신저 밖(머리 티켓 모달, 2026-11-20)에서 씁니다.
 */
export function useGuestGate(
  onSignIn: (() => void) | null | undefined,
  sink?: EpisodeIntroEventSink,
): GuestGate {
  const [trigger, setTrigger] = useState<GuestGateTrigger | null>(null);
  const chat = useChatEvents();
  const emit =
    sink === undefined
      ? chat.emit
      : (event: CompanionEventInput) => emitCompanionEvent(sink, event);
  const active = onSignIn !== null && onSignIn !== undefined;

  const prompt = (next: GuestGateTrigger): boolean => {
    if (!active) return false;
    setTrigger(next);
    return true;
  };
  const close = (choice: "sign_in" | "later") => {
    "background only";
    if (trigger === null) return;
    emit({ name: "chat_sign_in_prompt_closed", surface: "chat", trigger, choice });
    setTrigger(null);
    if (choice === "sign_in") onSignIn?.();
  };
  useLayerBack(trigger === null ? null : () => close("later"));

  return {
    active,
    open: trigger !== null,
    prompt,
    guard: (dispatch) => (action) => {
      const gated = active ? guestGateOf(action) : null;
      if (gated === null) return dispatch(action);
      dispatch({ type: "close-keyboard" });
      prompt(gated);
    },
    authorize: (inner, onBlocked) => (fromSuggestion) => {
      if (!active) return inner(fromSuggestion);
      onBlocked();
      return !prompt("send");
    },
    layer:
      trigger === null ? null : (
        <SignInPromptDialog
          trigger={trigger}
          onSignIn={() => close("sign_in")}
          onLater={() => close("later")}
        />
      ),
  };
}
