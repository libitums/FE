// 다시 켠 뒤 목록 미리보기입니다(2026-11-17 일반 회원 개방) — 서버 방은 기록을 방을 열 때만 읽어, 앱을 다시 켜면 목록 줄이
// 빈 미리보기 · 시각 없이 섰습니다. 출처를 만들 때 열린 방마다 기록을 한 번 읽어 로그에 합칩니다.
// 첫 인사는 청하지 않습니다 — 기록이 비면 그대로 두고, 방을 열 때(`loadRoom`) 지금처럼 첫 인사를 받습니다. 던지지 않습니다.

import type { RoomState } from "./chat-fixture-room";
import { mergeLog } from "./chat-log-merge";
import type { ChatRemote } from "./chat-remote.contract";

export type RemotePreviewDeps = {
  readonly remote: ChatRemote;
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
};

export function previewRemoteRooms(deps: RemotePreviewDeps, roomIds: readonly string[]): void {
  for (const roomId of roomIds) {
    const room = deps.live(roomId);
    if (room === null || room.access.kind !== "open" || room.remoteHistory !== "idle") continue;
    void deps.remote
      .loadHistory(room.seed.counterpart.id)
      .then((history) => {
        // 그사이 방을 열었으면(`loadRoom`) 그쪽이 같은 기록을 합칩니다 — 같은 id는 한 줄입니다(`mergeLog`).
        if (deps.live(roomId) !== room || history === null || history.messages.length === 0) return;
        room.messages = mergeLog(room.messages, history.messages);
        deps.changed(room);
      })
      .catch(() => undefined);
  }
}
