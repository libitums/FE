// 목록 맞추기입니다 — 서버 크론이 만든 선톡 · 스토리 반응은 푸시가 꺼졌거나(권한 · 게이트) 앱이 뒤에 있을 때 오면 목록에 서지
// 않았습니다(앞에서 받은 푸시 · 열린 방만 다시 읽음). 앱이 앞으로 올 때 · 목록에 들어올 때 목록 요약(`companion_list_characters`의
// 방별 `lastMessageAt`)을 한 번 읽어, 마지막으로 맞춘 값과 다른 닫힌 방만 기록을 다시 읽습니다(`pullRoom`과 같은 합치기 · 안 읽음).
// 폴링은 없습니다(ADR-0200). 처음 켤 때는 요약으로 대화가 있는 방만 미리 읽고(`previewRemoteRooms`), 그 값을 기준으로 둡니다.

import type { RoomState } from "./chat-fixture-room";
import type { RemoteRoomPull } from "./chat-remote-pull";
import { previewRemoteRooms } from "./chat-remote-preview";
import type { ChatRemote } from "./chat-remote.contract";

export type RemoteSyncDeps = {
  readonly remote: ChatRemote;
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  readonly openRoomId: () => string | null;
  /** 열린 방의 조용한 다시 읽기(답을 기다리는 중이면 읽지 않음). */
  readonly refresh: (room: RoomState) => void;
  readonly pull: RemoteRoomPull;
};

type Summary = ReadonlyMap<string, string | null>;

export type RemoteSyncControls = {
  readonly refreshOpenRoom: () => void;
  readonly syncRooms: () => void;
};

/** 처음 켤 때 미리 읽기를 걸고, 열린 방 다시 읽기 · 목록 맞추기를 돌려줍니다. 던지지 않습니다. */
export function remoteRoomSync(
  deps: RemoteSyncDeps,
  preview: readonly string[],
  roomIds: () => readonly string[] = () => preview,
): RemoteSyncControls {
  const { remote, live } = deps;
  const synced = new Map<string, string | null>(); // 인물 id → 마지막으로 맞춘 서버 lastMessageAt
  let reading = false; // 요약을 읽는 중 — 겹친 맞추기(앞으로 옴 + 목록 들어옴)는 하나로
  const characterOf = (roomId: string) => live(roomId)?.seed.counterpart.id ?? "";

  const readSummary = (then: (summary: Summary | null) => void): boolean => {
    const read = remote.lastMessages;
    if (read === undefined || reading) return false;
    reading = true;
    void read()
      .catch(() => null)
      .then((summary) => {
        reading = false;
        then(summary);
      });
    return true;
  };

  // 처음 켤 때 — 요약에 대화가 없는(null) 방은 미리 읽지 않습니다. 요약을 못 읽으면 전부 미리 읽습니다(예전과 같음).
  const started =
    preview.length > 0 &&
    readSummary((summary) => {
      if (summary === null) return previewRemoteRooms(deps, preview);
      summary.forEach((at, characterId) => synced.set(characterId, at));
      const talked = preview.filter((roomId) => summary.get(characterOf(roomId)) !== null);
      previewRemoteRooms(deps, talked);
    });
  if (!started) previewRemoteRooms(deps, preview);

  const refreshOpenRoom = () => {
    const id = deps.openRoomId();
    const room = id === null ? null : live(id);
    if (room !== null && room.access.kind === "open") deps.refresh(room);
  };
  const syncRooms = () => {
    // 지금 열린 방은 바로 다시 읽습니다. 요약을 읽는 사이 열린 방(누른 알림이 연 방 — 이미 읽은 방은 열 때 다시 읽지 않음)은
    // 요약에서 바뀌었으면 다시 읽습니다(`pull`이 열린 방이면 조용한 다시 읽기로).
    const refreshed = deps.openRoomId();
    refreshOpenRoom();
    readSummary((summary) => {
      if (summary === null) return;
      for (const roomId of roomIds()) {
        const room = live(roomId);
        if (room === null || room.access.kind !== "open") continue;
        if (roomId === refreshed && roomId === deps.openRoomId()) continue;
        const characterId = room.seed.counterpart.id;
        const at = summary.get(characterId);
        // 요약에 없음(보이지 않는 인물) · 대화 없음 · 이미 맞춘 값이면 건너뜁니다.
        if (at === undefined || at === null || synced.get(characterId) === at) continue;
        void deps.pull(roomId).then((ok) => {
          if (ok) synced.set(characterId, at);
        });
      }
    });
  };
  return { refreshOpenRoom, syncRooms };
}
