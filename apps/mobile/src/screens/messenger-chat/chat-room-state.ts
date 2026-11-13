// 방 UI 상태 리듀서입니다(messenger-chat-ui spec §5.4). DOM · 네트워크를 만지지 않습니다.

import { composeHangul, shiftedKeys } from "../../lib/hangul-keyboard";
import type { ChatRatingReason } from "./chat-feedback.contract";
import { RATING_NOTE_MAX, toggledReason } from "./chat-feedback-rules";
import { clampText, toggledReportReason } from "./chat-rules";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { keysFromText } from "./composer-keys";
import type { ChatFeedbackMode, ChatMediaKind, ChatReportReasonId } from "./chat-source.contract";
import type { ChatSlot, PhoneFocus } from "./keyboard-height";
import type { ComposerKeyboard, KeyboardPlan } from "./keyboard-plan";

export type ChatOverlay =
  | { readonly kind: "none" }
  | { readonly kind: "more-menu" }
  | {
      readonly kind: "report";
      readonly reasons: readonly ChatReportReasonId[];
      /** 👎 시트에서 왔으면 닫힐 때 초점이 👎로 돌아갑니다(ADR-0129). */
      readonly from?: "rating";
    }
  | {
      readonly kind: "rate-down";
      readonly messageId: string;
      readonly reasons: readonly ChatRatingReason[];
      readonly note: string;
    }
  | { readonly kind: "regen" }
  | { readonly kind: "ask-media"; readonly media: ChatMediaKind }
  | { readonly kind: "sidebar" }
  | { readonly kind: "story-point"; readonly selected: string }
  | { readonly kind: "delete-confirm" }
  | { readonly kind: "unsent"; readonly messageId: string }
  | {
      readonly kind: "coin-shop";
      readonly from: "sidebar" | "ask-photo" | "ask-voice" | "send";
    }
  | { readonly kind: "feedback-mode"; readonly selected: ChatFeedbackMode }
  | {
      readonly kind: "birth-year";
      readonly selected: number | null;
      readonly from: "room" | "sidebar" | "blocked";
    };

export type ChatRoomState = {
  /** 정본입니다. */
  readonly text: string;
  /** keyboard = learning일 때만 유효합니다 — learning으로 들어올 때마다 keysFromText(text). */
  readonly keys: readonly string[];
  readonly shifted: boolean;
  readonly keyboard: ComposerKeyboard;
  /** learning → phone 직후 학습 키보드를 깔아 둔 동안입니다. */
  readonly underlay: "none" | "learning";
  readonly slot: ChatSlot;
  readonly phoneFocus: PhoneFocus;
  /** phone 밖에서 text가 바뀌면 +1 → PhoneInput을 default-value로 다시 마운트합니다. */
  readonly inputEpoch: number;
  readonly overlay: ChatOverlay;
};

export type ChatRoomAction =
  | { readonly type: "learning-key"; readonly key: string }
  | { readonly type: "learning-backspace" }
  | { readonly type: "learning-shift" }
  | { readonly type: "phone-input"; readonly value: string }
  | { readonly type: "phone-focus"; readonly focus: PhoneFocus }
  | { readonly type: "switch-keyboard"; readonly to: ComposerKeyboard }
  | { readonly type: "open-keyboard" }
  | { readonly type: "close-keyboard" }
  | { readonly type: "underlay-settled" }
  | { readonly type: "open-ideas" }
  | { readonly type: "pick-idea"; readonly index: number; readonly text: string }
  | { readonly type: "type-myself" }
  | { readonly type: "sent" }
  | { readonly type: "open-overlay"; readonly overlay: Exclude<ChatOverlay, { kind: "none" }> }
  | { readonly type: "close-overlay" }
  | { readonly type: "toggle-report-reason"; readonly id: ChatReportReasonId }
  | { readonly type: "toggle-rate-reason"; readonly reason: ChatRatingReason }
  | { readonly type: "rate-note"; readonly value: string }
  | { readonly type: "select-story-point"; readonly id: string }
  | { readonly type: "select-birth-year"; readonly year: number }
  | { readonly type: "select-feedback-mode"; readonly mode: ChatFeedbackMode };

const NO_OVERLAY: ChatOverlay = { kind: "none" };
const SIDEBAR: ChatOverlay = { kind: "sidebar" };

export function initialChatRoomState(plan: KeyboardPlan): ChatRoomState {
  return {
    text: "",
    keys: [],
    shifted: false,
    keyboard: plan.initial,
    underlay: "none",
    slot: { kind: "closed" },
    phoneFocus: "blurred",
    inputEpoch: 0,
    overlay: NO_OVERLAY,
  };
}

function withKeys(state: ChatRoomState, keys: readonly string[]): ChatRoomState {
  return {
    ...state,
    keys,
    text: composeHangul(keys),
    shifted: false,
  };
}

function learningKey(state: ChatRoomState, key: string): ChatRoomState {
  const typed = state.shifted ? (shiftedKeys[key] ?? key) : key;
  const keys = [...state.keys, typed];
  if ([...composeHangul(keys)].length > CHAT_PLACEHOLDERS.messageMaxLength) return state;
  return withKeys(state, keys);
}

