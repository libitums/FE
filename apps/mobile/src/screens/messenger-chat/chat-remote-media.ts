// 출처의 서버 사진 · 음성입니다(ADR-0146 「앱 연결」) — 요청 → 자리표시자 → 상태 다시 읽기 → 결과 줄 · 회색 줄. 던지지 않습니다.
//
// - 다시 읽기는 방이 열려 있을 때만, 방마다 한 줄(세대 gen — 새로 시작하면 옛 틱은 조용히 끝남), 간격은 `mediaPollDelay`.
//   방을 나가면 다음 틱이 읽지 않고 멈추고, 다시 열면 `resume`이 메시지 id로 서버에 물어 이어 갑니다.
// - 엽전은 서버 지갑입니다 — 예약(202) · 확정/해제(결과) 뒤 잔액을 읽어 `hooks.onBalance`로 내보냅니다(앱 지갑에서 빼지 않음).
// - 타이머는 방 handles(`schedule`)라 방 지우기 · dispose에서 풀립니다.

import type { RoomState } from "./chat-fixture-room";
import type {
  ChatMediaHooks,
  ChatMediaNotice,
  ChatMediaOutcome,
  ChatMediaTarget,
  RemoteMedia,
} from "./chat-media.contract";
import {
  MEDIA_POLL_LIMIT_MS,
  mediaAvailabilityOf,
  mediaLineId,
  mediaLineOf,
  mediaPollDelay,
  mediaTargetOf,
  placeMediaLine,
  remoteKindOf,
} from "./chat-media-rules";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatMediaKind, ChatMessage } from "./chat-source.contract";

export type RemoteMediaDeps = {
  readonly remote: ChatRemote;
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  readonly now: () => number;
  readonly isOpen: (roomId: string) => boolean;
  readonly schedule: (room: RoomState, ms: number, fn: () => void) => void;
  readonly hooks?: ChatMediaHooks;
};

type Tracked = {
  readonly target: ChatMediaTarget;
  readonly media: ChatMediaKind;
  readonly since: number;
};
type MediaRoom = {
  gen: number;
  step: number;
  notices: number;
  readonly tracked: Map<string, Tracked>;
};

/** 한 번에 물을 메시지 id 수 — RPC 상한(100). */
const LOAD_LIMIT = 100;

const kindOf = (media: RemoteMedia): ChatMediaKind =>
  media.kind === "snapshot" ? "photo" : "voice";

