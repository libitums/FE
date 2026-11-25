import type { ReactNode } from "@lynx-js/react";

import { keyboardDockBodyStyle, type KeyboardDockEdges } from "../../lib/keyboard-dock";
import { MessengerKeyboard } from "../messenger/MessengerKeyboard";
import { CHAT_COIN_PRICES } from "./chat-coins";
import type { ChatRoomAction, ChatRoomState } from "./chat-room-state";
import type { SendCost } from "./chat-turns.contract";
import { canSend } from "./chat-rules";
import type { ChatBirthYear, ChatMessage, ChatThread } from "./chat-source.contract";
import { ComposerRow } from "./ComposerRow";
import { mediaAvailabilityOf } from "./chat-media-rules";
import { FeatureRow } from "./FeatureRow";
import { chatKeyboardSlotHeight, chatSlotContent } from "./keyboard-height";
import type { KeyboardPlan } from "./keyboard-plan";
import { KeyboardSlot, PhoneKeyboardSpacer } from "./KeyboardSlot";
import { KeyboardToggleRow } from "./KeyboardToggleRow";
import { ReplyIdeasPanel } from "./ReplyIdeasPanel";
import { BlockedComposer } from "./SafetyParts";
import { useSuggestionEvents } from "./use-suggestion-events";
import type { PhoneKeyboardHeight } from "./use-phone-keyboard-height";

import "./messenger-chat.css";

export type ChatRoomDockProps = {
  readonly state: ChatRoomState;
  readonly plan: KeyboardPlan;
  readonly thread: ChatThread;
  readonly edges: KeyboardDockEdges;
  /** 키보드 자리 높이(바깥 인셋 포함 총높이)와, 입력 칸이 잰 휴대폰 키보드 높이를 받는 곳입니다. */
  readonly keyboard: PhoneKeyboardHeight;
  readonly dispatch: (action: ChatRoomAction) => void;
  /** 입력 칸의 글을 보냅니다. 답장 보기를 누르면 그 글을 줍니다. */
  readonly onSend: (idea?: string) => void;
  /** 보내기 단추 종류(T4면 엽전 보내기)입니다. */
  readonly sendCost: SendCost;
  /** 입력 줄 바로 위 자리입니다(T2 마지막 무료 띠). 없으면 null. */
  readonly aboveComposer: ReactNode | null;
  /** 막힌 줄에서 연 생년 시트가 지금 값을 골라 둔 채 열리게 합니다. */
  readonly birthYear: ChatBirthYear;
  /** 첫 입장 코치마크가 가리키는 부품(2026-11-13) — 바깥 상자 클래스로 고리를 겁니다. */
  readonly guideClass?: string;
  /** 예시 스냅샷 단계(ADR-0146 추가) — 있으면 사진 알약이 「FREE」로 서고, 누르면 결제 확인 대신 이것을 부릅니다. */
  readonly onTakeSample?: () => void;
  /** 예시 음성 단계 — 있으면 음성 알약이 「FREE」로 서고, 누르면 결제 확인 대신 이것을 부릅니다. */
  readonly onTakeVoiceSample?: () => void;
  /** 비회원(ADR-0166) — 보기가 없어도 전구를 켜 두고 누르면 관문(send 권유)으로 갑니다(2026-11-20). */
  readonly guest?: boolean;
};

/** 상대의 마지막 텍스트 글(한국어)입니다. 없으면 null — 보기 판의 인용이 됩니다. */
function lastTheirText(messages: readonly ChatMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.kind === "text" && message.from === "them") return message.text.ko;
  }
  return null;
}

