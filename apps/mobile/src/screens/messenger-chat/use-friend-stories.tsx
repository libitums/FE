// 목록 화면의 친구 스토리 상태(ADR-0178) — 읽기 · 줄 · 보기 · 본 것 표시 · 답장 넘김 · 이벤트를 한곳에서 잇습니다. 판정은 순수 모듈이 집니다.

import { useEffect, useGlobalProps, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import { useChatEvents } from "./chat-events";
import type { ChatRoomSummary, ChatSource } from "./chat-source.contract";
import type { CoinWallet } from "./coin-wallet";
import { emptyKeyboardHeightStore } from "./keyboard-ports";
import {
  listStoryOf,
  storiesAfterLoad,
  storyRowOf,
  viewerItemsOf,
  type ViewerOpen,
} from "./friend-stories";
import type {
  FriendStoriesPort,
  FriendStory,
  StoryCloseReason,
  StoryViewerItem,
} from "./friend-stories.contract";
import { FriendStoriesRow } from "./FriendStoriesRow";
import {
  putStoryReplyHandoff,
  subscribePendingStoryOpen,
  takePendingStoryOpen,
} from "./story-reply-handoff";
import { StoryViewer } from "./StoryViewer";
import { usePhoneKeyboardHeight } from "./use-phone-keyboard-height";
import { useStoryInlineReply } from "./use-story-inline-reply";
import { screenHeightFrom } from "../../lib/learning-density";
import { safeAreaInsetsFrom } from "../../lib/safe-area";
import type { StoryRowStats } from "./use-row-impressions";
import { useMyStories } from "./use-my-stories";
import { useStoryToastLink } from "./reply-toast-presence";
import { useStoryReload } from "./use-story-reload";
import type { SuggestedFriendsUi } from "./use-suggested-friends";

export type FriendStoriesUi = {
  /** 스토리 줄 — 스토리가 하나도 없으면(읽기 전 · 못 읽음 · 빈 목록 · 포트 없음) null이고 목록은 추천 줄을 씁니다(D2). */
  readonly row: ReactNode;
  /** 줄이 서면 칸 수 · 안 본 수(노출 이벤트 — 목록 화면이 셉니다, 감사 A5), 아니면 null. */
  readonly rowStats: StoryRowStats | null;
  /** 첫 읽기가 아직 안 끝났는가 — 그동안 추천 줄 노출을 세지 않습니다(곧 스토리 줄로 바뀔 수 있어서, 감사 A5). */
  readonly rowPending: boolean;
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
  source,
  wallet,
  onShortOfCoins,
}: {
  readonly port: FriendStoriesPort | undefined;
  readonly rooms: readonly ChatRoomSummary[];
  readonly suggested: SuggestedFriendsUi;
  /** 엽전 상점 · 추천 시트 · 성인 확인이 위에 떠 있는가 — 그동안 보기를 멈추고 낭독에서 가립니다. */
  readonly covered: boolean;
  readonly onOpenRoom: (roomId: string) => void;
  /** 보기에서 바로 보내는 답장(D5 개정) — 대화 출처 · 엽전 지갑 · 엽전 부족이면 상점. */
  readonly source: ChatSource;
  readonly wallet: CoinWallet;
  readonly onShortOfCoins: () => void;
}): FriendStoriesUi {
  const { emit } = useChatEvents();
  const [stories, setStories] = useState<readonly FriendStory[] | null>(null);
  // 읽기가 끝난 횟수 — 알림으로 들어오면 다시 읽고(목록이 선 뒤에 올라온 스토리), 끝난 뒤 그 스토리를 엽니다(리뷰 m1).
  const [loadCount, setLoadCount] = useState(0);
  const [, setSeenVersion] = useState(0);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [pendingVersion, setPendingVersion] = useState(0);
  useEffect(() => subscribePendingStoryOpen(() => setPendingVersion((value) => value + 1)), []);
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  const inline = useStoryInlineReply({
    source,
    rooms,
    wallet,
    plan: port?.replyPlan,
    onShortOfCoins,
  });
  // 답장 칸의 키보드 높이 — 대화방 입력 줄과 같은 규칙(잰 값 → 기기에 남은 값 → 화면 표).
  const keyboard = usePhoneKeyboardHeight(
    port?.keyboardHeightStore ?? emptyKeyboardHeightStore,
    screenHeightFrom(typeof SystemInfo === "undefined" ? undefined : SystemInfo),
    safeAreaInsetsFrom(useGlobalProps()).bottom,
  );

  // 목록 마운트마다 한 번 읽습니다 — 포트 객체가 렌더마다 같아도(결선이 같은 객체를 줌) 그때의 함수를 씁니다(추천 친구 리뷰 #503과 같은 꼴).
  const loadRef = useRef(port?.load ?? null);
  loadRef.current = port?.load ?? null;
  const hasLoader = loadRef.current !== null;
  // 다시 읽기(앱이 앞으로 옴 · 5분마다, ADR-0178 「다시 읽기」) — 보기가 열려 있으면 보류했다가 닫은 뒤 반영합니다.
  const reload = useStoryReload({ port, viewerOpen: viewer !== null, setStories });
  useEffect(() => {
    const load = loadRef.current;
    if (load === null) return undefined;
    let live = true;
    void load()
      .catch(() => null)
      .then((list) => {
        if (!live) return;
        reload.dropHeld();
        setStories((previous) => storiesAfterLoad(previous, list));
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
  // 내 스토리(ADR-0194) — 켜져 있으면 친구 스토리가 없어도 줄이 섭니다(맨 앞 「+」).
  const mine = useMyStories({
    port: port?.mine,
    rooms,
    onOpenRoom,
    onFindFriends: suggested.openDirectory,
  });
  const toastShown = useStoryToastLink(viewer !== null || mine.layerOpen); // 답장 토스트가 떠 있으면 멈춤(ADR-0200)
  const imageUrl = (path: string) => port?.imageUrl(path) ?? null;

  const open = (opened: ViewerOpen): boolean => {
    const result = viewerItemsOf(row, opened, imageUrl);
    if (result === null) return false;
    setViewer({ ...result, from: fromOf(opened) });
    return true;
  };

  // 알림(`story: true`)으로 들어왔으면 읽기가 끝난 뒤 그 인물의 스토리를, 없으면 열린 방을 엽니다(D7).
  useEffect(() => {
    if (loadCount === 0 && port !== undefined) return;
    const characterId = takePendingStoryOpen();
    if (characterId === null) return;
    if (open({ from: "push", characterId })) return;
    const room = rooms.find((each) => each.counterpart.id === characterId);
    if (room !== undefined && room.access.kind === "open") onOpenRoom(room.roomId);
  }, [loadCount, port === undefined ? pendingVersion : -1]);

  // 보기 한 번의 장 기록 — 닫힐 때 `friend_story_closed` 한 번(감사 A4).
  const session = useRef({ shown: new Set<string>(), skipped: 0 });
  const close = (reason: StoryCloseReason | "replied") => {
    if (viewer !== null)
      emit({
        name: "friend_story_closed",
        surface: "chat",
        shown: String(session.current.shown.size),
        total: String(viewer.items.length),
        skipped: String(session.current.skipped),
        reason,
      });
    session.current = { shown: new Set(), skipped: 0 };
    setViewer(null);
  };

  function handleShown(item: StoryViewerItem) {
    "background only";
    port?.seen.markSeen(item.story.id, item.story.expiresAt, Date.now());
    setSeenVersion((version) => version + 1);
    session.current.shown.add(item.story.id);
    const items = viewer?.items ?? [];
    emit({
      name: "friend_story_viewed",
      surface: "chat",
      characterId: item.story.characterId,
      met: item.unmet === null,
      from: viewer?.from ?? "row",
      index: String(items.indexOf(item) + 1),
      total: String(items.length),
    });
  }

  // 안 만난 친구 추가 뒤 — 방을 열고 입력 줄 위 인용 띠(D5).
  const handOff = (item: StoryViewerItem) => {
    // 방금 추가한 방은 이 렌더의 방 목록에서 아직 잠겨 있을 수 있어 열림을 보지 않습니다.
    const roomId =
      rooms.find((room) => room.counterpart.id === item.story.characterId)?.roomId ?? null;
    if (roomId === null) return;
    putStoryReplyHandoff({
      roomId,
      text: null,
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

  // 「Sent」 알림의 Open chat — 보기를 닫고 그 방으로(보낸 글은 이미 방에 있습니다).
  function handleOpenChat(item: StoryViewerItem) {
    "background only";
    const roomId = inline.roomIdOf(item.story.characterId);
    close("replied");
    if (roomId !== null) onOpenRoom(roomId);
  }

  function handleMeet(item: StoryViewerItem) {
    "background only";
    const friend = item.unmet;
    if (friend === null) return;
    suggested.meet(friend, () => {
      close("replied");
      handOff(item);
    });
  }

  return {
    rowPending: (port !== undefined && loadCount === 0) || mine.loading,
    rowStats:
      hasStories || mine.slot !== null
        ? {
            count: row.friends.length + row.unmet.length,
            unseen: row.friends.filter((entry) => !entry.seen).length,
            mine: mine.slot !== null,
          }
        : null,
    row:
      !hasStories && mine.slot === null ? null : (
        <FriendStoriesRow
          row={row}
          mine={mine.slot}
          now={now}
          onOpenFriend={(entry) => open({ from: "friend", characterId: entry.story.characterId })}
          onOpenUnmet={(entry) => open({ from: "unmet", characterId: entry.story.characterId })}
          onOpenSuggested={(friend) => suggested.openFriend(friend, "story_row")}
          onWatchAll={() => open({ from: "watch_all" })}
          onFindFriends={suggested.openDirectory}
        />
      ),
    layer:
      viewer === null ? (
        mine.layer
      ) : (
        <StoryViewer
          items={viewer.items}
          start={viewer.start}
          now={now}
          reducedMotion={reducedMotion}
          romanization={port?.romanization?.() ?? true}
          {...(port?.words === undefined ? {} : { words: port.words })}
          covered={covered}
          held={toastShown}
          onShown={handleShown}
          onReply={inline.reply}
          onOpenChat={handleOpenChat}
          keyboardHeight={keyboard.height}
          onKeyboardHeight={keyboard.measure}
          onSaveWord={(item) =>
            emit({
              name: "friend_story_word_saved",
              surface: "chat",
              characterId: item.story.characterId,
            })
          }
          onMeet={handleMeet}
          onClose={close}
          onSkip={() => {
            session.current.skipped += 1;
          }}
        />
      ),
    layerOpen: viewer !== null || mine.layerOpen,
    listStory: (characterId) => (port === undefined ? null : listStoryOf(row, characterId)),
    openFromList: (characterId) => {
      open({ from: "list", characterId });
    },
  };
}
