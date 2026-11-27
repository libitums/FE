// 목록 화면의 내 스토리 상태(ADR-0194 · ADR-0191) — 읽기 · 「+」/「Your story」 칸 · 올리기 창 · 처음 안내 · 만들기 · 보기 · Open chat ·
// 지우기 · 이벤트를 잇습니다. 판정은 순수 모듈(`my-stories.ts`)이 집니다. 포트가 없거나 서버가 꺼져 있으면 칸도 층도 없습니다.

import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import type { ChatRoomSummary } from "./chat-source.contract";
import { mineRingOf, nextOpenOf, openReactionChat, unseenReactionIdsOf } from "./my-stories";
import type {
  MineRowSlot,
  MyStoriesPort,
  MyStoriesState,
  MyStory,
  MyStoryWindow,
} from "./my-stories.contract";
import { editorCapsOf, photoEditorCaps } from "./my-story-editor";
import type { PickedPhoto, StoryPhotoSource } from "./my-story-photo.contract";
import { useMyStoryLive } from "./use-my-story-live";
import { useStoryShare } from "./use-story-share";
import { useKeepShown } from "./use-story-row-memory";
import { MyStoryEditor } from "./MyStoryEditor";
import { MyStoryStartSheet } from "./MyStoryStartSheet";
import { MyStoryGuide } from "./MyStoryDialogs";
import { MyStoryFullOpen } from "./MyStoryFullOpen";
import { MyStoryWindowSheet } from "./MyStoryWindowSheet";

type View =
  | { readonly kind: "guide" }
  | { readonly kind: "start" }
  /** 바탕 위 편집 — 사진이면 그 사진 위(ADR-0199). */
  | { readonly kind: "editor"; readonly photo: PickedPhoto | null }
  | { readonly kind: "window" }
  | { readonly kind: "viewer"; readonly storyId: string };

export type MyStoriesUi = {
  readonly slot: MineRowSlot | null;
  readonly layer: ReactNode;
  readonly layerOpen: boolean;
  /** 포트는 있는데 첫 읽기가 아직 — 줄 노출 판정이 기다립니다(「+」 칸이 곧 설 수 있어서, 재리뷰 A5). */
  readonly loading: boolean;
};

/** 다음 창의 기기 현지 시각 — 창 문구(「6 PM」)로. */
function useClock() {
  const window = useUiCopy().messengerChat.myStories.window;
  return (at: MyStoryWindow) => {
    const next = new Date(at.nextAt);
    return window.time(next.getHours(), next.getMinutes());
  };
}

