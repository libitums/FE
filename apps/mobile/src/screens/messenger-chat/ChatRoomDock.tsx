import type { ReactNode } from "@lynx-js/react";

import { keyboardDockBodyStyle, type KeyboardDockEdges } from "../../lib/keyboard-dock";
import { MessengerKeyboard } from "../messenger/MessengerKeyboard";
import { CHAT_COIN_PRICES } from "./chat-coins";
import type { ChatRoomAction, ChatRoomState } from "./chat-room-state";
import type { SendCost } from "./chat-turns.contract";
import { canSend } from "./chat-rules";
import type { ChatBirthYear, ChatMessage, ChatThread } from "./chat-source.contract";
import { ComposerRow } from "./ComposerRow";
import { FeatureRow } from "./FeatureRow";
import { chatKeyboardSlotHeight, chatSlotContent } from "./keyboard-height";
import type { KeyboardPlan } from "./keyboard-plan";
import { KeyboardSlot, PhoneKeyboardSpacer } from "./KeyboardSlot";
import { KeyboardToggleRow } from "./KeyboardToggleRow";
import { ReplyIdeasPanel } from "./ReplyIdeasPanel";
import { BlockedComposer } from "./SafetyParts";

import "./messenger-chat.css";

export type ChatRoomDockProps = {
  readonly state: ChatRoomState;
  readonly plan: KeyboardPlan;
  readonly thread: ChatThread;
  readonly edges: KeyboardDockEdges;
  /** 키보드 자리 높이(바깥 인셋 포함 총높이)입니다. */
  readonly keyboardHeight: number;
  readonly dispatch: (action: ChatRoomAction) => void;
  readonly onSend: () => void;
  /** 보내기 단추 종류(T4면 엽전 보내기)입니다. */
  readonly sendCost: SendCost;
  /** 입력 줄 바로 위 자리입니다(T2 마지막 무료 띠). 없으면 null. */
  readonly aboveComposer: ReactNode | null;
  /** 막힌 줄에서 연 생년 시트가 지금 값을 골라 둔 채 열리게 합니다. */
  readonly birthYear: ChatBirthYear;
  /** 첫 입장 코치마크가 가리키는 부품(2026-11-13) — 바깥 상자 클래스로 고리를 겁니다. */
  readonly guideClass?: string;
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
  keyboardHeight,
  dispatch,
  onSend,
  sendCost,
  aboveComposer,
  birthYear,
  guideClass = "",
}: ChatRoomDockProps): ReactNode {
  const slotHeight = chatKeyboardSlotHeight({
    keyboard: state.keyboard,
    slot: state.slot,
    phoneFocus: state.phoneFocus,
    underlay: state.underlay,
    height: keyboardHeight,
    bottomInset: edges.bottom,
  });
  const content = chatSlotContent(state);
  const menuOpen = state.overlay.kind === "more-menu";
  const ideasOpen = state.slot.kind === "ideas";

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
            moreState={menuOpen ? "open" : "closed"}
            onSnapshot={() =>
              dispatch({ type: "open-overlay", overlay: { kind: "ask-media", media: "photo" } })
            }
            onSnapVoice={() =>
              dispatch({ type: "open-overlay", overlay: { kind: "ask-media", media: "voice" } })
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
          ideasDisabled={thread.ideas.length === 0}
          sendEnabled={canSend(state.text)}
          sendCost={sendCost}
          onIdeas={() => dispatch({ type: ideasOpen ? "type-myself" : "open-ideas" })}
          onSend={onSend}
          onPhoneInput={(value) => dispatch({ type: "phone-input", value })}
          onPhoneFocus={(focus) => dispatch({ type: "phone-focus", focus })}
          onConfirm={onSend}
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
            picked={state.slot.kind === "ideas" ? state.slot.picked : null}
            onPick={(index) => {
              const idea = thread.ideas[index];
              if (idea !== undefined) dispatch({ type: "pick-idea", index, text: idea.ko });
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
