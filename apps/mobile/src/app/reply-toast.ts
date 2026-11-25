// 답장 도착 토스트의 순수 판정입니다(ADR-0200) — 무엇이 도착인가 · 지금 화면에서 띄우나 · 카드를 어떻게 바꿔 끼우나.

import type { ChatMessage, ChatRoomSummary } from "../screens/messenger-chat/chat-source.contract";
import type { Screen } from "./nav-state";
import {
  REPLY_TOAST_LIMIT,
  REPLY_TOAST_WINDOW_MS,
  type ReplyArrival,
  type ReplyToastAction,
  type ReplyToastCard,
  type ReplyToastPlace,
  type ReplyToastState,
} from "./reply-toast.contract";

export const initialReplyToastState: ReplyToastState = {
  card: null,
  deferred: [],
  shownAt: [],
  nextKey: 1,
};

/**
 * 출처 스냅숏 둘 사이의 도착 — 열린 방의 안 읽음이 오른 것만. 출처는 닫힌 방에 답(한 턴) · 채운 답 · 첫 인사가 설 때 하나씩 올리고
 * (내 글 · 안내 줄 · 기록 미리 읽기는 올리지 않음), 열린 방은 올리지 않습니다. 앞 스냅숏에 없던 방은 처음 본 것이라 셈하지 않습니다.
 */
export function replyArrivals(
  prev: readonly ChatRoomSummary[],
  next: readonly ChatRoomSummary[],
): readonly ReplyArrival[] {
  const before = new Map(prev.map((room) => [room.roomId, room]));
  const out: ReplyArrival[] = [];
  for (const room of next) {
    const old = before.get(room.roomId);
    if (old === undefined || room.access.kind !== "open" || !(room.unread > old.unread)) continue;
    const mine = old.lastMessage?.kind === "text" && old.lastMessage.from === "me";
    out.push({
      roomId: room.roomId,
      characterId: room.counterpart.id,
      kind: mine ? "reply" : "proactive",
    });
  }
  return out;
}

export type ReplyToastPlaceInput = {
  /** 진입 흐름(스플래시 ~ 여정 입장)이 끝난 앱 구간인가. */
  readonly inApp: boolean;
  readonly canOpenChats: boolean;
  readonly screen: Screen;
  /** 채팅 목록 위에 친구 스토리 보기가 떠 있는가 — 그때는 목록이 아니라 보기 위입니다. */
  readonly storyViewerOpen: boolean;
};

/** 문제 풀이 ~ 레슨 끝 화면 전 — 이 동안 온 답은 모아 두었다가 레슨 밖에서 띄웁니다(사용자 결정 2026-11-25). */
const DEFERRING: ReadonlySet<Screen["name"]> = new Set<Screen["name"]>([
  "catalog-cover",
  "catalog-lesson",
  "catalog-story",
  "catalog-final",
  "catalog-epilogue",
  "roleplay-story",
]);

export function replyToastPlaceOf(input: ReplyToastPlaceInput): ReplyToastPlace {
  if (!input.inApp || !input.canOpenChats) return { kind: "off" };
  const { screen } = input;
  if (screen.name === "messenger-list")
    return input.storyViewerOpen ? { kind: "show" } : { kind: "list" };
  if (screen.name === "messenger-chat") return { kind: "room", roomId: screen.roomId };
  return DEFERRING.has(screen.name) ? { kind: "defer" } : { kind: "show" };
}

/** 도착 여럿을 카드 하나로 접습니다 — 같은 인물이면 내용만, 다른 인물이면 최신으로 바꾸고 +1. */
function fold(
  card: ReplyToastCard | null,
  arrivals: readonly ReplyArrival[],
  key: number,
  deferred: boolean,
) {
  let next = card;
  for (const each of arrivals) {
    const more =
      next === null ? 0 : next.characterId === each.characterId ? next.more : next.more + 1;
    next = {
      key,
      roomId: each.roomId,
      characterId: each.characterId,
      kind: each.kind,
      more,
      deferred,
    };
  }
  return next;
}

function present(
  state: ReplyToastState,
  arrivals: readonly ReplyArrival[],
  now: number,
  deferred = false,
) {
  if (arrivals.length === 0) return state;
  const recent = state.shownAt.filter((at) => now - at < REPLY_TOAST_WINDOW_MS);
  const card = fold(state.card, arrivals, state.nextKey, deferred);
  // 떠 있는 카드에 같은 인물만 이어 오면 새 카드가 아닙니다 — 상한을 세지 않습니다.
  const fresh = state.card === null || card?.characterId !== state.card.characterId;
  if (fresh && recent.length >= REPLY_TOAST_LIMIT) return { ...state, deferred: [] };
  return {
    card,
    deferred: [],
    shownAt: fresh ? [...recent, now] : recent,
    nextKey: state.nextKey + 1,
  };
}

/** 그 자리에서 버릴 것 — 목록이면 전부, 방이면 그 방 것. */
function dropFor(place: ReplyToastPlace, arrivals: readonly ReplyArrival[]) {
  if (place.kind === "list" || place.kind === "off") return [];
  if (place.kind === "room") return arrivals.filter((each) => each.roomId !== place.roomId);
  return arrivals;
}

export function replyToastReducer(
  state: ReplyToastState,
  action: ReplyToastAction,
): ReplyToastState {
  "background only"; // 보냄(배경 스레드)에서만 불립니다 — 메인 스레드 번들에서 뺍니다.
  switch (action.type) {
    case "dismiss":
      return state.card === null ? state : { ...state, card: null };
    case "arrive": {
      const { place } = action;
      const kept = dropFor(place, action.arrivals);
      if (place.kind === "defer") return { ...state, deferred: [...state.deferred, ...kept] };
      if (place.kind === "list" || place.kind === "off") return state;
      return present(state, kept, action.now);
    }
    case "place": {
      const { place } = action;
      const deferred = dropFor(place, state.deferred);
      const cardGone =
        state.card !== null &&
        place.kind !== "show" &&
        !(place.kind === "room" && place.roomId !== state.card.roomId);
      const card = cardGone ? null : state.card;
      if (place.kind === "defer") {
        return cardGone || deferred !== state.deferred ? { ...state, card, deferred } : state;
      }
      if (deferred.length > 0) return present({ ...state, card }, deferred, action.now, true);
      if (!cardGone && deferred.length === state.deferred.length) return state;
      return { ...state, card, deferred };
    }
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

export type ReplyToastPreview =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "photo" }
  | { readonly kind: "voice" };

/** 카드 둘째 줄 — 인물의 말 · 지문은 한국어 본문(목록 미리보기와 같음), 사진 · 음성은 종류. 그 밖의 줄은 그리지 않습니다. */
export function replyToastPreviewOf(line: ChatMessage | null): ReplyToastPreview | null {
  if (line === null) return null;
  switch (line.kind) {
    case "text":
      return line.from === "them" ? { kind: "text", text: line.text.ko } : null;
    case "action":
      return { kind: "text", text: line.text.ko };
    case "photo":
      return { kind: "photo" };
    case "voice":
      return { kind: "voice" };
    default:
      return null;
  }
}