export function remoteMediaMethods(deps: RemoteMediaDeps): {
  readonly request: (roomId: string, media: ChatMediaKind) => void;
  readonly resume: (room: RoomState) => void;
} {
  const { live, changed, now, isOpen, schedule, hooks } = deps;
  const port = deps.remote.media;
  const states = new WeakMap<RoomState, MediaRoom>();
  const urls = new Map<string, string>(); // media id → 서명 URL(실패는 기억하지 않음 — 다음 resume에 다시)
  const roomIdOf = (room: RoomState) => room.seed.roomId;
  const stateOf = (room: RoomState): MediaRoom => {
    const known = states.get(room);
    if (known !== undefined) return known;
    const fresh: MediaRoom = { gen: 0, step: 0, notices: 0, tracked: new Map() };
    states.set(room, fresh);
    return fresh;
  };
  const alive = (room: RoomState) => live(roomIdOf(room)) === room;

  /** 목록 활동(sending-photo · recording-voice)은 남은 자리표시자 수로 맞춥니다. */
  const recount = (room: RoomState) => {
    room.pendingPhotos = room.messages.filter((m) => m.kind === "photo-pending").length;
    room.pendingVoices = room.messages.filter((m) => m.kind === "voice-pending").length;
  };
  const put = (room: RoomState, line: ChatMessage) => {
    room.messages = placeMediaLine(room.messages, line);
    recount(room);
  };
  /** 자리표시자(`~req`)를 서버 줄로 — 같은 서버 줄이 이미 섰으면(resume) 자리표시자를 뺍니다. */
  const replace = (room: RoomState, oldId: string, line: ChatMessage) => {
    const exists = room.messages.some((m) => m.id === line.id);
    room.messages = exists
      ? room.messages.filter((m) => m.id !== oldId).map((m) => (m.id === line.id ? line : m))
      : room.messages.map((m) => (m.id === oldId ? line : m));
    put(room, line);
  };
  const noticeLine = (
    room: RoomState,
    target: ChatMediaTarget,
    media: ChatMediaKind,
    notice: ChatMediaNotice,
    until: number | null = null,
  ): ChatMessage => {
    const state = stateOf(room);
    state.notices += 1;
    const id = mediaLineId(target.messageId, media, `x${state.notices}`);
    return { id, at: now(), kind: "media-notice", media, notice, until };
  };
  const emit = (room: RoomState, media: ChatMediaKind, outcome: ChatMediaOutcome) =>
    hooks?.onSettled?.({ characterId: room.seed.counterpart.id, media, outcome });
  const readBalance = () => {
    if (port === undefined || hooks?.onBalance === undefined) return;
    void port.balance().then((balance) => {
      if (balance !== null) hooks.onBalance?.(balance);
    });
  };

  const lineFor = async (media: RemoteMedia, target: ChatMediaTarget): Promise<ChatMessage> => {
    let url: string | null = null;
    if (media.status === "complete" && media.path !== null && port !== undefined) {
      url = urls.get(media.id) ?? (await port.sign(media.path));
      if (url !== null) urls.set(media.id, url);
    }
    return mediaLineOf(media, target, url, now());
  };

  const poll = (room: RoomState) => {
    const state = stateOf(room);
    state.gen += 1;
    state.step = 0;
    const gen = state.gen;
    if (state.tracked.size > 0 && isOpen(roomIdOf(room)))
      schedule(room, mediaPollDelay(0), () => void tick(room, gen));
  };

  const tick = async (room: RoomState, gen: number) => {
    const state = stateOf(room);
    const current = () => state.gen === gen && alive(room);
    if (!current() || !isOpen(roomIdOf(room)) || state.tracked.size === 0 || port === undefined)
      return;
    const rows = await port.load({ ids: [...state.tracked.keys()] });
    if (!current()) return;
    let settled = false;
    for (const [id, tracked] of [...state.tracked]) {
      const row = rows?.find((media) => media.id === id);
      if (row !== undefined && row.status !== "pending") {
        state.tracked.delete(id);
        const line = await lineFor(row, tracked.target);
        if (!alive(room)) return;
        put(room, line);
        emit(room, tracked.media, row.status);
        settled = true;
      } else if (now() - tracked.since > MEDIA_POLL_LIMIT_MS) {
        // 서버도 곧 만료(failed · expired)로 닫으며 예약을 풉니다 — 앱은 기다림을 그만둡니다.
        state.tracked.delete(id);
        const line = mediaLineOf(
          { ...(row ?? placeholder(id, tracked)), status: "failed" },
          tracked.target,
          null,
          now(),
        );
        put(room, line);
        emit(room, tracked.media, "failed");
        settled = true;
      }
    }
    if (settled) {
      changed(room);
      readBalance();
    }
    if (state.tracked.size > 0 && current() && isOpen(roomIdOf(room))) {
      state.step += 1;
      schedule(room, mediaPollDelay(state.step), () => void tick(room, gen));
    }
  };

  const placeholder = (id: string, tracked: Tracked): RemoteMedia => ({
    id,
    messageId: tracked.target.messageId,
    kind: remoteKindOf(tracked.media),
    status: "pending",
    path: null,
    aspect: null,
    failure: null,
    createdAt: now(),
  });

  /** 받은 요청의 결과를 놓습니다 — pending이면 추적 · 다시 읽기, 아니면 결과 줄. 새로 만든(202) 것이면 잔액을 읽습니다. */
  const accept = async (
    room: RoomState,
    reqId: string,
    target: ChatMediaTarget,
    media: ChatMediaKind,
    result: { readonly media: RemoteMedia; readonly cached: boolean },
  ) => {
    const line = await lineFor(result.media, target);
    if (!alive(room)) return;
    replace(room, reqId, line);
    if (result.media.status === "pending") {
      const state = stateOf(room);
      if (!state.tracked.has(result.media.id))
        state.tracked.set(result.media.id, { target, media, since: now() });
      poll(room);
    }
    changed(room);
    if (!result.cached) readBalance();
  };

  const request = (roomId: string, media: ChatMediaKind) => {
    const room = live(roomId);
    if (room === null || room.access.kind !== "open") return;
    const busy = room.pendingReplies > 0 || room.typing;
    if (mediaAvailabilityOf({ messages: room.messages, busy, server: true }, media) !== "ready")
      return;
    const target = mediaTargetOf(room.messages, media);
    if (target === null) return;
    if (port === undefined) {
      put(room, noticeLine(room, target, media, "unavailable"));
      changed(room);
      return;
    }
    const reqId = mediaLineId(target.messageId, media, "req");
    put(room, {
      id: reqId,
      at: now(),
      kind: media === "photo" ? "photo-pending" : "voice-pending",
    });
    changed(room);
    void (async () => {
      const result = await port.request(remoteKindOf(media), target.messageId);
      if (!alive(room)) return;
      if (result.kind === "accepted") return accept(room, reqId, target, media, result);
      if (result.kind === "refused") {
        replace(room, reqId, noticeLine(room, target, media, result.notice, result.until));
        changed(room);
        emit(room, media, "refused");
        if (result.notice === "no-coins") readBalance();
        return;
      }
      // 연결 실패 · 5xx — 서버가 받았는지 모릅니다. 메시지 id로 한 번 물어 만드는 중 · 결과가 있으면 그대로 이어 갑니다.
      const rows = await port.load({ messageIds: [target.messageId] });
      if (!alive(room)) return;
      const found = (rows ?? [])
        .filter((row) => row.kind === remoteKindOf(media) && row.status !== "blocked")
        .filter((row) => row.status !== "failed")
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      if (found !== undefined)
        return accept(room, reqId, target, media, { media: found, cached: false });
      replace(room, reqId, noticeLine(room, target, media, "request-failed"));
      changed(room);
    })();
  };

  /** 방을 열 때 — 로그의 캐릭터 메시지 id로 서버에 물어 결과 · 자리표시자 · 회색 줄을 다시 놓고, 만드는 중이면 다시 읽기를 잇습니다. */
  const resume = (room: RoomState) => {
    if (port === undefined || room.access.kind !== "open") return;
    const owners = [
      ...new Set(
        room.messages.flatMap((message) => {
          const target = message.id.includes("#") ? mediaTargetOf([message], "photo") : null;
          return target === null ? [] : [target.messageId];
        }),
      ),
    ].slice(-LOAD_LIMIT);
    const state = stateOf(room);
    if (owners.length === 0) return poll(room);
    state.gen += 1; // 도는 다시 읽기를 멈춥니다 — 물은 뒤 새로 시작
    const gen = state.gen;
    void (async () => {
      const rows = await port.load({ messageIds: owners });
      if (!alive(room) || state.gen !== gen) return;
      let settled = false;
      for (const row of [...(rows ?? [])].sort((a, b) => a.createdAt - b.createdAt)) {
        const target = mediaTargetOf(
          room.messages.filter((m) => m.id.startsWith(`${row.messageId}#`)),
          "photo",
        );
        if (target === null) continue;
        const media = kindOf(row);
        const tracked = state.tracked.get(row.id);
        if (row.status === "pending" && tracked === undefined)
          state.tracked.set(row.id, { target, media, since: now() });
        if (row.status !== "pending" && tracked !== undefined) {
          state.tracked.delete(row.id);
          emit(room, media, row.status);
          settled = true;
        }
        const line = await lineFor(row, target);
        if (!alive(room)) return;
        put(room, line);
      }
      changed(room);
      if (settled) readBalance();
      if (state.gen === gen) poll(room);
    })();
  };

  return { request, resume };
}
