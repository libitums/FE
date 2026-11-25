// 친구 스토리의 화면 사이 넘김입니다(ADR-0178 D5 · D7). 대화방은 방 id만 받으므로(nav 상태를 늘리지 않음) 보기 → 대화방의 답장과
// 알림 → 목록의 「이 인물 스토리 열기」를 앱 프로세스 안 한 칸에 남기고, 받는 화면이 마운트 때 한 번 꺼냅니다(꺼내면 비웁니다).

import type { StoryReplyHandoff, StoryViewerItem } from "./friend-stories.contract";

let replyHandoff: StoryReplyHandoff | null = null;
let pendingOpen: string | null = null;
const pendingListeners = new Set<() => void>();

/** 보기가 방을 열기 직전에 남깁니다 — 앞에 남은 것이 있으면 바꿉니다. */
export function putStoryReplyHandoff(handoff: StoryReplyHandoff): void {
  replyHandoff = handoff;
}

/** 보기의 그 장을 그 방 입력 줄 위 인용 띠로 남깁니다(D5 — 안 만난 친구 추가 뒤). */
export function putStoryQuoteHandoff(item: StoryViewerItem, roomId: string): void {
  const { story } = item;
  putStoryReplyHandoff({
    roomId,
    text: null,
    free: story.freeReply,
    quote: {
      storyId: story.id,
      characterId: story.characterId,
      line: story.line.ko,
      imagePath: story.imagePath,
      postedAt: story.postedAt,
    },
  });
}

/** 그 방의 넘김이면 꺼내고 비웁니다. 다른 방 것이면 null(남겨 둠 — 그 방이 열릴 때). */
export function takeStoryReplyHandoff(roomId: string): StoryReplyHandoff | null {
  if (replyHandoff === null || replyHandoff.roomId !== roomId) return null;
  const handoff = replyHandoff;
  replyHandoff = null;
  return handoff;
}

/** 알림 `story: true`를 누름 — 메신저 목록이 스토리를 읽은 뒤 그 인물의 스토리를 엽니다. */
export function putPendingStoryOpen(characterId: string): void {
  pendingOpen = characterId;
  // 메신저 목록이 이미 서 있으면(탭 유지 — ADR-0106) 마운트 효과가 다시 돌지 않으니 알려 줍니다.
  for (const listener of pendingListeners) listener();
}

/** 알림으로 스토리 열기가 남았을 때 부를 함수를 등록합니다. 돌려주는 함수로 풉니다. */
export function subscribePendingStoryOpen(listener: () => void): () => void {
  pendingListeners.add(listener);
  return () => {
    pendingListeners.delete(listener);
  };
}

export function takePendingStoryOpen(): string | null {
  const characterId = pendingOpen;
  pendingOpen = null;
  return characterId;
}
