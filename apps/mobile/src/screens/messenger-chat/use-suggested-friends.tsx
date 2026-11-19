// 목록 화면의 추천 친구 상태(ADR-0162) — 줄 · 시트 · 친구 찾기 · 토스트 · 이벤트를 한곳에서 잇습니다. 판정은 순수 모듈이 집니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import type { ChatRoomSummary } from "./chat-source.contract";
import { catalogWithVisibleFriends } from "./companion-friends";
import type {
  EarlyAccessListing,
  SuggestedFriendsPort,
  VisibleFriend,
} from "./friend-catalog.contract";
import { directoryChipsOf, directoryOf } from "./friend-directory";
import { voicePlayedEvent, withVoiceUrl } from "./friend-profile";
import type { DirectoryFilter, DirectoryRow } from "./friend-directory";
import { FriendDirectoryScreen } from "./FriendDirectoryScreen";
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
  onBlocked,
}: {
  readonly port: SuggestedFriendsPort | undefined;
  readonly rooms: readonly ChatRoomSummary[];
  /** 엽전 상점이 위에 떠 있는가 — 그동안 친구 찾기를 낭독에서 가립니다. */
  readonly covered: boolean;
  readonly onShortOfCoins: () => void;
  /** 비회원(ADR-0166) — 「Start chatting」이 추가 대신 시트를 닫고 이것(로그인 권유)을 부릅니다. */
  readonly onBlocked?: (() => void) | undefined;
}): SuggestedFriendsUi {
  const copy = useUiCopy().messengerChat.suggested;
  const { emit } = useChatEvents();
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [filter, setFilter] = useState<DirectoryFilter>(ALL);
  const [toast, setToast] = useState<SuggestedFriendToastValue | null>(null);
  const toastKey = useRef(0);
  const viewedSent = useRef(false);
  const [offers, setOffers] = useState<readonly EarlyAccessListing[]>([]);
  const [visible, setVisible] = useState<readonly VisibleFriend[] | null>(null);
  const ack = useAdultAck(port?.adultAck);

  // 서버 제안(ADR-0162 D5)은 목록 마운트마다 한 번 읽어 카탈로그에 얹습니다 — 못 읽으면 제안 없음.
  // 포트 객체가 렌더마다 바뀌어도 다시 부르지 않게, 마운트 때 한 번 그때의 함수를 씁니다(리뷰 #503).
  const loadOffersRef = useRef(port?.offers ?? null);
  loadOffersRef.current = port?.offers ?? null;
  // 손님 → 회원처럼 읽을 길이 새로 생길 때만 다시 읽습니다.
  const hasLoader = loadOffersRef.current !== null;
  useEffect(() => {
    const loadOffers = loadOffersRef.current;
    if (loadOffers === null) return undefined;
    let live = true;
    void loadOffers()
      .then((list) => {
        if (live) setOffers(list);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [hasLoader]);

  // 보이는 추천 친구(ADR-0164 D2)도 마운트마다 한 번 — 읽기 전 · 못 읽음은 일반 인물이 없습니다(서버 포트가 없으면 거르지 않음).
  const loadVisibleRef = useRef(port?.visibleFriends ?? null);
  loadVisibleRef.current = port?.visibleFriends ?? null;
  const filtersFriends = loadVisibleRef.current !== null;
  useEffect(() => {
    const loadVisible = loadVisibleRef.current;
    if (loadVisible === null) return undefined;
    let live = true;
    void loadVisible()
      .then((list) => {
        if (live) setVisible(list);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [filtersFriends]);

  const raw = port?.catalog() ?? null;
  const base = raw !== null && filtersFriends ? catalogWithVisibleFriends(raw, visible) : raw;
  const catalog = base === null ? null : catalogWithOffers(base, offers);
  const now = Date.now();
  const input = {
    catalog: catalog ?? { characters: [], categories: [] },
    rooms,
    earlyAccess: (port?.earlyAccess ?? null) !== null,
    now,
    ...(port?.metEpisode === undefined ? {} : { metEpisode: port.metEpisode }),
  };
  const row = suggestedRowOf(suggestedFriendsOf(input));
  const layerOpen = sheet !== null || directoryOpen || ack.open;

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

  // 프로필 시트를 연 순간(제품 이벤트 — 탭에서 보냄, ADR-0164 「분석 이벤트」).
  const openSheet = (model: SuggestedFriendSheetModel, from: From) => {
    emit({
      name: "suggested_friend_opened",
      surface: "chat",
      characterId: model.character.id,
      kind: model.character.kind,
      from,
    });
    setSheet({ model: withVoiceUrl(model, port?.mediaUrlOf), from }); // 목소리 견본 주소(ADR-0164 앱 추가 2026-11-20)
  };

  function handleStart() {
    "background only";
    if (sheet === null || port === undefined) return;
    if (onBlocked !== undefined) {
      setSheet(null);
      return onBlocked();
    }
    const open = sheet;
    const add = () => {
      const result = port.add(open.model.character.id);
      if (result === "added") return added(open, "free");
      setSheet(null);
      if (result === "unknown") showToast(copy.addFailed(open.model.character.name), open.model);
    };
    // 수위 open 친구는 「Get closer」 시트를 먼저 물을 수 있습니다(ADR-0164 D4) — 그 시트가 설 때만 프로필 시트를 닫습니다
    // (서버 프로필을 읽는 동안 빈 화면이 생기지 않게).
    ack.begin(open.model.character, open.model.avatarUrl, add, () => setSheet(null));
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
          onOpen={(friend) => openSheet(modelOfFriend(friend), "row")}
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
            covered={sheet !== null || ack.open || covered}
            chips={directoryChipsOf(catalog)}
            filter={filter}
            story={directory.story}
            general={directory.general}
            categoryLabel={categoryLabel}
            onFilter={setFilter}
            onOpen={(open) => openSheet(modelOfRow(open), "directory")}
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
        {ack.layer}
        <SuggestedFriendToast value={toast} />
      </>
    ),
    layerOpen,
  };
}
