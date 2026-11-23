// 예시 스냅샷(ADR-0146 추가 — 안내에서 무료 예시 한 장): 방 안내가 사진 단추를 가리키고, 누르면 서버가 미리 올려 둔 그 인물의 사진을
// 값 없이 한 장 줍니다. 엔진을 부르지 않아 곧바로 오지만, 「만드는 중」을 잠깐 보여 실제 요청과 같은 경험을 줍니다.
// 놓는 일(자리표시자 · 서버 줄 · 회색 줄)은 서버 사진과 같은 도구를 씁니다(`chat-remote-media.ts`가 넘김).

import type { RoomState } from "./chat-fixture-room";
import type { ChatMediaRemote, ChatMediaTarget } from "./chat-media.contract";
import { mediaLineId, mediaTargetOf } from "./chat-media-rules";
import type { MediaSenderDeps } from "./chat-remote-send";

/** 예시 사진이 도착하기 전 「만드는 중」을 보이는 가장 짧은 시간. */
export const SAMPLE_WAIT_MS = 1500;

export type SampleSnapshotMethods = {
  /** 이 방의 인물에게서 예시를 받을 수 있나 — 서버가 정합니다. 못 물으면 false. */
  readonly offered: (roomId: string) => Promise<boolean>;
  /** 예시를 받아 대화에 놓습니다 — 받았으면 true. */
  readonly claim: (roomId: string) => Promise<boolean>;
};

export function sampleSnapshotMethods(
  deps: Pick<
    MediaSenderDeps,
    "now" | "alive" | "put" | "replace" | "changed" | "noticeLine" | "accept"
  > & {
    readonly port: ChatMediaRemote | undefined;
    readonly live: (roomId: string) => RoomState | null;
    readonly schedule: (room: RoomState, ms: number, fn: () => void) => void;
  },
): SampleSnapshotMethods {
  const { port, live, now, alive, put, replace, changed, noticeLine, accept, schedule } = deps;
  const openRoom = (roomId: string): RoomState | null => {
    const room = live(roomId);
    return room !== null && room.access.kind === "open" ? room : null;
  };
  const refuse = (room: RoomState, reqId: string, target: ChatMediaTarget): boolean => {
    replace(room, reqId, noticeLine(room, target, "photo", "request-failed"));
    changed(room);
    return false;
  };
  return {
    offered: async (roomId) => {
      const room = openRoom(roomId);
      const sample = port?.sample;
      return room === null || sample === undefined ? false : sample.offer(room.seed.counterpart.id);
    },
    claim: async (roomId) => {
      const room = openRoom(roomId);
      const sample = port?.sample;
      const target = room === null ? null : mediaTargetOf(room.messages, "photo");
      if (room === null || sample === undefined || target === null) return false;
      const reqId = mediaLineId(target.messageId, "photo", "req");
      const at = now();
      put(room, { id: reqId, at, kind: "photo-pending", startedAt: at });
      changed(room);
      const waited = new Promise<void>((resolve) => schedule(room, SAMPLE_WAIT_MS, resolve));
      const [result] = await Promise.all([sample.claim(target.messageId), waited]);
      if (!alive(room)) return false;
      if (result.kind !== "accepted" || result.media.status !== "complete")
        return refuse(room, reqId, target);
      // 값이 없으니 잔액을 읽지 않습니다(`cached`).
      await accept(room, reqId, target, "photo", { media: result.media, cached: true });
      if (!alive(room)) return false;
      put(room, noticeLine(room, target, "photo", "sample-gift"));
      changed(room);
      return true;
    },
  };
}
