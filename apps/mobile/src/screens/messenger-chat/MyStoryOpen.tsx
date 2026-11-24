import { useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { ChatRoomSummary } from "./chat-source.contract";
import type { MyStory, MyStoryReaction, ReactionFace } from "./my-stories.contract";
import { MyStoryDeleteDialog } from "./MyStoryDialogs";
import { MyStoryViewer } from "./MyStoryViewer";

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
 * 내 스토리 보기 + 지우기 확인(ADR-0179) — 목록(「Your story」 · 막 올린 것)과 설정 › My stories가 함께 씁니다. 지우기는 서버가 끝난 뒤
 * `onDeleted`(닫힘은 부르는 쪽), 못 지우면 확인 상자에 까닭을 두고 다시 시도합니다.
 */
export function MyStoryOpen({
  story,
  now,
  rooms,
  remove,
  onAnswer,
  onDeleted,
  onClose,
}: {
  readonly story: MyStory;
  readonly now: number;
  readonly rooms: readonly ChatRoomSummary[];
  readonly remove: (storyId: string) => Promise<boolean>;
  readonly onAnswer: (reaction: MyStoryReaction) => void;
  readonly onDeleted: (storyId: string) => void;
  readonly onClose: () => void;
}): ReactNode {
  const [confirm, setConfirm] = useState<"ask" | "failed" | null>(null);
  // 두 번 탭해도 지우기는 한 번(감사 A10) — 상태는 다음 렌더까지 안 바뀌어 ref로 막습니다.
  const busy = useRef(false);
  const face = faceFrom(rooms);
  const replies = story.reactions.filter((r) => face(r.characterId) !== null).length;

  async function handleConfirm() {
    "background only";
    if (busy.current) return;
    busy.current = true;
    const ok = await remove(story.id);
    busy.current = false;
    if (!ok) return setConfirm("failed");
    setConfirm(null);
    onDeleted(story.id);
  }

  return (
    <>
      <MyStoryViewer
        story={story}
        now={now}
        face={face}
        onAnswer={onAnswer}
        onDelete={() => setConfirm("ask")}
        onClose={onClose}
        covered={confirm !== null}
      />
      {confirm === null ? null : (
        <MyStoryDeleteDialog
          replies={replies}
          failed={confirm === "failed"}
          onConfirm={() => void handleConfirm()}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
