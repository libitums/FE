// 내 말풍선 도구 상태 + 출처 호출 + 낭독 훅입니다(messenger-chat-1-5 spec §6.1 · §12). 출처 호출은 이 훅만 합니다.
// 열린 도구는 방 화면이 사는 동안만 삽니다(나갔다 오면 모두 접힘) — 받은 뜻 · 교정 · seen은 출처에 남습니다.

import { useCallback, useEffect, useRef, useState } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import type { MyMessageCopy } from "./messenger-chat-copy-1-5.contract";
import { notesOf } from "./chat-source.contract";
import type { ChatSource, ChatThread } from "./chat-source.contract";
import {
  bubbleAnnouncementOf,
  myBubbleViewOf,
  toggleBubbleTool,
  toolRequestOf,
  type BubbleAnnouncement,
  type BubbleTool,
  type BubbleToolsState,
  type MyBubbleView,
} from "./my-message-state";

export type UseBubbleToolsInput = {
  readonly roomId: string;
  readonly source: ChatSource;
  readonly thread: ChatThread | null;
  readonly announce: (text: string) => void;
};
export type UseBubbleTools = {
  readonly open: BubbleToolsState;
  readonly toggle: (messageId: string, tool: BubbleTool) => void;
};

const CLOSED: MyBubbleView = { kind: "closed" };

function announcementText(announcement: BubbleAnnouncement, copy: MyMessageCopy): string {
  switch (announcement.kind) {
    case "loading-meaning":
      return copy.loadingMeaning;
    case "loading-fix":
      return copy.loadingFix;
    case "meaning":
      return `${announcement.meaning.romanization}, ${announcement.meaning.meaning}`;
    case "fix":
      return copy.fixLabel(announcement.correction.corrected, announcement.correction.explanation);
    default: {
      const unreachable: never = announcement;
      return unreachable;
    }
  }
}

export function useBubbleTools({
  roomId,
  source,
  thread,
  announce,
}: UseBubbleToolsInput): UseBubbleTools {
  const copy = useUiCopy().messengerChat.myMessage;
  const [open, setOpen] = useState<BubbleToolsState>({});
  const views = useRef<ReadonlyMap<string, MyBubbleView>>(new Map());

  const toggle = useCallback(
    (messageId: string, tool: BubbleTool) => {
      if (thread === null) return;
      const next = toggleBubbleTool(open, messageId, tool);
      setOpen(next);
      if (next[messageId] !== tool) return;
      const request = toolRequestOf(tool, notesOf(thread, messageId));
      if (request === "request-meaning") source.requestMeaning(roomId, messageId);
      else if (request === "open-correction") source.openCorrection(roomId, messageId);
    },
    [open, roomId, source, thread],
  );

  // 보기가 바뀌는 순간 한 번씩 낭독합니다(처음 서는 말풍선은 닫혀 있어 낭독하지 않습니다).
  useEffect(() => {
    if (thread === null) return;
    const next = new Map<string, MyBubbleView>();
    for (const message of thread.messages) {
      if (message.kind !== "text" || message.from !== "me") continue;
      const view = myBubbleViewOf(open[message.id], notesOf(thread, message.id));
      next.set(message.id, view);
      const announcement = bubbleAnnouncementOf(views.current.get(message.id) ?? CLOSED, view);
      if (announcement !== null) announce(announcementText(announcement, copy));
    }
    views.current = next;
  }, [open, thread, copy, announce]);

  return { open, toggle };
}
