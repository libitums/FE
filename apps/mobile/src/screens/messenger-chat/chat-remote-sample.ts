// 예시 스냅샷 · 예시 음성(ADR-0146 추가 — 안내에서 무료 예시): 방 안내가 사진 단추, 이어서 음성 단추를 가리키고, 누르면 서버가 미리
// 올려 둔 그 인물의 사진 · 음성을 값 없이 하나씩 줍니다. 엔진을 부르지 않아 곧바로 오지만, 「만드는 중」을 잠깐 보여 실제 요청과 같은
// 경험을 줍니다. 놓는 일(자리표시자 · 서버 줄 · 회색 줄)은 서버 사진 · 음성과 같은 도구를 씁니다(`chat-remote-media.ts`가 넘김).
// 대상은 첫 인사입니다(ADR-0146 개정 ⟨예시 대상⟩) — 예시 파일이 첫 인사에 맞춘 고정 파일이라, 가이드 도중 답했어도 응답에 붙이지
// 않습니다. 대상이 없으면 그 예시는 제안하지 않습니다. 받은 예시의 줄 앞부분을 방에 적어 화면이 그 줄을 보이게 합니다.

import type { RoomState } from "./chat-fixture-room";
import type {
  ChatMediaRemote,
  ChatMediaTarget,
  MediaRequestResult,
  SampleOffer,
} from "./chat-media.contract";
import { mediaLineId } from "./chat-media-rules";
import { samplePrefixOf, sampleTargetOf } from "./chat-sample-target";
import type { ChatMediaKind } from "./chat-source.contract";
import type { MediaSenderDeps } from "./chat-remote-send";

/** 예시 사진이 도착하기 전 「만드는 중」을 보이는 가장 짧은 시간. */
export const SAMPLE_WAIT_MS = 1500;

export type SampleSnapshotMethods = {
  /** 이 방의 인물에게서 받을 수 있는 예시(사진 · 음성) — 서버가 정합니다. 못 물으면 둘 다 false. */
  readonly offered: (roomId: string) => Promise<SampleOffer>;
  /** 예시를 받아 대화에 놓습니다(기본 사진) — 받았으면 true. */
  readonly claim: (roomId: string, media?: ChatMediaKind) => Promise<boolean>;
};

const NO_OFFER: SampleOffer = { snapshot: false, voice: false };

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
  const targetOf = (room: RoomState, media: ChatMediaKind) =>
    sampleTargetOf(room.messages, media, room.greetingId);
  /** 받은 결과를 대화에 놓습니다 — 사진 + 「이번 것은 무료」 줄, 아니면 회색 안내 줄. */
  const settle = async (
    room: RoomState,
    reqId: string,
    target: ChatMediaTarget,
    media: ChatMediaKind,
    result: MediaRequestResult,
  ): Promise<boolean> => {
    if (!alive(room)) return false;
    if (result.kind !== "accepted" || result.media.status !== "complete") {
      // 서버가 주지 않기로 했으면(다른 기기에서 이미 씀 · 예시 꺼짐) 다시 해 보라고 하지 않습니다.
      const notice = result.kind === "failed" ? "request-failed" : "unavailable";
      replace(room, reqId, noticeLine(room, target, media, notice));
      changed(room);
      return false;
    }
    // 값이 없으니 잔액을 읽지 않습니다(`cached`).
    await accept(room, reqId, target, media, { media: result.media, cached: true });
    if (!alive(room)) return false;
    put(room, noticeLine(room, target, media, "sample-gift"));
    changed(room);
    return true;
  };
  return {
    offered: async (roomId) => {
      const room = openRoom(roomId);
      const sample = port?.sample;
      if (room === null || sample === undefined) return NO_OFFER;
      const offer = await sample.offer(room.seed.counterpart.id);
      // 대상이 없는 예시는 세우지 않습니다(음성은 첫 인사에 말 조각이 있어야 함).
      return {
        snapshot: offer.snapshot && targetOf(room, "photo") !== null,
        voice: offer.voice && targetOf(room, "voice") !== null,
      };
    },
    claim: async (roomId, media = "photo") => {
      const room = openRoom(roomId);
      const sample = port?.sample;
      const target = room === null ? null : targetOf(room, media);
      if (room === null || sample === undefined || target === null) return false;
      const reqId = mediaLineId(target.messageId, media, "req");
      room.samples = [...room.samples, samplePrefixOf(target.messageId, media)];
      const at = now();
      put(room, {
        id: reqId,
        at,
        kind: media === "photo" ? "photo-pending" : "voice-pending",
        startedAt: at,
      });
      changed(room);
      const result = await sample.claim(target.messageId, media === "photo" ? "snapshot" : "voice");
      // 「만드는 중」을 적어도 `SAMPLE_WAIT_MS`는 보입니다. 타이머는 방의 것이라 방이 비워지면 함께 사라집니다(자리표시자도 없어짐).
      const remaining = SAMPLE_WAIT_MS - (now() - at);
      if (remaining <= 0) return settle(room, reqId, target, media, result);
      return new Promise<boolean>((resolve) =>
        schedule(
          room,
          remaining,
          () => void settle(room, reqId, target, media, result).then(resolve),
        ),
      );
    },
  };
}
