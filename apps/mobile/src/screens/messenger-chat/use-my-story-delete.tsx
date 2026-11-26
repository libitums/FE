import { useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { ChatRoomSummary } from "./chat-source.contract";
import type { MyStory, ReactionFace } from "./my-stories.contract";
import { MyStoryDeleteDialog } from "./MyStoryDialogs";

/** 대화 스냅숏의 방에서 반응한 인물의 이름 · 얼굴 — 방이 없으면 null. */
export function faceFrom(rooms: readonly ChatRoomSummary[]) {
  return (characterId: string): ReactionFace | null => {
    const room = rooms.find((each) => each.counterpart.id === characterId);
    return room === undefined
      ? null
      : { name: room.counterpart.name, avatarUrl: room.counterpart.avatarUrl };
  };
}

/**
 * 지우기 확인 상자(ADR-0194) — `ask(story)`로 띄우고, 서버가 끝나면 `onDeleted`(닫힘은 부르는 쪽), 못 지우면 상자에 까닭을 두고 다시 시도합니다.
 * 두 번 탭해도 지우기는 한 번(감사 A10) — 상태는 다음 렌더까지 안 바뀌어 ref로 막습니다. 목록 · 설정의 전체 화면 보기가 씁니다.
 */
export function useMyStoryDelete({
  rooms,
  remove,
  onDeleted,
}: {
  readonly rooms: readonly ChatRoomSummary[];
  readonly remove: (storyId: string) => Promise<boolean>;
  readonly onDeleted: (storyId: string) => void;
}): { readonly ask: (story: MyStory) => void; readonly open: boolean; readonly dialog: ReactNode } {
  const [confirm, setConfirm] = useState<{ story: MyStory; failed: boolean } | null>(null);
  const busy = useRef(false);
  const face = faceFrom(rooms);

  async function handleConfirm(story: MyStory) {
    "background only";
    if (busy.current) return;
    busy.current = true;
    const ok = await remove(story.id);
    busy.current = false;
    if (!ok) return setConfirm({ story, failed: true });
    setConfirm(null);
    onDeleted(story.id);
  }

  return {
    ask: (story) => setConfirm({ story, failed: false }),
    open: confirm !== null,
    dialog:
      confirm === null ? null : (
        <MyStoryDeleteDialog
          replies={confirm.story.reactions.filter((r) => face(r.characterId) !== null).length}
          failed={confirm.failed}
          onConfirm={() => void handleConfirm(confirm.story)}
          onCancel={() => setConfirm(null)}
        />
      ),
  };
}
