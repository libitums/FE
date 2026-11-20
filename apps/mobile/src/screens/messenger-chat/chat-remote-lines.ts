// 서버 사진 · 음성 결과 → 로그 줄(ADR-0146 「앱 연결」 · 「중간 그림」) — 결과 파일 · 중간 그림의 서명 URL을 붙이고, 만드는 중인 사진에
// 중간 그림이 새로 오면 자리표시자를 흐린 그림으로 바꿉니다. 던지지 않습니다.

import type { RoomState } from "./chat-fixture-room";
import type { ChatMediaRemote, ChatMediaTarget, RemoteMedia } from "./chat-media.contract";
import { mediaLineId, mediaLineOf } from "./chat-media-rules";
import type { ChatMediaKind, ChatMessage } from "./chat-source.contract";

export type MediaLinesDeps = {
  readonly port: ChatMediaRemote | undefined;
  readonly now: () => number;
  readonly alive: (room: RoomState) => boolean;
  readonly put: (room: RoomState, line: ChatMessage) => void;
};

export function mediaLines(deps: MediaLinesDeps) {
  const { port, now, alive, put } = deps;
  const urls = new Map<string, string>(); // 파일 경로 → 서명 URL(실패는 기억하지 않음 — 다음 읽기 · resume에 다시)

  /** 결과 파일(complete) · 중간 그림(pending 사진)의 서명 URL. 없거나 못 받으면 null. */
  const signedOf = async (media: RemoteMedia): Promise<string | null> => {
    const path =
      media.status === "complete"
        ? media.path
        : media.status === "pending" && media.kind === "snapshot"
          ? media.previewPath
          : null;
    if (path === null || port === undefined) return null;
    const url = urls.get(path) ?? (await port.sign(path));
    if (url !== null) urls.set(path, url);
    return url;
  };

  const lineFor = async (media: RemoteMedia, target: ChatMediaTarget): Promise<ChatMessage> =>
    mediaLineOf(media, target, await signedOf(media), now());

  /** 만드는 중인 사진에 중간 그림이 새로 왔으면 자리표시자를 흐린 그림으로 바꿉니다. 바꿨으면 true. */
  const showPreview = async (
    room: RoomState,
    row: RemoteMedia,
    tracked: { readonly target: ChatMediaTarget; readonly media: ChatMediaKind },
  ): Promise<boolean> => {
    if (row.kind !== "snapshot" || row.previewPath === null) return false;
    const id = mediaLineId(tracked.target.messageId, tracked.media, row.id);
    const shown = room.messages.find((message) => message.id === id);
    if (shown?.kind !== "photo-pending" || shown.previewUrl !== undefined) return false;
    const line = await lineFor(row, tracked.target);
    if (!alive(room) || line.kind !== "photo-pending" || line.previewUrl === undefined)
      return false;
    put(room, line);
    return true;
  };

  return { lineFor, showPreview };
}
