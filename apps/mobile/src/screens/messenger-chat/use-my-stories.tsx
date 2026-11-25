// 목록 화면의 내 스토리 상태(ADR-0194 · ADR-0191) — 읽기 · 「+」/「Your story」 칸 · 올리기 창 · 처음 안내 · 만들기 · 보기 · Open chat ·
// 지우기 · 이벤트를 잇습니다. 판정은 순수 모듈(`my-stories.ts`)이 집니다. 포트가 없거나 서버가 꺼져 있으면 칸도 층도 없습니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import type { ChatCrisisResource, ChatRoomSummary } from "./chat-source.contract";
import { draftOf, mineRingOf, nextOpenOf, tzOffsetMinOf, unseenReactionIdsOf } from "./my-stories";
import type {
  MineRowSlot,
  MyStoriesPort,
  MyStoriesState,
  MyStory,
  MyStoryPostResult,
  MyStoryReaction,
  MyStoryWindow,
} from "./my-stories.contract";
import { editorCapsOf, type EditorShare } from "./my-story-editor";
import { MyStoryEditor } from "./MyStoryEditor";
import { MyStoryStartSheet } from "./MyStoryStartSheet";
import { MyStoryGuide } from "./MyStoryDialogs";
import { MyStoryOpen } from "./MyStoryOpen";
import { MyStoryWindowSheet } from "./MyStoryWindowSheet";

type View =
  | { readonly kind: "guide" }
  | { readonly kind: "start" }
  | { readonly kind: "editor" }
  | { readonly kind: "window" }
  | { readonly kind: "viewer"; readonly storyId: string };

export type MyStoriesUi = {
  readonly slot: MineRowSlot | null;
  readonly layer: ReactNode;
  readonly layerOpen: boolean;
  /** 포트는 있는데 첫 읽기가 아직 — 줄 노출 판정이 기다립니다(「+」 칸이 곧 설 수 있어서, 재리뷰 A5). */
  readonly loading: boolean;
};

/**
 * 반응의 「Open chat」 — 그 인물의 방을 엽니다(ADR-0191 D2 — 반응은 그 방의 메시지라 인용 띠를 넘기지 않습니다). 방이 없으면 false.
 * 방은 늘 끝으로 따라가고 반응은 최근 메시지라, `messageId`로 스크롤하지 않습니다(스스로 정한 것 — 보고).
 */
export function openReactionChat(
  rooms: readonly ChatRoomSummary[],
  reaction: MyStoryReaction,
  onOpenRoom: (roomId: string) => void,
): boolean {
  const roomId = rooms.find((room) => room.counterpart.id === reaction.characterId)?.roomId;
  if (roomId === undefined) return false;
  onOpenRoom(roomId);
  return true;
}

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
}: {
  readonly port: MyStoriesPort | undefined;
  readonly rooms: readonly ChatRoomSummary[];
  readonly onOpenRoom: (roomId: string) => void;
  /** 친구 0명 안내의 Find friends(시안 17번). */
  readonly onFindFriends?: () => void;
}): MyStoriesUi {
  const { emit } = useChatEvents();
  const copy = useUiCopy().messengerChat.myStories;
  const language = copy.language;
  const clockOf = useClock();
  const [state, setState] = useState<MyStoriesState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<readonly ChatCrisisResource[] | null>(null);
  const [, setSeenVersion] = useState(0);
  // 만들기 한 번에 clientId 하나 — 두 번 눌러도(또는 다시 시도해도) 서버가 한 번만 올립니다.
  const clientId = useRef<string | null>(null);
  const posting = useRef(false);

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

  const openStory = (story: MyStory, from: "row" | "posted") => {
    const unseen = port === undefined ? [] : unseenReactionIdsOf(story, port.seenReactions());
    port?.markReactionsSeen(unseen, story.expiresAt);
    setSeenVersion((version) => version + 1);
    emit({
      name: "my_story_viewed",
      surface: "chat",
      reactions: String(story.reactions.length),
      unseen: String(unseen.length),
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
    clientId.current = null;
    setError(null);
    setCrisis(null);
    if (first) port.markGuideSeen();
    setView({ kind: first ? "guide" : "start" });
  }

  /** 바탕 위에서 만든 것을 올립니다 — 스티커 하나면 단어 · 카드 RPC, 글 스토리는 함수(서버 반영 예상). */
  async function handleShare(share: EditorShare) {
    "background only";
    // 두 번 탭해도 요청은 하나 — 상태(busy)는 다음 렌더까지 안 바뀌어 ref로 막습니다(감사 A10).
    if (port === undefined || posting.current) return;
    posting.current = true;
    if (clientId.current === null) clientId.current = port.newClientId();
    setBusy(true);
    setError(null);
    setCrisis(null);
    const now = Date.now();
    const tz = tzOffsetMinOf(now);
    // 포트는 던지지 않는 약속이지만, 던져도 busy가 풀리게 실패로 받습니다(리뷰 지적).
    const posted = await (
      share.kind === "choice"
        ? port.post(draftOf(share.choice, clientId.current, language, tz))
        : port.postText({
            clientId: clientId.current,
            background: share.background,
            ko: share.text?.ko ?? "",
            overlays: share.overlays,
            lang: language,
            tzOffsetMin: tz,
          })
    ).catch((): MyStoryPostResult => ({ result: "failed" }));
    posting.current = false;
    setBusy(false);
    if (posted.result !== "ok") {
      emit({ name: "my_story_post_failed", surface: "chat", reason: posted.result });
      if (posted.result === "window_used") {
        // 창은 서버가 정본 — 다음 창 시각을 「+」 자리에도 씁니다.
        const window = posted.window;
        if (window !== null)
          setState((before) => (before === null ? before : { ...before, window }));
        setError(copy.composer.windowUsed(window === null ? null : clockOf(window)));
      } else if (posted.result === "crisis") setCrisis(posted.resources);
      else
        setError(
          posted.result === "daily_limit"
            ? copy.composer.dailyLimit
            : posted.result === "text_blocked"
              ? copy.editor.textBlocked
              : copy.composer.failed,
        );
      return;
    }
    const { story } = posted;
    clientId.current = null;
    setState((before) => ({
      enabled: true,
      keep: before?.keep ?? true,
      stories: [story, ...(before?.stories ?? []).filter((each) => each.id !== story.id)],
      window: posted.window ?? before?.window ?? null,
      kinds: before?.kinds ?? ["word", "card"],
    }));
    emit({ name: "my_story_posted", surface: "chat", kind: story.kind });
    openStory(story, "posted");
  }

  const close = () => setView(null);
  const viewing = view?.kind === "viewer" ? storyOf(view.storyId) : null;

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
      <MyStoryStartSheet onBackground={() => setView({ kind: "editor" })} onClose={close} />
    ) : view.kind === "editor" ? (
      <MyStoryEditor
        caps={editorCapsOf(state?.kinds ?? ["word", "card"])}
        choices={port.choices}
        busy={busy}
        error={error}
        crisis={crisis}
        onShare={(share) => void handleShare(share)}
        onChange={() => {
          // 다른 것을 올리면 다른 요청 — 앞 실패의 clientId를 다시 쓰지 않습니다(리뷰 m4).
          clientId.current = null;
          setError(null);
          setCrisis(null);
        }}
        onClose={close}
      />
    ) : viewing === null ? null : (
      <MyStoryOpen
        story={viewing}
        now={now}
        rooms={rooms}
        remove={(id) => port.remove(id)}
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
