import { useMemo, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useChatEvents } from "./chat-events";
import type { ChatSource } from "./chat-source.contract";
import { ChatStoryHostContext } from "./chat-story-host-context";
import { chatFriendItemsOf, chatStoryTargetOf } from "./chat-story-thumb";
import type { ChatStoryHost as Host, ChatStoryLookup } from "./chat-story-thumb.contract";
import { ChatFriendStoryLayer } from "./ChatFriendStoryLayer";
import { ChatStoryEndedSheet } from "./ChatStoryThumb";
import type { CoinWallet } from "./coin-wallet";
import type {
  ChatStoryQuote,
  FriendStoriesPort,
  FriendStory,
  StoryViewerItem,
} from "./friend-stories.contract";
import { openReactionChat, unseenReactionIdsOf } from "./my-stories";
import type { MyStory } from "./my-stories.contract";
import { MyStoryFullOpen } from "./MyStoryFullOpen";

export type ChatStoryHostProps = {
  readonly port: FriendStoriesPort | undefined;
  readonly source: ChatSource;
  readonly wallet: CoinWallet;
  readonly roomId: string;
  /** 다른 인물의 방으로 — 메신저 스택을 접고 그 방을 엽니다. */
  readonly onOpenRoom: (roomId: string) => void;
  readonly children: ReactNode;
};

type Layer =
  | { readonly kind: "mine"; readonly story: MyStory }
  | { readonly kind: "friend"; readonly items: readonly StoryViewerItem[]; readonly start: number }
  | { readonly kind: "ended" };

/**
 * 대화방 스토리 인용 판의 결선(ADR-0178 D5 개정 ⟨판⟩ · ADR-0194 개정 ⟨판⟩) — 판이 처음 설 때 그 종류의 목록(내 스토리 · 친구 스토리)을 한 번
 * 받고, 판을 누르면 내 스토리 전체 화면 보기(한 장, 지난 것도) · 친구 스토리 보기(그 인물, 그 장부터) · 「This story has ended」 시트를 방 위에
 * 띄웁니다. 층은 모두 화면 고정이라 방(자식) 뒤에 형제로 둡니다. 포트가 없으면(손님) 서버 요청 0, 판은 누를 수 없습니다.
 */
export function ChatStoryHost({
  port,
  source,
  wallet,
  roomId,
  onOpenRoom,
  children,
}: ChatStoryHostProps): ReactNode {
  const { emit } = useChatEvents();
  const [mine, setMine] = useState<readonly MyStory[] | null>(null);
  const [friends, setFriends] = useState<readonly FriendStory[] | null>(null);
  const [deleted, setDeleted] = useState<ReadonlySet<string>>(() => new Set());
  const [layer, setLayer] = useState<Layer | null>(null);
  const asked = useRef(new Set<"mine" | "friend">());
  const lookup: ChatStoryLookup = useMemo(
    () => ({ mine, friends, deleted }),
    [mine, friends, deleted],
  );
  // 같은 방 = 보기만 닫음, 다른 인물 = 그 방으로.
  const openRoom = (target: string) => {
    setLayer(null);
    if (target !== roomId) onOpenRoom(target);
  };

  const need = (kind: "mine" | "friend") => {
    "background only";
    if (port === undefined || asked.current.has(kind)) return;
    asked.current.add(kind);
    // 못 받았으면(null · 던짐) 다음에 서는 판이 다시 요청할 수 있게 표시를 지웁니다.
    const got = <T,>(value: T | null) => {
      if (value === null) asked.current.delete(kind);
      return value;
    };
    if (kind === "mine")
      void port.mine
        ?.load()
        .catch(() => null)
        .then((state) => setMine(got(state)?.stories ?? null));
    else
      void port
        .load()
        .catch(() => null)
        .then((list) => setFriends(got(list)));
  };

  const open = (quote: ChatStoryQuote) => {
    "background only";
    if (port === undefined) return;
    const now = Date.now();
    const target = chatStoryTargetOf(quote, lookup, now);
    if (target === null) return;
    if (target.kind === "ended") return setLayer(target);
    if (target.kind === "mine") {
      const unseen = unseenReactionIdsOf(target.story, port.mine?.seenReactions() ?? new Set());
      port.mine?.markReactionsSeen(unseen, target.story.expiresAt);
      emit({
        name: "my_story_viewed",
        surface: "chat",
        reactions: String(target.story.reactions.length),
        unseen: String(unseen.length),
        from: "chat",
      });
      return setLayer(target);
    }
    const room = source.snapshot().rooms.find((each) => each.counterpart.id === target.characterId);
    const opened = chatFriendItemsOf(friends ?? [], target, room ?? null, port.imageUrl, now);
    setLayer(opened === null ? { kind: "ended" } : { kind: "friend", ...opened });
  };

  const host: Host = {
    lookup,
    need,
    open,
    ...(port?.mine?.photo === undefined ? {} : { photoUrl: port.mine.photo.url }),
  };
  const rooms = layer === null ? [] : source.snapshot().rooms;
  return (
    <ChatStoryHostContext.Provider value={host}>
      {children}
      {!__BACKGROUND__ || port === undefined || layer === null ? null : layer.kind === "ended" ? (
        <ChatStoryEndedSheet onClose={() => setLayer(null)} />
      ) : layer.kind === "friend" ? (
        <ChatFriendStoryLayer
          items={layer.items}
          start={layer.start}
          port={port}
          source={source}
          rooms={rooms}
          wallet={wallet}
          onOpenRoom={openRoom}
          onClose={() => setLayer(null)}
        />
      ) : (
        <MyStoryFullOpen
          stories={[layer.story]}
          openedId={layer.story.id}
          now={Date.now()}
          rooms={rooms}
          romanization={port.romanization?.() ?? true}
          remove={(id) => port.mine?.remove(id) ?? Promise.resolve(false)}
          onShown={() => undefined}
          {...(host.photoUrl === undefined ? {} : { photoUrl: host.photoUrl })}
          onOpenChat={(reaction) => {
            if (!openReactionChat(rooms, reaction, openRoom)) return;
            emit({
              name: "my_story_chat_opened",
              surface: "chat",
              characterId: reaction.characterId,
              message: reaction.messageId !== null,
            });
          }}
          onDeleted={(id) => {
            setDeleted((before) => new Set([...before, id]));
            emit({ name: "my_story_deleted", surface: "chat", scope: "one", from: "viewer" });
            setLayer(null);
          }}
          onClose={() => setLayer(null)}
        />
      )}
    </ChatStoryHostContext.Provider>
  );
}