export function useMyStories({
  port,
  rooms,
  onOpenRoom,
  onFindFriends,
  romanization = true,
}: {
  readonly port: MyStoriesPort | undefined;
  readonly rooms: readonly ChatRoomSummary[];
  readonly onOpenRoom: (roomId: string) => void;
  /** 친구 0명 안내의 Find friends(시안 17번). */
  readonly onFindFriends?: () => void;
  /** 로마자를 보이는가(전체 화면 보기의 한 줄 카드). */
  readonly romanization?: boolean;
}): MyStoriesUi {
  const { emit } = useChatEvents();
  const copy = useUiCopy().messengerChat.myStories;
  const clockOf = useClock();
  const [state, setState] = useState<MyStoriesState | null>(() => port?.memory?.read() ?? null);
  const [loaded, setLoaded] = useState(() => state !== null);
  useKeepShown(port?.memory, state);
  const [view, setView] = useState<View | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [, setSeenVersion] = useState(0);

  useEffect(() => {
    if (port === undefined) return undefined;
    let live = true;
    void port
      .load()
      .catch(() => null)
      .then((loaded) => {
        if (!live) return;
        setState(loaded);
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [port]);

  const now = Date.now();
  const ring = port === undefined ? null : mineRingOf(state, port.seenReactions(), now);
  const storyOf = (id: string) => state?.stories.find((story) => story.id === id) ?? null;

  /** 그 스토리의 반응을 본 것으로 — 「Your story」 고리가 회색이 됩니다. 본 반응 수를 돌려줍니다. */
  const markSeen = (story: MyStory) => {
    const unseen = port === undefined ? [] : unseenReactionIdsOf(story, port.seenReactions());
    port?.markReactionsSeen(unseen, story.expiresAt);
    setSeenVersion((version) => version + 1);
    return unseen.length;
  };

  const openStory = (story: MyStory, from: "row" | "posted") => {
    const unseen = markSeen(story);
    emit({
      name: "my_story_viewed",
      surface: "chat",
      reactions: String(story.reactions.length),
      unseen: String(unseen),
      from,
    });
    setView({ kind: "viewer", storyId: story.id });
  };

  /** 이번 창을 이미 썼으면 만들기 대신 창 시트(시안 18번) — 다음 창이 열리면 다시 만들기. */
  function handleCreate() {
    "background only";
    if (port === undefined) return;
    if (state?.window != null && nextOpenOf(state.window, Date.now()) !== null)
      return setView({ kind: "window" });
    const first = !port.guideSeen();
    emit({ name: "my_story_create_opened", surface: "chat", first });
    sharing.reset();
    setStartError(null);
    if (first) port.markGuideSeen();
    setView({ kind: first ? "guide" : "start" });
  }

  // 만들기 한 번에 clientId 하나 — 두 번 눌러도(또는 다시 시도해도) 서버가 한 번만 올립니다(`use-story-share.ts`).
  const sharing = useStoryShare({
    port,
    clockOf,
    onWindow: (window) => setState((before) => (before === null ? before : { ...before, window })),
    onPosted: (story, window) => {
      setState((before) => ({
        enabled: true,
        keep: before?.keep ?? true,
        stories: [story, ...(before?.stories ?? []).filter((each) => each.id !== story.id)],
        window: window ?? before?.window ?? null,
        kinds: before?.kinds ?? ["word", "card"],
      }));
      // 올린 사진은 버킷에 있으니 기기 캐시의 파일을 지웁니다.
      if (view?.kind === "editor" && view.photo !== null) port?.photo?.discard(view.photo.path);
      openStory(story, "posted");
    },
  });

  /** 사진 고르기 · 찍기(ADR-0199) — 고르면 그 사진 위 편집, 닫으면 시트에 그대로, 거부 · 실패는 시트에 안내. */
  async function handlePick(source: StoryPhotoSource) {
    "background only";
    const photo = port?.photo;
    if (photo === undefined) return;
    setStartError(null);
    const picked = await photo.pick(source).catch(() => ({ status: "failed" as const }));
    emit({ name: "my_story_photo_picked", surface: "chat", source, outcome: picked.status });
    if (picked.status === "picked") {
      sharing.reset();
      return setView({ kind: "editor", photo: picked.photo });
    }
    if (picked.status === "cancelled") return;
    setStartError(
      picked.status === "denied"
        ? copy.photo.denied
        : picked.status === "unavailable"
          ? copy.photo.unavailable
          : copy.photo.pickFailed,
    );
  }

  const close = () => {
    // 사진 편집을 닫으면 기기 캐시의 그 사진을 지웁니다(올렸어도 — 버킷에 이미 있음).
    if (view?.kind === "editor" && view.photo !== null) port?.photo?.discard(view.photo.path);
    setView(null);
  };
  // 사진 길은 서버가 받고(`kinds`에 photo — 성인 · 스위치) 호스트 모듈이 있을 때만.
  const photoReady = port?.photo !== undefined && (state?.kinds ?? []).includes("photo");
  const viewing = view?.kind === "viewer" ? storyOf(view.storyId) : null;
  // 보기를 연 동안 · 앱이 앞으로 오면 Seen by · 답을 다시 읽어 얹습니다(개정 ⟨살아 있는 보기⟩).
  useMyStoryLive({
    port,
    open: viewing !== null,
    rooms,
    setState,
  });

  const layer =
    port === undefined || view === null ? null : view.kind === "guide" ? (
      <MyStoryGuide
        onStart={() => {
          emit({ name: "my_story_guide_closed", surface: "chat", choice: "start" });
          setView({ kind: "start" });
        }}
        onLater={() => {
          emit({ name: "my_story_guide_closed", surface: "chat", choice: "later" });
          close();
        }}
      />
    ) : view.kind === "window" ? (
      state?.window == null ? null : (
        <MyStoryWindowSheet
          window={state.window}
          stories={state.stories}
          now={now}
          onClose={close}
        />
      )
    ) : view.kind === "start" ? (
      <MyStoryStartSheet
        onBackground={() => {
          sharing.reset();
          setView({ kind: "editor", photo: null });
        }}
        {...(photoReady
          ? {
              onCamera: () => void handlePick("camera"),
              onPhotos: () => void handlePick("library"),
            }
          : {})}
        error={startError}
        onClose={close}
      />
    ) : view.kind === "editor" ? (
      <MyStoryEditor
        caps={
          view.photo === null ? editorCapsOf(state?.kinds ?? ["word", "card"]) : photoEditorCaps
        }
        photo={view.photo}
        choices={port.choices}
        sharing={sharing}
        onShare={(share) => void sharing.share(share, view.photo)}
        // 다른 것을 올리면 다른 요청 — 앞 실패의 clientId를 다시 쓰지 않습니다(리뷰 m4). 거절 판은 사진이 같아 남깁니다.
        onChange={() => {
          if (sharing.rejected === null) sharing.reset();
        }}
        onClose={close}
      />
    ) : viewing === null ? null : (
      <MyStoryFullOpen
        stories={state?.stories ?? [viewing]}
        openedId={viewing.id}
        now={now}
        rooms={rooms}
        romanization={romanization}
        {...(port.photo === undefined ? {} : { photoUrl: port.photo.url })}
        remove={(id) => port.remove(id)}
        onShown={markSeen}
        onCreate={handleCreate}
        onOpenChat={(reaction) => {
          if (!openReactionChat(rooms, reaction, onOpenRoom)) return;
          emit({
            name: "my_story_chat_opened",
            surface: "chat",
            characterId: reaction.characterId,
            message: reaction.messageId !== null,
          });
          close();
        }}
        {...(onFindFriends === undefined
          ? {}
          : {
              onFindFriends: () => {
                close();
                onFindFriends();
              },
            })}
        onDeleted={(id) => {
          setState((before) =>
            before === null
              ? before
              : { ...before, stories: before.stories.filter((each) => each.id !== id) },
          );
          emit({ name: "my_story_deleted", surface: "chat", scope: "one", from: "viewer" });
          close();
        }}
        onClose={close}
      />
    );

  return {
    loading: port !== undefined && !loaded,
    slot:
      ring === null
        ? null
        : {
            live: ring.live,
            unseen: ring.unseen,
            nextAt: nextOpenOf(state?.window ?? null, now),
            onCreate: handleCreate,
            onOpen: () => {
              if (ring.live !== null) openStory(ring.live, "row");
            },
          },
    layer,
    layerOpen: layer !== null,
  };
}
