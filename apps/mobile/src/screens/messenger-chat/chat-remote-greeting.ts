// 서버 방의 첫 인사 둘입니다 — 방을 열었는데 비어 있을 때의 첫 인사(ADR-0137)와 인물이 해금된 순간의 해금 선톡(ADR-0152).
// `chat-fixture-remote.ts`가 방을 열 때 · 출처가 인물을 해금할 때 부릅니다. 던지지 않습니다.

import type { RoomState } from "./chat-fixture-room";
import type { ChatRemote, RemoteGreeting } from "./chat-remote.contract";

export type RemoteGreetingDeps = {
  readonly remote: ChatRemote;
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  readonly isOpen: (roomId: string) => boolean;
};

export function remoteGreetingMethods(deps: RemoteGreetingDeps) {
  const { remote, live, changed } = deps;
  const roomIdOf = (room: RoomState) => room.seed.roomId;
  const characterOf = (room: RoomState) => room.seed.counterpart.id;
  // 해금 선톡을 청하는 중인 방과, 아직 못 받은 방(오프라인 · 로그인 전)을 기억합니다. 못 받은 방은 열 때의 첫 인사를 같은
  // 해금 선톡으로 청합니다. 앱을 다시 켜면 이 기억은 사라지지만, 정해진 말이 있는 인물은 서버가 빈 방의 첫 인사도 같은 말로 줍니다.
  const inFlight = new Map<RoomState, Promise<void>>();
  const owed = new WeakSet<RoomState>();

  /** 받은 인사를 로그 맨 앞에 놓습니다 — 기다리는 사이 생긴 내 글보다 앞입니다(ADR-0137). */
  const place = (room: RoomState, greeting: RemoteGreeting) => {
    const known = new Set(room.messages.map((message) => message.id));
    room.messages = [...greeting.messages.filter((m) => !known.has(m.id)), ...room.messages];
    if (room.pendingReplies === 0) room.remoteIdeas = greeting.ideas;
  };

  return {
    /** 방을 열 때의 첫 인사 — 받았으면(인사가 없다는 답 포함) true, 못 받았으면 false. */
    greet: async (room: RoomState): Promise<boolean> => {
      room.typing = true;
      changed(room);
      const greeting = await (owed.has(room)
        ? remote.greet(characterOf(room), "unlock")
        : remote.greet(characterOf(room)));
      if (live(roomIdOf(room)) !== room) return true;
      // 인사를 기다리는 사이 보낸 턴이 있으면 그 입력 중 점을 끄지 않습니다.
      room.typing = room.pendingReplies > 0;
      if (greeting === null) return false;
      owed.delete(room);
      place(room, greeting);
      return true;
    },

    /**
     * 해금 선톡 — 인물이 해금된 순간, 방을 열지 않아도 그 인물의 정해진 첫 말을 서버에 청해 방에 놓습니다. 닫힌 방이면 안 읽음
     * 하나로 셉니다(목록에 마지막 메시지로 섭니다).
     */
    greetUnlocked: (roomId: string): void => {
      const room = live(roomId);
      if (room === null || room.access.kind !== "open" || inFlight.has(room)) return;
      owed.add(room);
      const pending = (async () => {
        // 던져도 못 받은 것으로 칩니다 — 청하는 중으로 남으면 방을 열 때 `settled`가 실패한 답을 기다립니다.
        const greeting = await remote.greet(characterOf(room), "unlock").catch(() => null);
        inFlight.delete(room);
        if (live(roomId) !== room || greeting === null) return;
        owed.delete(room);
        // 대화 불가 · 엽전 부족 안내 줄은 방을 열 때의 첫 인사가 놓습니다 — 열지도 않은 방에 회색 줄을 세우지 않습니다.
        const bubbles = greeting.messages.filter((message) => message.kind !== "notice");
        if (bubbles.length === 0) return;
        const before = room.messages.length;
        place(room, { messages: bubbles, ideas: greeting.ideas });
        if (room.messages.length > before && !deps.isOpen(roomId)) room.unread += 1;
        changed(room);
      })();
      inFlight.set(room, pending);
    },

    /**
     * 청하는 중인 해금 선톡이 끝나기를 기다립니다. 방을 열 때 기록을 읽기 전에 부릅니다 — 아니면 빈 기록을 보고 보통 첫 인사를
     * 겹쳐 청해, 모델 인사가 정해진 말보다 먼저 저장될 수 있습니다.
     */
    settled: (room: RoomState): Promise<void> => inFlight.get(room) ?? Promise.resolve(),
  };
}
