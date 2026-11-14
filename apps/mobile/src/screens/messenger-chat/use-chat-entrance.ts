import { useRef } from "@lynx-js/react";

import { createEntranceTracker, type ChatEntrance, type EntranceTracker } from "./chat-entrance";
import type { ChatMessage } from "./chat-source.contract";

/** 방 하나의 말풍선 등장 값(`chat-entrance.ts`) — 움직임 줄이기면 언제나 비어 있습니다. */
export function useChatEntrances(
  messages: readonly ChatMessage[] | null,
  motion: "standard" | "reduced",
): ReadonlyMap<string, ChatEntrance> {
  const tracker = useRef<EntranceTracker | null>(null);
  tracker.current ??= createEntranceTracker();
  const entrances = tracker.current.entrancesOf(messages);
  return motion === "reduced" ? new Map() : entrances;
}