// 기능 줄 · 입력 줄 · 토글 · 키보드 자리 묶음입니다. 위 셋은 셸이 맡긴 좌우 인셋을 지고, 자리는 아래 인셋을 높이에 품습니다.
export function ChatRoomDock({
  state,
  plan,
  thread,
  edges,
  keyboard,
  dispatch,
  onSend,
  sendCost,
  aboveComposer,
  birthYear,
  guideClass = "",
  onTakeSample,
  onTakeVoiceSample,
  guest = false,
}: ChatRoomDockProps): ReactNode {
  const slotHeight = chatKeyboardSlotHeight({
    keyboard: state.keyboard,
    slot: state.slot,
    phoneFocus: state.phoneFocus,
    underlay: state.underlay,
    height: keyboard.height,
    bottomInset: edges.bottom,
  });
  const content = chatSlotContent(state);
  const menuOpen = state.overlay.kind === "more-menu";
  const ideasOpen = state.slot.kind === "ideas";
  const suggestionTapped = useSuggestionEvents(thread, content === "ideas"); // 보임 · 누름 이벤트(ADR-0194)
  // 서버 방의 사진 · 음성 알약 상태(ADR-0146 「앱 연결」) — 대상 메시지 · 답 기다림 · 만드는 중 · 이미 있음.
  const mediaRoom = {
    messages: thread.messages,
    busy: thread.typing || thread.awaitingReply,
    server: thread.server !== null,
  };

  // 입력이 막힌 방은 기능 줄 · 입력 줄 · 토글 · 키보드 자리 대신 상태 줄 하나만 둡니다(ADR-0125).
  if (thread.inputBlock !== null) {
    return (
      <view className="messenger-chat-dock">
        <view className="messenger-chat-dock-body" style={keyboardDockBodyStyle(edges, "keyboard")}>
          <BlockedComposer
            block={thread.inputBlock}
            bottomInset={edges.bottom}
            onChangeBirthYear={() =>
              dispatch({
                type: "open-overlay",
                overlay: {
                  kind: "birth-year",
                  selected: birthYear.kind === "set" ? birthYear.year : null,
                  from: "blocked",
                },
              })
            }
          />
        </view>
      </view>
    );
  }

  // 휴대폰 모드에서 깔아 둔 학습 키보드(밑판)는 보이기만 하고 입력은 받지 않습니다.
  const typeOnLearning = (action: ChatRoomAction) => {
    if (state.keyboard === "learning") dispatch(action);
  };

  return (
    <view className={`messenger-chat-dock${guideClass}`}>
      <view className="messenger-chat-dock-body" style={keyboardDockBodyStyle(edges, "keyboard")}>
        <view className="messenger-chat-features-wrap">
          <FeatureRow
            photoPrice={CHAT_COIN_PRICES.photo}
            voicePrice={CHAT_COIN_PRICES.voice}
            photoAvailability={mediaAvailabilityOf(mediaRoom, "photo")}
            voiceAvailability={mediaAvailabilityOf(mediaRoom, "voice")}
            name={thread.counterpart.name}
            moreState={menuOpen ? "open" : "closed"}
            photoFree={onTakeSample !== undefined}
            onSnapshot={
              onTakeSample ??
              (() =>
                dispatch({ type: "open-overlay", overlay: { kind: "ask-media", media: "photo" } }))
            }
            voiceFree={onTakeVoiceSample !== undefined}
            onSnapVoice={
              onTakeVoiceSample ??
              (() =>
                dispatch({ type: "open-overlay", overlay: { kind: "ask-media", media: "voice" } }))
            }
            onMore={() =>
              menuOpen
                ? dispatch({ type: "close-overlay" })
                : dispatch({ type: "open-overlay", overlay: { kind: "more-menu" } })
            }
          />
        </view>
        {aboveComposer}
        <ComposerRow
          state={state}
          ideasDisabled={!guest && thread.ideas.length === 0}
          sendEnabled={canSend(state.text)}
          sendCost={sendCost}
          onIdeas={() => dispatch({ type: ideasOpen ? "type-myself" : "open-ideas" })}
          onSend={() => onSend()}
          onPhoneInput={(value) => dispatch({ type: "phone-input", value })}
          onPhoneFocus={(focus) => dispatch({ type: "phone-focus", focus })}
          onPhoneKeyboardHeight={keyboard.measure}
          onConfirm={() => onSend()}
          onOpenKeyboard={() => dispatch({ type: "open-keyboard" })}
        />
        {plan.toggle === "shown" && state.slot.kind !== "closed" ? (
          <KeyboardToggleRow
            mode={state.keyboard}
            onSelect={(to) => dispatch({ type: "switch-keyboard", to })}
          />
        ) : null}
      </view>
      <KeyboardSlot height={slotHeight} content={content}>
        {content === "learning-keyboard" ? (
          <MessengerKeyboard
            shifted={state.shifted}
            onPress={(key) => typeOnLearning({ type: "learning-key", key })}
            onBackspace={() => typeOnLearning({ type: "learning-backspace" })}
            onShift={() => typeOnLearning({ type: "learning-shift" })}
            edges={edges}
            height={slotHeight}
          />
        ) : content === "ideas" ? (
          <ReplyIdeasPanel
            quote={lastTheirText(thread.messages)}
            ideas={thread.ideas}
            onSend={(index) => {
              const idea = thread.ideas[index];
              if (idea === undefined) return;
              suggestionTapped(index);
              onSend(idea.ko);
            }}
            onTypeMyself={() => dispatch({ type: "type-myself" })}
            bottomInset={edges.bottom}
            height={slotHeight}
          />
        ) : (
          <PhoneKeyboardSpacer />
        )}
      </KeyboardSlot>
    </view>
  );
}
