// 다시 켠 뒤 목록 미리보기입니다(2026-11-17 일반 회원 개방) — 서버 방은 기록을 방을 열 때만 읽어, 앱을 다시 켜면 목록 줄이
// 빈 미리보기 · 시각 없이 섰습니다. 출처를 만들 때 열린 방마다 기록을 한 번 읽어 로그에 합칩니다.
// 첫 인사는 청하지 않습니다 — 기록이 비면 그대로 두고, 방을 열 때(`loadRoom`) 지금처럼 첫 인사를 받습니다. 던지지 않습니다.

import type { RoomState } from "./chat-fixture-room";
import type { UnreadSeen } from "./chat-last-seen";
import { mergeLog } from "./chat-log-merge";
import type { ChatRemote } from "./chat-remote.contract";

export type RemotePreviewDeps = {
  readonly remote: ChatRemote;
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  /** 본 마지막 인물 메시지(ADR-0213 개정) — 앱이 꺼진 사이 온 인물 메시지를 안 읽음으로 셉니다. 없으면 세지 않습니다. */
  readonly seen?: UnreadSeen | null;
};

export function previewRemoteRooms(deps: RemotePreviewDeps, roomIds: readonly string[]): void {
  for (const roomId of roomIds) {
    const room = deps.live(roomId);
    if (room === null || room.access.kind !== "open" || room.remoteHistory !== "idle") continue;
    void deps.remote
      .loadHistory(room.seed.counterpart.id)
      .then((history) => {
        // 그사이 방을 열었으면(`loadRoom`) 그쪽이 같은 기록을 합칩니다 — 같은 id는 한 줄입니다(`mergeLog`).
        if (deps.live(roomId) !== room || history === null) return;
        const empty = history.messages.length === 0;
        if (!empty) room.messages = mergeLog(room.messages, history.messages);
        deps.seen?.settle(room); // 앱이 꺼진 사이 온 인물 메시지 — 기록이 비었으면 빈 대화를 본 것으로
        if (!empty) deps.changed(room);
      })
      .catch(() => undefined);
  }
}
