// 답장 도착 토스트의 순수 판정입니다(ADR-0200) — 무엇이 도착인가 · 지금 화면에서 띄우나 · 카드를 어떻게 바꿔 끼우나.

import type { ChatMessage, ChatRoomSummary } from "../screens/messenger-chat/chat-source.contract";
import type { Screen } from "./nav-state";
import {
  REPLY_TOAST_LIMIT,
  REPLY_TOAST_STACK,
  REPLY_TOAST_WINDOW_MS,
  type ReplyArrival,
  type ReplyToastAction,
  type ReplyToastCard,
  type ReplyToastPlace,
  type ReplyToastState,
} from "./reply-toast.contract";

export const initialReplyToastState: ReplyToastState = {
  cards: [],
  more: 0,
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

type Stack = Pick<ReplyToastState, "cards" | "more" | "shownAt" | "nextKey">;

/**
 * 도착 하나를 쌓습니다 — 같은 인물이면 그 카드만 갈아 끼워 맨 위로(새 key, 상한을 세지 않음), 새 인물이면 맨 위에 새 카드(상한을 셈)를 두고
 * 장 수를 넘으면 맨 아래가 빠져 「+N」에 합칩니다. 1분 상한에 걸린 새 인물은 카드 대신 「+N」(떠 있는 카드가 없으면 버림).
 */
function stackOne(stack: Stack, each: ReplyArrival, now: number, deferred: boolean): Stack {
  const recent = stack.shownAt.filter((at) => now - at < REPLY_TOAST_WINDOW_MS);
  const same = stack.cards.find((card) => card.characterId === each.characterId);
  const rest = stack.cards.filter((card) => card !== same);
  if (same === undefined && recent.length >= REPLY_TOAST_LIMIT)
    return stack.cards.length === 0 ? stack : { ...stack, more: stack.more + 1 };
  const card: ReplyToastCard = {
    key: stack.nextKey,
    roomId: each.roomId,
    characterId: each.characterId,
    kind: each.kind,
    deferred,
  };
  const cards = [card, ...rest];
  const kept = cards.slice(0, REPLY_TOAST_STACK);
  return {
    cards: kept,
    more: stack.more + (cards.length - kept.length),
    shownAt: same === undefined ? [...recent, now] : recent,
    nextKey: stack.nextKey + 1,
  };
}

function present(state: ReplyToastState, arrivals: readonly ReplyArrival[], now: number) {
  if (arrivals.length === 0) return state;
  let stack: Stack = state;
  for (const each of arrivals) stack = stackOne(stack, each, now, false);
  return { ...state, ...stack };
}

/** 레슨 밖으로 나올 때 — 미룬 것을 인물별로 접어 최신 인물부터 남은 자리(장 수 · 1분 상한)만큼 카드로, 나머지는 「+N」. */
function flush(state: ReplyToastState, deferred: readonly ReplyArrival[], now: number) {
  const latest: ReplyArrival[] = [];
  for (let i = deferred.length - 1; i >= 0; i -= 1) {
    const each = deferred[i];
    if (each !== undefined && !latest.some((seen) => seen.characterId === each.characterId))
      latest.push(each);
  }
  const recent = state.shownAt.filter((at) => now - at < REPLY_TOAST_WINDOW_MS).length;
  const fresh = latest.filter(
    (each) => !state.cards.some((c) => c.characterId === each.characterId),
  );
  const room = Math.max(0, Math.min(REPLY_TOAST_STACK, REPLY_TOAST_LIMIT - recent));
  const overflow = new Set(fresh.slice(room));
  let stack: Stack = state;
  for (const each of latest.filter((one) => !overflow.has(one)).reverse())
    stack = stackOne(stack, each, now, true);
  const extra = stack.cards.length === 0 ? 0 : overflow.size;
  return { ...state, ...stack, more: stack.more + extra, deferred: [] };
}

/** 그 자리에서 버릴 것 — 목록이면 전부, 방이면 그 방 것. */
function dropFor(place: ReplyToastPlace, arrivals: readonly ReplyArrival[]) {
  if (place.kind === "list" || place.kind === "off") return [];
  if (place.kind === "room") return arrivals.filter((each) => each.roomId !== place.roomId);
  return arrivals;
}

/** 카드를 걷어 냄 — 맨 아래 카드가 빠지면 「+N」도 함께 사라집니다. */
function without(state: ReplyToastState, keep: (card: ReplyToastCard) => boolean) {
  const cards = state.cards.filter(keep);
  if (cards.length === state.cards.length) return state;
  const bottom = state.cards[state.cards.length - 1];
  const more = cards.length === 0 || (bottom !== undefined && !keep(bottom)) ? 0 : state.more;
  return { ...state, cards, more };
}

export function replyToastReducer(
  state: ReplyToastState,
  action: ReplyToastAction,
): ReplyToastState {
  "background only"; // 보냄(배경 스레드)에서만 불립니다 — 메인 스레드 번들에서 뺍니다.
  switch (action.type) {
    case "dismiss":
      return without(state, (card) => card.key !== action.key);
    case "clear":
      return without(state, () => false);
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
      // 목록 · 레슨 · 앱 구간 밖이면 모두, 방이면 그 인물 카드만 걷습니다.
      const after =
        place.kind === "show"
          ? state
          : place.kind === "room"
            ? without(state, (card) => card.roomId !== place.roomId)
            : without(state, () => false);
      if (place.kind === "defer")
        return deferred === state.deferred && after === state ? state : { ...after, deferred };
      if (deferred.length > 0) return flush(after, deferred, action.now);
      return deferred.length === state.deferred.length ? after : { ...after, deferred };
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
