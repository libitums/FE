// 스토리 보기 아래의 내 친구 답장 묶음(ADR-0178 D5 개정) — 무료 안내 · 칩(입력 중엔 숨김) → 답장 칸. 「Sent · Open chat」 알림은
// 장 · 인물을 넘겨도 남도록 보기 단위(`StoryViewerSent`)로 따로 섭니다.

import type { ReactNode } from "@lynx-js/react";

import type { FriendStoriesCopy, StoryViewerItem } from "./friend-stories.contract";
import { StoryReplyInput, StorySentToast } from "./StoryReplyInput";
import { StoryReplyBar } from "./StoryViewerParts";
import type { StoryViewerReply } from "./use-story-viewer-reply";

export function StoryReplyArea({
  item,
  copy,
  reply,
}: {
  readonly item: StoryViewerItem;
  readonly copy: FriendStoriesCopy;
  readonly reply: StoryViewerReply;
}): ReactNode {
  return (
    <>
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

/** 「Sent · Open chat」 — 보기 단위 알림. 넘김과 무관하게 같은 자리에 3초 떠 있고, Open chat은 보낸 그 인물의 방입니다. */
export function StoryViewerSent({
  copy,
  reply,
  onOpenChat,
}: {
  readonly copy: FriendStoriesCopy;
  readonly reply: StoryViewerReply;
  readonly onOpenChat: (item: StoryViewerItem) => void;
}): ReactNode {
  const sent = reply.sentItem;
  if (sent === null) return null;
  return <StorySentToast copy={copy} name={sent.name} onOpenChat={() => onOpenChat(sent)} />;
}
