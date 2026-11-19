// 목록 화면의 추천 친구 상태(ADR-0162) — 줄 · 시트 · 친구 찾기 · 토스트 · 이벤트를 한곳에서 잇습니다. 판정은 순수 모듈이 집니다.
// ⟨2026-11-19⟩ 일반 인물은 서버가 보이게 한 친구만(ADR-0163 D2), open 친구 추가 앞에 성인 확인(D4), 시트 열기 · 견본 이벤트.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import type { ChatBirthYear, ChatRoomSummary } from "./chat-source.contract";
import type {
  EarlyAccessListing,
  FriendProfile,
  SuggestedFriendsPort,
  VisibleFriend,
} from "./friend-catalog.contract";
import { directoryChipsOf, directoryOf } from "./friend-directory";
import type { DirectoryFilter, DirectoryRow } from "./friend-directory";
import { FriendDirectoryScreen } from "./FriendDirectoryScreen";
import { voiceUrlOf } from "./friend-profile";
import { profileOpenedEvent, voicePlayedEvent } from "./friend-profile-events";
import { catalogVisibleTo, friendGateOf, romanceTierOf } from "./friend-visibility";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import {
  catalogWithOffers,
  localizedLine,
  suggestedFriendsOf,
  suggestedRowOf,
} from "./suggested-friends";
import type { SuggestedFriend } from "./suggested-friends";
import { SuggestedFriendSheet } from "./SuggestedFriendSheet";
import { SuggestedFriendsRow } from "./SuggestedFriendsRow";
import { SuggestedFriendToast } from "./SuggestedFriendToast";
import type { SuggestedFriendToastValue } from "./SuggestedFriendToast";
import { useAdultAck } from "./use-adult-ack";
import { usePortLoad } from "./use-port-load";

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

type MediaUrlOf = SuggestedFriendsPort["mediaUrlOf"];

const voiceOf = (character: FriendProfile, mediaUrlOf: MediaUrlOf) =>
  voiceUrlOf(character.profile, mediaUrlOf);

const modelOfFriend = (friend: SuggestedFriend, media: MediaUrlOf): SuggestedFriendSheetModel => ({
  character: friend.character,
  avatarUrl: friend.room.counterpart.avatarUrl,
  status: friend.status,
  offer: friend.offer,
  voiceUrl: voiceOf(friend.character, media),
});

const modelOfRow = (row: DirectoryRow, media: MediaUrlOf): SuggestedFriendSheetModel => ({
  character: row.character,
  avatarUrl: row.room.counterpart.avatarUrl,
  status: row.action === "chat" ? "addable" : "locked",
  offer: row.offer,
  voiceUrl: voiceOf(row.character, media),
});

const NO_OFFERS: readonly EarlyAccessListing[] = [];

export function useSuggestedFriends({
  port,
  rooms,
  birthYear,
  covered,
  onShortOfCoins,
}: {
  readonly port: SuggestedFriendsPort | undefined;
  readonly rooms: readonly ChatRoomSummary[];
  /** 생년(ADR-0125) — open 친구 추가 앞의 성인 확인만 봅니다. */
  readonly birthYear: ChatBirthYear;
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
  // 서버 제안(ADR-0162 D5)은 목록 마운트마다 한 번 읽어 카탈로그에 얹습니다 — 못 읽으면 제안 없음.
  const offers = usePortLoad(port?.offers ?? null, NO_OFFERS).value;
  // 보이는 일반 인물(ADR-0163 D2) — 받기 전 · 못 받음이면 일반 인물이 없습니다. 이야기 인물은 그대로.
  const visibleLoader = port?.visibleFriends;
  const visible = usePortLoad<readonly VisibleFriend[] | null>(visibleLoader ?? null, null);
  const gate = friendGateOf(
    visibleLoader === undefined ? "absent" : visibleLoader === null ? "off" : "on",
    visible.done,
    visible.value,
  );
  const adult = useAdultAck({ port, birthYear, tierOf: (id) => romanceTierOf(gate, id) });
  const media = port?.mediaUrlOf;

  const base = port?.catalog() ?? null;
  const catalog = base === null ? null : catalogVisibleTo(catalogWithOffers(base, offers), gate);
  const now = Date.now();
  const input = {
    catalog: catalog ?? { characters: [], categories: [] },
    rooms,
    earlyAccess: (port?.earlyAccess ?? null) !== null,
    now,
    ...(port?.metEpisode === undefined ? {} : { metEpisode: port.metEpisode }),
  };
  const row = suggestedRowOf(suggestedFriendsOf(input));
  const layerOpen = sheet !== null || directoryOpen || adult.open;

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

  const openSheet = (model: SuggestedFriendSheetModel, from: From) => {
    emit(profileOpenedEvent(model.character.id, from));
    setSheet({ model, from });
  };

  function handleStart() {
    "background only";
    if (sheet === null || port === undefined) return;
    const open = sheet;
    // open 친구는 성인 확인 뒤에(확인 · 취소 모두 추가, ADR-0163 D4). 창이 필요 없으면 곧바로.
    adult.request(open.model.character, () => {
      const result = port.add(open.model.character.id);
      if (result === "added") return added(open, "free");
      setSheet(null);
      if (result === "unknown") showToast(copy.addFailed(open.model.character.name), open.model);
      return undefined;
    });
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
    const completed = (outcome: "unlocked" | "short" | "failed") =>
      emit({ name: "early_access_completed", surface: "chat", characterId: character.id, outcome });
    // 실패(제안 없음 · 오류)는 시트를 그대로 두고 실패 줄만 — 다시 누를 수 있게.
    const failed = () => {
      completed("failed");
      showToast(copy.addFailed(character.name), open.model);
    };
    void run(character.id)
      .then((result) => {
        if (result.kind === "failed") return failed();
        completed(result.kind);
        if (result.kind === "short") {
          setSheet(null);
          return onShortOfCoins();
        }
        // 값을 치렀으니 기존 추가 길(방 열기 · 첫 인사 · 해금 저장)을 탑니다. 방이 없으면(unknown) 성공으로 보이지 않고 실패 줄 —
        // 시트가 남아 다시 누르면 서버가 already로 두 번 빼지 않습니다(리뷰 #503).
        if (port.add(character.id) === "unknown") {
          return showToast(copy.addFailed(character.name), open.model);
        }
        return added(open, "early");
      })
      .catch(failed);
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
          onOpen={(friend) => openSheet(modelOfFriend(friend, media), "row")}
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
            onOpen={(open) => openSheet(modelOfRow(open, media), "directory")}
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
            onVoicePlayed={() => emit(voicePlayedEvent(sheet.model.character.id))}
          />
        )}
        {adult.dialog}
        <SuggestedFriendToast value={toast} />
      </>
    ),
    layerOpen,
  };
}
