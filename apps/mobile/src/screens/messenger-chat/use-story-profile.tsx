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
  /** 이미 친구의 시트 — 보기 층 위에 둡니다. */
  readonly layer: ReactNode;
  /** 이미 친구의 시트가 떠 있는가(보기를 덮음). 안 만난 친구의 시트는 추천 친구 상태의 `layerOpen`이 알립니다. */
  readonly covering: boolean;
};

export function useStoryProfile({
  suggested,
  profileOf,
  onChat,
  now,
}: {
  readonly suggested: SuggestedFriendsUi;
  /** 카탈로그의 그 인물 — 없으면 null(시트는 이름 · 얼굴만). */
  readonly profileOf: (characterId: string) => FriendProfile | null;
  /** 이미 친구 시트의 「Start chatting」 — 보기를 닫고 그 방으로. */
  readonly onChat: (characterId: string) => void;
  /** 시트의 기준 시각 — 보기와 같은 값(목록 렌더의 `now`). */
  readonly now: number;
}): StoryProfileUi {
  const [sheet, setSheet] = useState<SuggestedFriendSheetModel | null>(null);

  function open(item: StoryViewerItem) {
    "background only";
    if (item.unmet !== null) return suggested.openFriend(item.unmet, "story_viewer");
    const { characterId } = item.story;
    const who = { id: characterId, name: item.name, avatarUrl: item.avatarUrl };
    return setSheet(modelOfMetFriend(profileOf(characterId), who));
  }

  return {
    open,
    covering: sheet !== null,
    layer:
      sheet === null ? null : (
        <SuggestedFriendSheet
          model={sheet}
          now={now}
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
