// 목록 화면의 친구 스토리 상태(ADR-0177) — 읽기 · 줄 · 보기 · 본 것 표시 · 답장 넘김 · 이벤트를 한곳에서 잇습니다. 판정은 순수 모듈이 집니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import { useChatEvents } from "./chat-events";
import type { ChatRoomSummary } from "./chat-source.contract";
import { listStoryOf, storyRowOf, viewerItemsOf, type ViewerOpen } from "./friend-stories";
import type { FriendStoriesPort, FriendStory, StoryViewerItem } from "./friend-stories.contract";
import { FriendStoriesRow } from "./FriendStoriesRow";
import {
  putStoryReplyHandoff,
  subscribePendingStoryOpen,
  takePendingStoryOpen,
} from "./story-reply-handoff";
import { StoryViewer } from "./StoryViewer";
import type { SuggestedFriendsUi } from "./use-suggested-friends";

export type FriendStoriesUi = {
  /** 스토리 줄 — 스토리가 하나도 없으면(읽기 전 · 못 읽음 · 빈 목록 · 포트 없음) null이고 목록은 추천 줄을 씁니다(D2). */
  readonly row: ReactNode;
  /** 보기 층 — 스크롤 밖에 둡니다. */
  readonly layer: ReactNode;
  readonly layerOpen: boolean;
  /** 채팅 목록 줄의 「New story」 — 그 인물의 안 본 친구 스토리 한 줄, 없으면 null(D3). */
  readonly listStory: (characterId: string) => FriendStory | null;
  /** 채팅 목록 줄에서 스토리를 엽니다. */
  readonly openFromList: (characterId: string) => void;
};

type Viewer = {
  readonly items: readonly StoryViewerItem[];
  readonly start: number;
  readonly from: "row" | "list" | "watch_all" | "push";
};

const fromOf = (open: ViewerOpen): Viewer["from"] =>
  open.from === "friend" || open.from === "unmet" ? "row" : open.from;

