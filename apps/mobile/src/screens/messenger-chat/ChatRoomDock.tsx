import type { ReactNode } from "@lynx-js/react";

import { keyboardDockBodyStyle, type KeyboardDockEdges } from "../../lib/keyboard-dock";
import { MessengerKeyboard } from "../messenger/MessengerKeyboard";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { ChatRoomAction, ChatRoomState } from "./chat-room-state";
import { canSend } from "./chat-rules";
import type { ChatMessage, ChatThread } from "./chat-source.contract";
import { ComposerRow } from "./ComposerRow";
import { FeatureRow } from "./FeatureRow";
import { chatKeyboardSlotHeight, chatSlotContent } from "./keyboard-height";
import type { KeyboardPlan } from "./keyboard-plan";
import { KeyboardSlot, PhoneKeyboardSpacer } from "./KeyboardSlot";
import { KeyboardToggleRow } from "./KeyboardToggleRow";
import type { ChatMoreAction } from "./messenger-chat.contract";
import { MoreMenu } from "./MoreMenu";
import { ReplyIdeasPanel } from "./ReplyIdeasPanel";

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

  const selectMore = (action: ChatMoreAction) => {
    switch (action) {
      case "ideas":
        dispatch({ type: "open-overlay", overlay: { kind: "regen" } });
        return;
      case "fix":
        dispatch({ type: "open-overlay", overlay: { kind: "fix", text: "" } });
        return;
      case "report":
        dispatch({ type: "open-overlay", overlay: { kind: "report", reasons: [] } });
        return;
      default: {
        const unreachable: never = action;
        return unreachable;
      }
    }
  };

  // 휴대폰 모드에서 깔아 둔 학습 키보드(밑판)는 보이기만 하고 입력은 받지 않습니다.
  const typeOnLearning = (action: ChatRoomAction) => {
    if (state.keyboard === "learning") dispatch(action);
  };

  return (
    <view className="messenger-chat-dock">
      <view className="messenger-chat-dock-body" style={keyboardDockBodyStyle(edges, "keyboard")}>
        <view className="messenger-chat-features-wrap">
          <FeatureRow
            photoPrice={CHAT_PLACEHOLDERS.price.photo}
            voicePrice={CHAT_PLACEHOLDERS.price.voice}
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
          {menuOpen ? (
            <MoreMenu onSelect={selectMore} onDismiss={() => dispatch({ type: "close-overlay" })} />
          ) : null}
        </view>
        <ComposerRow
          state={state}
          ideasDisabled={thread.ideas.length === 0}
          sendEnabled={canSend(state.text)}
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
