// 스토리 보기에서 바로 보내는 답장(ADR-0178 D5 개정) — 보기를 떠나지 않고 그 인물의 방으로 인용과 함께 보냅니다. 관문은 대화방 입력 줄과
// 같은 판정(`storyReplyGateOf`)이고, 서버가 글을 받았는지는 대화 출처 스냅숏(`storyReplyStatusOf`)으로 봅니다. 엽전이 모자라면 상점을 엽니다.

import { useEffect, useRef } from "@lynx-js/react";

import { CHAT_COIN_PRICES } from "./chat-coins";
import { useChatEvents } from "./chat-events";
import type { ChatRoomSummary, ChatSource } from "./chat-source.contract";
import type { CoinWallet } from "./coin-wallet";
import type {
  StoryReplyOutcome,
  StoryReplyPlan,
  StoryReplyVia,
  StoryViewerItem,
} from "./friend-stories.contract";
import { storyReplyGateOf, storyReplyStatusOf } from "./story-inline-reply";

const FAILED: StoryReplyOutcome = { kind: "failed", reason: "failed" };

export type StoryInlineReply = {
  readonly reply: (
    item: StoryViewerItem,
    text: string,
    via: StoryReplyVia,
  ) => Promise<StoryReplyOutcome>;
  /** 그 인물의 열린 방 — 없으면 null. */
  readonly roomIdOf: (characterId: string) => string | null;
};

export function useStoryInlineReply({
  source,
  rooms,
  wallet,
  plan,
  onShortOfCoins,
}: {
  readonly source: ChatSource;
  readonly rooms: readonly ChatRoomSummary[];
  readonly wallet: CoinWallet;
  readonly plan: (() => StoryReplyPlan | null) | undefined;
  readonly onShortOfCoins: () => void;
}): StoryInlineReply {
  const { emit } = useChatEvents();
  // 이번 실행에서 무료로 보낸 스토리 — 읽은 때의 안내 값(freeReply)이 남아 두 번째도 무료로 보지 않게(정본은 서버).
  const usedFree = useRef(new Set<string>());
  const watching = useRef(new Set<() => void>());
  useEffect(
    () => () => {
      for (const stop of watching.current) stop();
      watching.current.clear();
    },
    [],
  );

  const roomIdOf = (characterId: string): string | null =>
    rooms.find((room) => room.counterpart.id === characterId && room.access.kind === "open")
      ?.roomId ?? null;

  const sent = (characterId: string, cost: number, storyFree: boolean) =>
    emit({
      name: "chat_message_sent",
      surface: "chat",
      characterId,
      paid: cost > 0,
      cost: String(cost),
      ...(storyFree ? { storyFree: true as const } : {}),
      fromSuggestion: false,
    });

  const short = (shortBy: number): StoryReplyOutcome => {
    emit({
      name: "chat_coins_short",
      surface: "chat",
      reason: "message",
      shortBy: String(shortBy),
    });
    onShortOfCoins();
    return { kind: "failed", reason: "coins" };
  };

  /** 앱 관문 — 통과면 null, 막히면 그 끝. */
  const authorize = (item: StoryViewerItem, free: boolean, server: boolean) => {
    const current = plan?.() ?? null;
    const price = CHAT_COIN_PRICES.message;
    const gate = storyReplyGateOf({
      free,
      tier: current?.tier ?? null,
      trialRemaining: current === null ? null : current.trial.remaining(),
      balance: wallet.balance(),
      price,
      charging: server ? "server" : "local",
    });
    const characterId = item.story.characterId;
    switch (gate.kind) {
      case "story-free":
        sent(characterId, 0, true);
        return null;
      case "open":
        sent(characterId, 0, false);
        return null;
      case "trial":
        current?.trial.consume();
        sent(characterId, 0, false);
        return null;
      case "pay":
        if (gate.spend && wallet.spend(gate.price, "message").kind !== "spent")
          return short(gate.price);
        sent(characterId, gate.price, false);
        return null;
      case "short":
        return short(gate.shortBy);
    }
  };

  const reply = (
    item: StoryViewerItem,
    text: string,
    via: StoryReplyVia,
  ): Promise<StoryReplyOutcome> => {
    const { story } = item;
    const trimmed = text.trim();
    const roomId = roomIdOf(story.characterId);
    const thread = roomId === null ? null : source.thread(roomId);
    if (roomId === null || thread === null || trimmed === "") return Promise.resolve(FAILED);
    // 서버 방은 답을 기다리는 동안 다시 보내지 않습니다(대화방과 같이 — 서버가 409로 거절).
    if (thread.server !== null && (thread.typing || thread.awaitingReply))
      return Promise.resolve(FAILED);
    const free = story.freeReply && !usedFree.current.has(story.id);
    const blocked = authorize(item, free, thread.server !== null);
    if (blocked !== null) return Promise.resolve(blocked);
    const before = new Set(thread.messages.map((message) => message.id));
    source.sendText(roomId, trimmed, {
      story: {
        storyId: story.id,
        characterId: story.characterId,
        line: story.line.ko,
        imagePath: story.imagePath,
        postedAt: story.postedAt,
      },
    });
    emit({
      name: "friend_story_replied",
      surface: "chat",
      characterId: story.characterId,
      via,
      free,
      where: "viewer",
    });
    return new Promise((resolve) => {
      // 구독이 등록 중에 바로 알려도(동기 호출) 한 번만 풀고, 등록이 끝난 뒤 해제합니다(리뷰).
      let stop: (() => void) | null = null;
      let done = false;
      const check = () => {
        if (done) return;
        const status = storyReplyStatusOf(source.thread(roomId), before, story.id);
        if (status.kind === "sending") return;
        done = true;
        if (stop !== null) {
          stop();
          watching.current.delete(stop);
        }
        if (status.kind === "sent") {
          if (free) usedFree.current.add(story.id);
          resolve({ kind: "sent" });
        } else {
          if (status.reason === "coins") onShortOfCoins();
          resolve(status);
        }
      };
      check();
      if (done) return;
      const unsubscribe = source.subscribe(check);
      if (done) return unsubscribe();
      stop = unsubscribe;
      watching.current.add(unsubscribe);
    });
  };

  return { reply, roomIdOf };
}
