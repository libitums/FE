// 앱이 앞에 있을 때 온 인물의 채팅 메시지 푸시(선톡 · 스토리 반응)로 그 방 기록을 다시 읽습니다(ADR-0200 개정).
// 닫힌 방에 새 인물 말이 서면 안 읽음을 하나 올립니다 — 답 한 턴 · 끊긴 답 채우기와 같은 규칙이라 답장 토스트가 같은 길로 섭니다.
// 같은 메시지가 SSE로 먼저 왔으면 기록 합치기(`mergeLog`, 메시지 id)가 한 줄로 두어 안 읽음이 오르지 않습니다 — 중복 제거는 id 기준입니다.

import type { RoomState } from "./chat-fixture-room";
import { mergeLog } from "./chat-log-merge";
import type { ChatRemote, RemoteHistory } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";

/** 못 읽으면 이만큼 뒤 한 번 더(ms). 그 뒤에도 못 읽으면 다음 앞으로 옴 · 방 열기가 채웁니다. */
const PULL_RETRY_MS = 2_000;

export type RemotePullDeps = {
  readonly remote: ChatRemote;
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  readonly isOpen: (roomId: string) => boolean;
  readonly schedule: (room: RoomState, ms: number, fn: () => void) => void;
  /** 답을 기다리는 중 · 채우는 중 · 기록을 읽는 중. */
  readonly busy: (room: RoomState) => boolean;
  /** 열린 방의 조용한 다시 읽기. */
  readonly refresh: (room: RoomState) => void;
  /** 읽은 방(`loaded`)의 기록 합치기 — Not sent 확인 · 생각 칩까지. */
  readonly applyHistory: (room: RoomState, history: RemoteHistory) => unknown;
};

/** 인물의 말 · 지문 줄 수 — 새로 선 인물 말이 있는지 셉니다. */
export const theirLines = (messages: readonly ChatMessage[]) =>
  messages.filter((m) => (m.kind === "text" && m.from === "them") || m.kind === "action").length;

/** 방 하나를 다시 읽습니다 — 합쳤으면 true(목록 맞추기가 그 값을 맞춘 것으로 둡니다), 읽지 않았거나 못 읽었으면 false. */
export type RemoteRoomPull = (roomId: string) => Promise<boolean>;

export function remotePull(deps: RemotePullDeps): RemoteRoomPull {
  const { remote, live, changed, isOpen, busy } = deps;
  const attempt = async (roomId: string, room: RoomState, retry: boolean): Promise<boolean> => {
    // 포트가 던져도(네트워크 오류) 못 읽은 것과 같이 다룹니다 — 다시 시도로 가고, 던짐이 밖으로 새지 않게.
    const history = await remote.loadHistory(room.seed.counterpart.id).catch(() => null);
    if (live(roomId) !== room || busy(room)) return false;
    if (history === null) {
      if (!retry) return false;
      return new Promise<boolean>((resolve) => {
        deps.schedule(room, PULL_RETRY_MS, () => void attempt(roomId, room, false).then(resolve));
      });
    }
    const before = theirLines(room.messages);
    // 아직 열지 않은 방은 목록 미리보기처럼 로그만 합칩니다 — 첫 인사 · 생각 칩은 방을 열 때(`loadRoom`) 받습니다.
    if (room.remoteHistory === "loaded") deps.applyHistory(room, history);
    else room.messages = mergeLog(room.messages, history.messages);
    if (theirLines(room.messages) > before && !isOpen(roomId)) room.unread += 1;
    changed(room);
    return true;
  };
  return (roomId) => {
    const room = live(roomId);
    if (room === null || room.access.kind !== "open") return Promise.resolve(false);
    if (isOpen(roomId)) {
      deps.refresh(room);
      return Promise.resolve(true);
    }
    if (busy(room)) return Promise.resolve(false);
    return attempt(roomId, room, true);
  };
}