function switchKeyboard(state: ChatRoomState, to: ComposerKeyboard): ChatRoomState {
  if (state.keyboard === to) return state;
  if (to === "phone") {
    // 학습에서 쓴 글을 휴대폰 입력 칸의 default-value로 넣도록 이때만 입력 칸을 다시 만듭니다(리뷰 #6).
    return {
      ...state,
      keyboard: "phone",
      underlay: "learning",
      slot: { kind: "keyboard" },
      inputEpoch: state.inputEpoch + 1,
    };
  }
  return {
    ...state,
    keyboard: "learning",
    underlay: "none",
    keys: keysFromText(state.text),
    shifted: false,
  };
}

function pickIdea(state: ChatRoomState, index: number, text: string): ChatRoomState {
  const clamped = clampText(text, CHAT_PLACEHOLDERS.messageMaxLength);
  return {
    ...state,
    text: clamped,
    keys: keysFromText(clamped),
    shifted: false,
    slot: { kind: "ideas", picked: index },
    inputEpoch: state.inputEpoch + 1,
  };
}

function sent(state: ChatRoomState): ChatRoomState {
  return {
    ...state,
    text: "",
    keys: [],
    shifted: false,
    // 닫힌 채 보냈으면 닫힌 채로 둡니다(열려 있으면 키보드가 그대로 열려 있습니다).
    slot: state.slot.kind === "closed" ? state.slot : { kind: "keyboard" },
    inputEpoch: state.keyboard === "learning" ? state.inputEpoch + 1 : state.inputEpoch,
  };
}

const toggleReason = (state: ChatRoomState, id: ChatReportReasonId): ChatRoomState =>
  state.overlay.kind === "report"
    ? {
        ...state,
        overlay: { ...state.overlay, reasons: toggledReportReason(state.overlay.reasons, id) },
      }
    : state;

type RateDown = Extract<ChatOverlay, { kind: "rate-down" }>;
const withRateDown = (state: ChatRoomState, change: (sheet: RateDown) => RateDown) =>
  state.overlay.kind === "rate-down" ? { ...state, overlay: change(state.overlay) } : state;

export function chatRoomReducer(state: ChatRoomState, action: ChatRoomAction): ChatRoomState {
  switch (action.type) {
    case "learning-key":
      return learningKey(state, action.key);
    case "learning-backspace":
      return withKeys(state, state.keys.slice(0, -1));
    case "learning-shift":
      return { ...state, shifted: !state.shifted };
    case "phone-input":
      return { ...state, text: clampText(action.value, CHAT_PLACEHOLDERS.messageMaxLength) };
    case "phone-focus":
      return { ...state, phoneFocus: action.focus };
    case "switch-keyboard":
      return switchKeyboard(state, action.to);
    case "open-keyboard":
      return state.slot.kind === "closed" ? { ...state, slot: { kind: "keyboard" } } : state;
    case "close-keyboard":
      return state.slot.kind === "closed"
        ? state
        : { ...state, slot: { kind: "closed" }, underlay: "none", phoneFocus: "blurred" };
    case "underlay-settled":
      return { ...state, underlay: "none" };
    case "open-ideas":
      return { ...state, slot: { kind: "ideas", picked: null } };
    case "pick-idea":
      return pickIdea(state, action.index, action.text);
    case "type-myself":
      return { ...state, slot: { kind: "keyboard" } };
    case "sent":
      return sent(state);
    case "open-overlay":
      return { ...state, overlay: action.overlay };
    case "close-overlay":
      return { ...state, overlay: overlayParent(state.overlay) };
    case "toggle-report-reason":
      return toggleReason(state, action.id);
    case "toggle-rate-reason":
      return withRateDown(state, (sheet) => ({
        ...sheet,
        reasons: toggledReason(sheet.reasons, action.reason),
      }));
    case "rate-note":
      return withRateDown(state, (sheet) => ({
        ...sheet,
        note: clampText(action.value, RATING_NOTE_MAX),
      }));
    case "select-story-point":
      return state.overlay.kind === "story-point"
        ? { ...state, overlay: { kind: "story-point", selected: action.id } }
        : state;
    case "select-feedback-mode":
      return state.overlay.kind === "feedback-mode"
        ? { ...state, overlay: { kind: "feedback-mode", selected: action.mode } }
        : state;
    case "select-birth-year":
      return state.overlay.kind === "birth-year"
        ? { ...state, overlay: { ...state.overlay, selected: action.year } }
        : state;
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

/** 겹침을 닫으면 돌아갈 겹침입니다 — 사이드바에서 연 둘은 사이드바로, 그 밖은 없음. */
export function overlayParent(overlay: ChatOverlay): ChatOverlay {
  switch (overlay.kind) {
    case "story-point":
    case "delete-confirm":
      return SIDEBAR;
    case "coin-shop":
      return overlay.from === "sidebar" ? SIDEBAR : NO_OVERLAY;
    case "birth-year":
      return overlay.from === "sidebar" ? SIDEBAR : NO_OVERLAY;
    case "feedback-mode":
      return SIDEBAR;
    default:
      return NO_OVERLAY;
  }
}
