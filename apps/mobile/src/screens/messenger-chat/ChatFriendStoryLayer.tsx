import { useGlobalProps, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import { screenHeightFrom } from "../../lib/learning-density";
import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { useChatEvents } from "./chat-events";
import type { ChatRoomSummary, ChatSource } from "./chat-source.contract";
import type { CoinWallet } from "./coin-wallet";
import type {
  FriendStoriesPort,
  StoryCloseReason,
  StoryViewerItem,
} from "./friend-stories.contract";
import { emptyKeyboardHeightStore } from "./keyboard-ports";
import { StoryViewer } from "./StoryViewer";
import { usePhoneKeyboardHeight } from "./use-phone-keyboard-height";
import { useStoryInlineReply } from "./use-story-inline-reply";

const NOTHING = () => undefined;

/**
 * 대화방 판에서 연 친구 스토리 보기(ADR-0178 D5 개정 ⟨판⟩) — 그 인물의 살아 있는 스토리, 그 장부터. 답장 · 단어 저장은 목록의 보기와 같고, 엽전이
 * 모자라면 보기를 닫아 방으로 돌아갑니다(방의 입력 줄이 상점을 엶). 장마다 `friend_story_viewed`(from chat), 닫힐 때 `friend_story_closed`.
 */
export function ChatFriendStoryLayer({
  items,
  start,
  port,
  source,
  rooms,
  wallet,
  onOpenRoom,
  onClose,
}: {
  readonly items: readonly StoryViewerItem[];
  readonly start: number;
  readonly port: FriendStoriesPort;
  readonly source: ChatSource;
  readonly rooms: readonly ChatRoomSummary[];
  readonly wallet: CoinWallet;
  readonly onOpenRoom: (roomId: string) => void;
  readonly onClose: () => void;
}): ReactNode {
  const { emit } = useChatEvents();
  const shown = useRef(new Set<string>());
  const skipped = useRef(0);
  const close = (reason: StoryCloseReason | "replied") => {
    emit({
      name: "friend_story_closed",
      surface: "chat",
      shown: String(shown.current.size),
      total: String(items.length),
      skipped: String(skipped.current),
      reason,
    });
    onClose();
  };
  const inline = useStoryInlineReply({
    source,
    rooms,
    wallet,
    plan: port.replyPlan,
    onShortOfCoins: () => close("closed"),
  });
  const keyboard = usePhoneKeyboardHeight(
    port.keyboardHeightStore ?? emptyKeyboardHeightStore,
    screenHeightFrom(typeof SystemInfo === "undefined" ? undefined : SystemInfo),
    safeAreaInsetsFrom(useGlobalProps()).bottom,
  );
  return (
    <StoryViewer
      items={items}
      start={start}
      now={Date.now()}
      reducedMotion={resolveReducedMotion(undefined, useMotion())}
      romanization={port.romanization?.() ?? true}
      {...(port.words === undefined ? {} : { words: port.words })}
      onShown={(item) => {
        "background only";
        port.seen.markSeen(item.story.id, item.story.expiresAt, Date.now());
        shown.current.add(item.story.id);
        emit({
          name: "friend_story_viewed",
          surface: "chat",
          characterId: item.story.characterId,
          met: true,
          from: "chat",
          index: String(items.indexOf(item) + 1),
          total: String(items.length),
        });
      }}
      onReply={inline.reply}
      onOpenChat={(item) => {
        "background only";
        const roomId = inline.roomIdOf(item.story.characterId);
        close("replied");
        if (roomId !== null) onOpenRoom(roomId);
      }}
      keyboardHeight={keyboard.height}
      onKeyboardHeight={keyboard.measure}
      onSaveWord={(item) =>
        emit({
          name: "friend_story_word_saved",
          surface: "chat",
          characterId: item.story.characterId,
        })
      }
      onMeet={NOTHING}
      onProfile={NOTHING}
      onClose={close}
      onSkip={() => {
        skipped.current += 1;
      }}
    />
  );
}