export function useFriendStories({
  port,
  rooms,
  suggested,
  covered,
  onOpenRoom,
}: {
  readonly port: FriendStoriesPort | undefined;
  readonly rooms: readonly ChatRoomSummary[];
  readonly suggested: SuggestedFriendsUi;
  /** 엽전 상점 · 추천 시트 · 성인 확인이 위에 떠 있는가 — 그동안 보기를 멈추고 낭독에서 가립니다. */
  readonly covered: boolean;
  readonly onOpenRoom: (roomId: string) => void;
}): FriendStoriesUi {
  const { emit } = useChatEvents();
  const [stories, setStories] = useState<readonly FriendStory[] | null>(null);
  // 읽기가 끝난 횟수 — 알림으로 들어오면 다시 읽고(목록이 선 뒤에 올라온 스토리), 끝난 뒤 그 스토리를 엽니다(리뷰 m1).
  const [loadCount, setLoadCount] = useState(0);
  const [, setSeenVersion] = useState(0);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [pendingVersion, setPendingVersion] = useState(0);
  useEffect(() => subscribePendingStoryOpen(() => setPendingVersion((value) => value + 1)), []);
  const rowViewedSent = useRef(false);
  const reducedMotion = resolveReducedMotion(undefined, useMotion());

  // 목록 마운트마다 한 번 읽습니다 — 포트 객체가 렌더마다 같아도(결선이 같은 객체를 줌) 그때의 함수를 씁니다(추천 친구 리뷰 #503과 같은 꼴).
  const loadRef = useRef(port?.load ?? null);
  loadRef.current = port?.load ?? null;
  const hasLoader = loadRef.current !== null;
  useEffect(() => {
    const load = loadRef.current;
    if (load === null) return undefined;
    let live = true;
    void load()
      .catch(() => null)
      .then((list) => {
        if (!live) return;
        setStories(list);
        setLoadCount((count) => count + 1);
      });
    return () => {
      live = false;
    };
  }, [hasLoader, pendingVersion]);

  const now = Date.now();
  const seen = port?.seen.seenIds() ?? new Set<string>();
  const row = storyRowOf({ stories: stories ?? [], rooms, suggested: suggested.all, seen, now });
  const hasStories = port !== undefined && row.friends.length + row.unmet.length > 0;
  const imageUrl = (path: string) => port?.imageUrl(path) ?? null;

  const roomIdOf = (characterId: string): string | null =>
    rooms.find((room) => room.counterpart.id === characterId)?.roomId ?? null;

  const open = (opened: ViewerOpen): boolean => {
    const result = viewerItemsOf(row, opened, imageUrl);
    if (result === null) return false;
    setViewer({ ...result, from: fromOf(opened) });
    return true;
  };

  // 스토리 줄이 처음 보일 때 목록 마운트당 한 번(제품 이벤트 — 효과에서 보냄).
  const unseenCount = row.friends.filter((entry) => !entry.seen).length;
  useEffect(() => {
    if (rowViewedSent.current || !hasStories) return;
    rowViewedSent.current = true;
    emit({
      name: "friend_story_row_viewed",
      surface: "chat",
      count: String(row.friends.length + row.unmet.length),
      unseen: String(unseenCount),
    });
  }, [hasStories]);

  // 알림(`story: true`)으로 들어왔으면 읽기가 끝난 뒤 그 인물의 스토리를, 없으면 열린 방을 엽니다(D7).
  useEffect(() => {
    if (loadCount === 0 && port !== undefined) return;
    const characterId = takePendingStoryOpen();
    if (characterId === null) return;
    if (open({ from: "push", characterId })) return;
    const room = rooms.find((each) => each.counterpart.id === characterId);
    if (room !== undefined && room.access.kind === "open") onOpenRoom(room.roomId);
  }, [loadCount, port === undefined ? pendingVersion : -1]);

  const close = () => setViewer(null);

  function handleShown(item: StoryViewerItem) {
    "background only";
    port?.seen.markSeen(item.story.id, item.story.expiresAt, Date.now());
    setSeenVersion((version) => version + 1);
    emit({
      name: "friend_story_viewed",
      surface: "chat",
      characterId: item.story.characterId,
      met: item.unmet === null ? "yes" : "no",
      from: viewer?.from ?? "row",
    });
  }

  const handOff = (item: StoryViewerItem, text: string | null) => {
    const roomId = roomIdOf(item.story.characterId);
    if (roomId === null) return;
    putStoryReplyHandoff({
      roomId,
      text,
      free: item.story.freeReply,
      quote: {
        storyId: item.story.id,
        characterId: item.story.characterId,
        line: item.story.line.ko,
        imagePath: item.story.imagePath,
        postedAt: item.story.postedAt,
      },
    });
    onOpenRoom(roomId);
  };

  function handleReply(item: StoryViewerItem, text: string | null) {
    "background only";
    close();
    handOff(item, text);
  }

  function handleMeet(item: StoryViewerItem) {
    "background only";
    const friend = item.unmet;
    if (friend === null) return;
    suggested.meet(friend, () => {
      close();
      handOff(item, null);
    });
  }

  return {
    row: !hasStories ? null : (
      <FriendStoriesRow
        row={row}
        now={now}
        onOpenFriend={(entry) => open({ from: "friend", characterId: entry.story.characterId })}
        onOpenUnmet={(entry) => open({ from: "unmet", characterId: entry.story.characterId })}
        onOpenSuggested={(friend) => suggested.openFriend(friend, "story")}
        onWatchAll={() => open({ from: "watch_all" })}
        onFindFriends={suggested.openDirectory}
      />
    ),
    layer:
      viewer === null ? null : (
        <StoryViewer
          items={viewer.items}
          start={viewer.start}
          now={now}
          reducedMotion={reducedMotion}
          romanization={port?.romanization?.() ?? true}
          {...(port?.words === undefined ? {} : { words: port.words })}
          covered={covered}
          onShown={handleShown}
          onReply={handleReply}
          onSaveWord={(item) =>
            emit({
              name: "friend_story_word_saved",
              surface: "chat",
              characterId: item.story.characterId,
            })
          }
          onMeet={handleMeet}
          onClose={close}
        />
      ),
    layerOpen: viewer !== null,
    listStory: (characterId) => (port === undefined ? null : listStoryOf(row, characterId)),
    openFromList: (characterId) => {
      open({ from: "list", characterId });
    },
  };
}
