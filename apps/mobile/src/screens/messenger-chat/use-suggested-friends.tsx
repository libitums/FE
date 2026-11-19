// 목록 화면의 추천 친구 상태(ADR-0162) — 줄 · 시트 · 친구 찾기 · 토스트 · 이벤트를 한곳에서 잇습니다. 판정은 순수 모듈이 집니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import type { ChatRoomSummary } from "./chat-source.contract";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { directoryChipsOf, directoryOf } from "./friend-directory";
import type { DirectoryFilter, DirectoryRow } from "./friend-directory";
import { FriendDirectoryScreen } from "./FriendDirectoryScreen";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import { localizedLine, suggestedFriendsOf, suggestedRowOf } from "./suggested-friends";
import type { SuggestedFriend } from "./suggested-friends";
import { SuggestedFriendSheet } from "./SuggestedFriendSheet";
import { SuggestedFriendsRow } from "./SuggestedFriendsRow";
import { SuggestedFriendToast } from "./SuggestedFriendToast";
import type { SuggestedFriendToastValue } from "./SuggestedFriendToast";

export type SuggestedFriendsUi = {
  /** 목록 위에 설 줄 — 추천이 없거나 포트가 없으면 null(줄을 숨김, ADR-0162 D3). */
  readonly row: ReactNode;
  /** 시트 · 친구 찾기 · 토스트 — 스크롤 밖에 둡니다. */
  readonly layers: ReactNode;
  /** 시트나 친구 찾기가 떠 있는가 — 목록 화면이 다른 겹침과 합쳐 한 번만 바깥에 알립니다. */
  readonly layerOpen: boolean;
};

type From = "row" | "directory";
type OpenSheet = { readonly model: SuggestedFriendSheetModel; readonly from: From };

const ALL: DirectoryFilter = { kind: "all" };

const modelOfFriend = (friend: SuggestedFriend): SuggestedFriendSheetModel => ({
  character: friend.character,
  avatarUrl: friend.room.counterpart.avatarUrl,
  status: friend.status,
  offer: friend.offer,
});

const modelOfRow = (row: DirectoryRow): SuggestedFriendSheetModel => ({
  character: row.character,
  avatarUrl: row.room.counterpart.avatarUrl,
  status: row.action === "chat" ? "addable" : "locked",
  offer: row.offer,
});

export function useSuggestedFriends({
  port,
  rooms,
  covered,
  onShortOfCoins,
}: {
  readonly port: SuggestedFriendsPort | undefined;
  readonly rooms: readonly ChatRoomSummary[];
  /** 엽전 상점이 위에 떠 있는가 — 그동안 친구 찾기를 낭독에서 가립니다. */
  readonly covered: boolean;
  readonly onShortOfCoins: () => void;
}): SuggestedFriendsUi {
  const copy = useUiCopy().messengerChat.suggested;
  const { emit } = useChatEvents();
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [filter, setFilter] = useState<DirectoryFilter>(ALL);
  const [toast, setToast] = useState<SuggestedFriendToastValue | null>(null);
  const toastKey = useRef(0);
  const viewedSent = useRef(false);

  const catalog = port?.catalog() ?? null;
  const now = Date.now();
  const input = {
    catalog: catalog ?? { characters: [], categories: [] },
    rooms,
    earlyAccess: (port?.earlyAccess ?? null) !== null,
    now,
    ...(port?.metEpisode === undefined ? {} : { metEpisode: port.metEpisode }),
  };
  const row = suggestedRowOf(suggestedFriendsOf(input));
  const layerOpen = sheet !== null || directoryOpen;

  // 줄이 처음 보일 때 목록 마운트당 한 번(제품 이벤트 — 효과에서 보냄).
  useEffect(() => {
    if (viewedSent.current || row.length === 0) return;
    viewedSent.current = true;
    emit({ name: "suggested_friend_viewed", surface: "chat", count: String(row.length) });
  }, [row.length]);

  const showToast = (text: string, model: SuggestedFriendSheetModel) => {
    toastKey.current += 1;
    const { name } = model.character;
    setToast({ key: toastKey.current, text, name, avatarUrl: model.avatarUrl });
  };

  const added = (open: OpenSheet, via: "free" | "early") => {
    const { character } = open.model;
    emit({
      name: "suggested_friend_added",
      surface: "chat",
      characterId: character.id,
      kind: character.kind,
      from: open.from,
      via,
    });
    setSheet(null);
    showToast(copy.added(character.name), open.model);
  };

  function handleStart() {
    "background only";
    if (sheet === null || port === undefined) return;
    const result = port.add(sheet.model.character.id);
    if (result === "added") return added(sheet, "free");
    setSheet(null);
    if (result === "unknown") showToast(copy.addFailed(sheet.model.character.name), sheet.model);
  }

  function handleEarly() {
    "background only";
    const run = port?.earlyAccess ?? null;
    if (sheet === null || port === undefined || run === null) return;
    const open = sheet;
    const { character } = open.model;
    emit({
      name: "early_access_tapped",
      surface: "chat",
      characterId: character.id,
      price: String(open.model.offer?.price ?? 0),
      from: open.from,
    });
    void run(character.id)
      .then((result) => {
        if (result.kind === "unlocked") {
          port.add(character.id);
          return added(open, "early");
        }
        setSheet(null);
        if (result.kind === "short") return onShortOfCoins();
        return showToast(copy.addFailed(character.name), open.model);
      })
      .catch(() => {
        // 실패 · 모자람과 같이 시트를 닫고 알립니다(리뷰 W1).
        setSheet(null);
        showToast(copy.addFailed(character.name), open.model);
      });
  }

  const categoryLabel = (id: string): string => {
    const category = catalog?.categories.find((candidate) => candidate.id === id);
    return category === undefined ? id : localizedLine(category.label, copy.language);
  };
  const directory = directoryOpen ? directoryOf({ ...input, filter }) : null;

  return {
    row:
      port === undefined || row.length === 0 ? null : (
        <SuggestedFriendsRow
          friends={row}
          onOpen={(friend) => setSheet({ model: modelOfFriend(friend), from: "row" })}
          onSeeAll={() => {
            setFilter(ALL);
            setDirectoryOpen(true);
          }}
        />
      ),
    layers: (
      <>
        {directory === null || catalog === null ? null : (
          <FriendDirectoryScreen
            covered={sheet !== null || covered}
            chips={directoryChipsOf(catalog)}
            filter={filter}
            story={directory.story}
            general={directory.general}
            categoryLabel={categoryLabel}
            onFilter={setFilter}
            onOpen={(open) => setSheet({ model: modelOfRow(open), from: "directory" })}
            onBack={() => setDirectoryOpen(false)}
          />
        )}
        {sheet === null ? null : (
          <SuggestedFriendSheet
            model={sheet.model}
            now={now}
            onStart={handleStart}
            onEarly={handleEarly}
            onClose={() => setSheet(null)}
          />
        )}
        <SuggestedFriendToast value={toast} />
      </>
    ),
    layerOpen,
  };
}
