// 스토리 보기 아래의 내 친구 답장 묶음(ADR-0178 D5 개정) — 「Sent · Open chat」 알림 → 무료 안내 · 칩(입력 중엔 숨김) → 답장 칸.

import type { ReactNode } from "@lynx-js/react";

import type { FriendStoriesCopy, StoryViewerItem } from "./friend-stories.contract";
import { StoryReplyInput, StorySentToast } from "./StoryReplyInput";
import { StoryReplyBar } from "./StoryViewerParts";
import type { StoryViewerReply } from "./use-story-viewer-reply";

export function StoryReplyArea({
  item,
  copy,
  reply,
  onOpenChat,
}: {
  readonly item: StoryViewerItem;
  readonly copy: FriendStoriesCopy;
  readonly reply: StoryViewerReply;
  readonly onOpenChat: (item: StoryViewerItem) => void;
}): ReactNode {
  const sent = reply.sentItem;
  return (
    <>
      {sent === null ? null : (
        <StorySentToast copy={copy} name={sent.name} onOpenChat={() => onOpenChat(sent)} />
      )}
      {reply.typing ? null : (
        <StoryReplyBar
          item={item}
          copy={copy}
          free={reply.freeShown(item)}
          onChip={(text) => reply.send(item, text, "chip")}
        />
      )}
      {/* 장마다 · 보낼 때마다 새로 — 보낸 칸은 비고, 실패한 칸은 글이 남습니다. */}
      <StoryReplyInput
        key={`${item.story.id}:${reply.epoch}`}
        name={item.name}
        copy={copy}
        sending={reply.sending}
        error={reply.error}
        onFocusChange={reply.setTyping}
        onSend={(text) => reply.send(item, text, "typed")}
        onEdit={reply.edit}
        onKeyboardHeight={reply.measure}
      />
    </>
  );
}
