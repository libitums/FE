// 추천 친구의 파생 이벤트입니다(ADR-0029 「D3 목적 구분」) — 첫 글(`friend_first_message`)은 메신저 sink를 감싸 `chat_message_sent`에서
// 이끌어 내고, 다시 찾음(`friend_return`)은 방을 열 때 판정합니다. 인물 id만 싣습니다. 판정은 순수, 기록은 친구 기록 저장.

import { emitCompanionEvent } from "../../lib/companion-events";
import { daysSinceFirstOpen } from "../../lib/first-open";
import type { EpisodeIntroEventSink } from "../episode-intro/episode-intro.contract";
import type { FriendRecord, FriendStore } from "./chat-friends.contract";
import { isFriendCharacter } from "./companion-roster";

const DAY_MS = 86_400_000;
/** 추가한 뒤 이 기간 안의 다른 날 방을 열면 다시 찾은 것으로 셉니다. */
export const FRIEND_RETURN_WINDOW_MS = 7 * DAY_MS;

/** 기기 지역 날짜의 일련번호(목록 시각 표기 `chat-list`와 같은 셈). */
export const localDayOf = (at: number): number => {
  const date = new Date(at);
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
};

/** 추가한 날 뒤의 다른 날이고 추가한 지 7일 안이면 true. 같은 날 · 7일 뒤 · 기록 없음은 false. 순수. */
export function friendReturnDue(record: FriendRecord | undefined, now: number): boolean {
  if (record === undefined) return false;
  return (
    localDayOf(now) > localDayOf(record.addedAt) && now - record.addedAt <= FRIEND_RETURN_WINDOW_MS
  );
}

/**
 * 메신저 sink를 감싸, 추가한 친구에게 보낸 첫 글이면 `friend_first_message`를 한 번 더 냅니다(기록에 적어 계정 · 기기당 한 번).
 * 없는 sink · 저장은 그대로입니다. 시험 계정 거름(ADR-0085)은 바깥 sink가 집니다.
 */
export function withFriendEvents(
  sink: EpisodeIntroEventSink,
  store: FriendStore | null,
  days: () => string = daysSinceFirstOpen,
): EpisodeIntroEventSink {
  if (sink === null || store === null) return sink;
  return (event) => {
    sink(event);
    if (event.name !== "chat_message_sent" || !isFriendCharacter(event.characterId)) return;
    const record = store.read().get(event.characterId);
    if (record === undefined || record.messaged) return;
    store.markMessaged(event.characterId);
    const characterId = event.characterId;
    emitCompanionEvent(sink, { name: "friend_first_message", surface: "chat", characterId }, days);
  };
}

/**
 * 방을 열 때 부르는 다시 찾음 판정기 — 추가한 친구의 방을 추가한 날 뒤 7일 안의 다른 날 열면 `friend_return`(하루 한 번, 이번 실행
 * 메모리로 지킵니다).
 */
export function friendReturnTracker(days: () => string = daysSinceFirstOpen) {
  const sent = new Set<string>();
  return (input: {
    readonly roomId: string;
    readonly store: FriendStore | null;
    readonly sink: EpisodeIntroEventSink;
    readonly now: number;
  }): void => {
    const { roomId, store, sink, now } = input;
    if (store === null || sink === null || !isFriendCharacter(roomId)) return;
    const key = `${roomId}:${localDayOf(now)}`;
    if (sent.has(key) || !friendReturnDue(store.read().get(roomId), now)) return;
    sent.add(key);
    emitCompanionEvent(sink, { name: "friend_return", surface: "chat", characterId: roomId }, days);
  };
}
