// 서버 사진 · 음성 요청 한 번입니다(ADR-0146 「앱 연결」 · ADR-0150 다시 만들기) — 자리표시자 → 서버 → 결과 · 회색 줄. 던지지 않습니다.

import type { ChatRemakeResult } from "./chat-album.contract";
import type { RoomState } from "./chat-fixture-room";
import type {
  ChatMediaNotice,
  ChatMediaOutcome,
  ChatMediaRemote,
  ChatMediaTarget,
  RemoteMedia,
} from "./chat-media.contract";
import { mediaLineId, remoteKindOf } from "./chat-media-rules";
import type { ChatMediaKind, ChatMessage } from "./chat-source.contract";

export type MediaSenderDeps = {
  readonly port: ChatMediaRemote | undefined;
  readonly now: () => number;
  readonly alive: (room: RoomState) => boolean;
  readonly put: (room: RoomState, line: ChatMessage) => void;
  readonly replace: (room: RoomState, oldId: string, line: ChatMessage) => void;
  readonly changed: (room: RoomState) => void;
  readonly noticeLine: (
    room: RoomState,
    target: ChatMediaTarget,
    media: ChatMediaKind,
    notice: ChatMediaNotice,
    until?: number | null,
  ) => ChatMessage;
  readonly accept: (
    room: RoomState,
    reqId: string,
    target: ChatMediaTarget,
    media: ChatMediaKind,
    result: { readonly media: RemoteMedia; readonly cached: boolean },
  ) => Promise<void>;
  readonly emit: (room: RoomState, media: ChatMediaKind, outcome: ChatMediaOutcome) => void;
  readonly readBalance: () => void;
};

export function mediaSender(deps: MediaSenderDeps) {
  const { port, now, alive, put, replace, changed, noticeLine, accept, emit, readBalance } = deps;
  /** 요청 하나 — 자리표시자 → 서버 → 결과 · 회색 줄. `again`이면 다시 만들기(ADR-0150)이고 결과는 옛 결과 자리를 대신합니다. */
  return async (
    room: RoomState,
    target: ChatMediaTarget,
    media: ChatMediaKind,
    again: boolean,
  ): Promise<ChatRemakeResult> => {
    if (port === undefined) {
      put(room, noticeLine(room, target, media, "unavailable"));
      changed(room);
      return { kind: "refused", notice: "unavailable" };
    }
    const reqId = mediaLineId(target.messageId, media, "req");
    put(room, {
      id: reqId,
      at: now(),
      kind: media === "photo" ? "photo-pending" : "voice-pending",
    });
    changed(room);
    const kind = remoteKindOf(media);
    const result = await (again
      ? port.request(kind, target.messageId, true)
      : port.request(kind, target.messageId));
    if (!alive(room)) return { kind: "failed" };
    if (result.kind === "accepted") {
      await accept(room, reqId, target, media, result);
      return { kind: "started" };
    }
    if (result.kind === "refused") {
      replace(room, reqId, noticeLine(room, target, media, result.notice, result.until));
      changed(room);
      emit(room, media, "refused");
      if (result.notice === "no-coins") readBalance();
      return { kind: "refused", notice: result.notice };
    }
    // 연결 실패 · 5xx — 서버가 받았는지 모릅니다. 메시지 id로 한 번 물어 만드는 중 · 결과가 있으면 그대로 이어 갑니다.
    const rows = await port.load({ messageIds: [target.messageId] });
    if (!alive(room)) return { kind: "failed" };
    const found = (rows ?? [])
      .filter((row) => row.kind === remoteKindOf(media) && row.status !== "blocked")
      .filter((row) => row.status !== "failed" && (!again || row.status === "pending"))
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (found !== undefined) {
      await accept(room, reqId, target, media, { media: found, cached: false });
      return { kind: "started" };
    }
    replace(room, reqId, noticeLine(room, target, media, "request-failed"));
    changed(room);
    return { kind: "failed" };
  };
}
