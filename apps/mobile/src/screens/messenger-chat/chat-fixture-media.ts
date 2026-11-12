// 가짜 출처의 사진 · 음성 요청입니다 — 「준비 중」 줄이 서고 정한 시간 뒤 사진 · 음성 말풍선으로 바뀝니다(서버 API 전까지, ADR-0137).

import { isOpenAccess, replaceMessage, type RoomState } from "./chat-fixture-room";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { ChatMediaKind } from "./chat-source.contract";

export type MediaDeps = {
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  readonly schedule: (room: RoomState, ms: number, fn: () => void) => void;
  readonly now: () => number;
  readonly messageId: () => string;
  readonly photoPaths: Map<string, string | null>;
  readonly resolveUrl: (path: string | null) => string | null;
};

export function mediaRequester({
  live,
  changed,
  schedule,
  now,
  messageId,
  photoPaths,
  resolveUrl,
}: MediaDeps): (roomId: string, media: ChatMediaKind) => void {
  const timing = CHAT_PLACEHOLDERS.timing;
  return (roomId: string, media: ChatMediaKind) => {
    const room = live(roomId);
    if (room === null || !isOpenAccess(room)) return;
    const id = messageId();
    const photo = media === "photo";
    room.messages = [
      ...room.messages,
      { id, at: now(), kind: photo ? "photo-pending" : "voice-pending" },
    ];
    if (photo) room.pendingPhotos += 1;
    else room.pendingVoices += 1;
    changed(room);
    schedule(room, photo ? timing.photoArrivalMs : timing.voiceArrivalMs, () => {
      const at = now();
      const { voiceLine, photoPath } = room.seed;
      if (photo) photoPaths.set(id, photoPath);
      if (photo) room.pendingPhotos -= 1;
      else room.pendingVoices -= 1;
      replaceMessage(
        room,
        id,
        photo
          ? { id, at, kind: "photo", imageUrl: resolveUrl(photoPath) }
          : { id, at, kind: "voice", durationMs: voiceLine.durationMs, text: voiceLine.text },
      );
      changed(room);
    });
  };
}
