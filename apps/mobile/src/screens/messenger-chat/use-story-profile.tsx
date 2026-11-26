// 스토리 보기 위 아바타 → 인물 프로필 시트(ADR-0178) — 새 시트 없이 추천 친구 프로필 시트(`SuggestedFriendSheet`)를 다시 씁니다.
// 안 만난 친구는 추천 친구 상태가 시트 · 추가 길을 그대로 지고(`openFriend`), 이미 친구(열린 방)는 여기서 같은 시트를 세워
// 「Start chatting」 = 보기를 닫고 그 방입니다.

import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { FriendProfile } from "./friend-catalog.contract";
import type { StoryViewerItem } from "./friend-stories.contract";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import { modelOfMetFriend } from "./suggested-friends-ui";
import type { SuggestedFriendsUi } from "./suggested-friends-ui";
import { SuggestedFriendSheet } from "./SuggestedFriendSheet";

export type StoryProfileUi = {
  /** 그 장 인물의 프로필 시트를 엽니다. */
  readonly open: (item: StoryViewerItem) => void;
  /** 안 만난 친구 만나기(지금 판정으로 다시 묻기 · 시트 · 추가) — 친구가 되면 `onMet`(#608). */
  readonly meet: (item: StoryViewerItem) => void;
  /** 이미 친구의 시트 — 보기 층 위에 둡니다. */
  readonly layer: ReactNode;
  /** 이미 친구의 시트가 떠 있는가(보기를 덮음). 안 만난 친구의 시트는 추천 친구 상태의 `layerOpen`이 알립니다. */
  readonly covering: boolean;
};

export function useStoryProfile({
  suggested,
  profileOf,
  onChat,
  onMet,
  now,
}: {
  readonly suggested: SuggestedFriendsUi;
  /** 카탈로그의 그 인물 — 없으면 null(시트는 이름 · 얼굴만). */
  readonly profileOf: (characterId: string) => FriendProfile | null;
  /** 이미 친구 시트의 「Start chatting」 — 보기를 닫고 그 방으로. */
  readonly onChat: (characterId: string) => void;
  /** 안 만난 친구가 친구가 된 뒤(추가 · 먼저 만나기 · 이미 친구) — 보기에 남아 그 인물의 장을 친구 장(답장 칸)으로. */
  readonly onMet: (item: StoryViewerItem) => void;
  /** 시트의 기준 시각 — 보기와 같은 값(목록 렌더의 `now`). */
  readonly now: number;
}): StoryProfileUi {
  const [sheet, setSheet] = useState<SuggestedFriendSheetModel | null>(null);

  function open(item: StoryViewerItem) {
    "background only";
    // 잠긴 안 만난 친구는 지금 판정으로 다시 묻고 먼저 만나기 뒤 보기를 닫습니다(#608). 추가할 수 있는 친구는 시트(Start chatting)부터.
    if (item.unmet !== null)
      return item.unmet.status === "addable"
        ? suggested.openFriend(item.unmet, "story_viewer", () => onMet(item))
        : meet(item);
    const { characterId } = item.story;
    const who = { id: characterId, name: item.name, avatarUrl: item.avatarUrl };
    return setSheet(modelOfMetFriend(profileOf(characterId), who));
  }

  function meet(item: StoryViewerItem) {
    "background only";
    if (item.unmet !== null) suggested.meet(item.unmet, () => onMet(item));
  }

  return {
    open,
    meet,
    covering: sheet !== null,
    layer:
      sheet === null ? null : (
        <SuggestedFriendSheet
          model={sheet}
          now={now}
          // 목록 시트와 같은 견본 주소 · 로마자(ADR-0198) — 빠지면 Hear voice가 늘 못 읽음이었습니다(2026-11-26 보고).
          {...suggested.sheetView(sheet)}
          onStart={() => {
            setSheet(null);
            onChat(sheet.character.id);
          }}
          onEarly={() => undefined}
          onClose={() => setSheet(null)}
        />
      ),
  };
}
