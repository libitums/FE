import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import { useUiCopy } from "../../lib/ui-copy";
import type { ChatRoomSummary } from "./chat-source.contract";
import { hasFriendsOf } from "./my-stories";
import type { MyStory, MyStoryReaction } from "./my-stories.contract";
import { withLatestMine } from "./my-story-live";
import { myViewerItemsOf } from "./my-story-viewer";
import { faceFrom, useMyStoryDelete } from "./use-my-story-delete";
import { StoryViewer } from "./StoryViewer";

const NO_REPLY = async () => ({ kind: "failed" as const, reason: "failed" as const });
const NOTHING = () => undefined;

/**
 * 목록의 「Your story」 · 막 올린 것, 설정 › My stories의 칸을 친구 스토리와 같은 전체 화면 보기로(ADR-0194 개정 ⟨보기⟩, 시안 34 ~ 36번) — 살아 있는 내 스토리를
 * 오래된 것부터 장으로, 시작은 연 스토리. 답장 칸 대신 아래 바(본 친구 · 새 스토리 · 지우기) · 새 답 줄 · 답 목록 시트. 장 목록은 열 때 한
 * 번 정합니다(보는 동안 지우면 닫힘). 지우기 확인 상자는 설정 보기와 같은 것(`useMyStoryDelete`).
 */
export function MyStoryFullOpen({
  stories,
  openedId,
  now,
  rooms,
  romanization,
  remove,
  onShown,
  onOpenChat,
  onCreate,
  onFindFriends,
  onDeleted,
  onClose,
  photoUrl,
}: {
  readonly stories: readonly MyStory[];
  readonly openedId: string;
  readonly now: number;
  readonly rooms: readonly ChatRoomSummary[];
  readonly romanization: boolean;
  readonly remove: (storyId: string) => Promise<boolean>;
  /** 장이 설 때마다 — 그 스토리의 반응을 본 것으로. */
  readonly onShown: (story: MyStory) => void;
  readonly onOpenChat: (reaction: MyStoryReaction) => void;
  /** 「+」 — 없으면(설정 › My stories) 단추가 없습니다. */
  readonly onCreate?: () => void;
  readonly onFindFriends?: () => void;
  readonly onDeleted: (storyId: string) => void;
  readonly onClose: () => void;
  readonly photoUrl?: (imagePath: string) => Promise<string | null>;
}): ReactNode {
  const name = useUiCopy().messengerChat.myStories.viewer.yourStory;
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  const [opened] = useState(() => myViewerItemsOf(stories, openedId, now, name));
  const removal = useMyStoryDelete({ rooms, remove, onDeleted });
  if (opened === null) return null;
  return (
    <>
      <StoryViewer
        // 장 순서는 열 때 그대로, Seen by · 답은 다시 읽은 지금 것(개정 ⟨살아 있는 보기⟩).
        items={withLatestMine(opened.items, stories)}
        start={opened.start}
        now={now}
        reducedMotion={reducedMotion}
        romanization={romanization}
        keyboardHeight={0}
        covered={removal.open}
        onShown={(item) => {
          if (item.mine !== undefined) onShown(item.mine);
        }}
        onReply={NO_REPLY}
        onOpenChat={NOTHING}
        onSaveWord={NOTHING}
        onMeet={NOTHING}
        onProfile={NOTHING}
        onClose={onClose}
        mine={{
          face: faceFrom(rooms),
          hasFriends: hasFriendsOf(rooms),
          onOpenChat,
          ...(onCreate === undefined ? {} : { onCreate }),
          onDelete: removal.ask,
          ...(onFindFriends === undefined ? {} : { onFindFriends }),
          ...(photoUrl === undefined ? {} : { photoUrl }),
        }}
      />
      {removal.dialog}
    </>
  );
}
