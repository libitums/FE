// 메신저 목록의 추천 친구 자리입니다 — 추천 줄 · 프로필 시트 · 성인 확인 대화상자의 상태와 이벤트를 한곳에 두고, 목록 화면은 돌려받은
// 조각(줄 · 겹침)과 프로필 열기만 씁니다. 판정은 순수 `companion-friends.ts`가 집니다.

import { useCallback, useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { useChatEvents } from "./chat-events";
import type { FriendProfileSource } from "./chat-friends.contract";
import type { ChatBirthYear, ChatRoomSummary, ChatSource } from "./chat-source.contract";
import {
  friendAddPlan,
  friendCardsOf,
  friendProfileModel,
  friendWithdrawn,
  stripFriendsOf,
} from "./companion-friends";
import { FriendAdultDialog } from "./FriendAdultDialog";
import { FriendProfileSheet } from "./FriendProfileSheet";
import { FriendsStrip } from "./FriendsStrip";
import { useFriendsState } from "./use-friends";

export type FriendsUiInput = {
  readonly source: ChatSource;
  readonly rooms: readonly ChatRoomSummary[];
  readonly birthYear: ChatBirthYear;
  /** 첫 입장 안내가 떠 있으면 false — 줄은 서지만 안내가 먼저입니다(ADR-0139). */
  readonly active: boolean;
  readonly onLayerChange: (open: boolean) => void;
};

export type FriendsUi = {
  readonly strip: ReactNode;
  readonly layer: ReactNode;
  readonly layerOpen: boolean;
  readonly openProfile: (characterId: string, from: FriendProfileSource) => void;
};

export function useFriendsUi({
  source,
  rooms,
  birthYear,
  active,
  onLayerChange,
}: FriendsUiInput): FriendsUi {
  const copy = useUiCopy().messengerChat.friends;
  const { emit } = useChatEvents();
  const state = useFriendsState(source);
  const [profile, setProfile] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  // 목록에 들어올 때마다 서버 목록을 다시 읽습니다(생년을 바꾼 뒤 등). 포트가 없으면 아무것도 하지 않습니다.
  useEffect(() => source.friends?.refresh(), [source]);

  const layerOpen = profile !== null;
  // 바깥 콜백 · 보내기 함수는 최신 것을 부릅니다(렌더마다 새 함수 — 효과를 다시 돌리지 않게 참조로).
  const onLayerChangeRef = useRef(onLayerChange);
  const emitRef = useRef(emit);
  useEffect(() => {
    onLayerChangeRef.current = onLayerChange;
    emitRef.current = emit;
  });
  useEffect(() => {
    if (!layerOpen) return undefined;
    onLayerChangeRef.current(true);
    return () => onLayerChangeRef.current(false);
  }, [layerOpen]);

  const close = () => {
    setAsking(false);
    setProfile(null);
  };
  useLayerBack(layerOpen ? close : null);

  const openProfile = (characterId: string, from: FriendProfileSource) => {
    "background only";
    emit({ name: "friend_profile_opened", surface: "chat", characterId, source: from });
    setProfile(characterId);
  };

  const commitAdd = (characterId: string) => {
    "background only";
    const result = source.friends?.add(characterId);
    if (result?.kind === "added") emit({ name: "friend_added", surface: "chat", characterId });
    close();
  };

  const requestAdd = (characterId: string) => {
    "background only";
    const plan = friendAddPlan({
      state,
      characterId,
      birthYear,
      nowYear: new Date().getFullYear(),
    });
    if (plan.kind === "confirm-adult") setAsking(true);
    else if (plan.kind === "add") commitAdd(characterId);
  };

  const onShown = useCallback(
    (count: number) =>
      emitRef.current({ name: "friends_strip_shown", surface: "chat", count: String(count) }),
    [],
  );

  const cards = friendCardsOf(state, rooms, copy.profileLanguage);
  const addable = profile !== null && stripFriendsOf(state).some((f) => f.id === profile);
  const model =
    profile === null
      ? null
      : friendProfileModel(profile, { language: copy.profileLanguage, addable });
  const avatarUrl = rooms.find((room) => room.roomId === profile)?.counterpart.avatarUrl ?? null;

  return {
    strip: (
      <FriendsStrip
        cards={cards}
        active={active}
        onOpen={(id) => openProfile(id, "strip")}
        onShown={onShown}
      />
    ),
    layer:
      model === null ? null : (
        <>
          <FriendProfileSheet
            model={model}
            avatarUrl={avatarUrl}
            unavailable={friendWithdrawn(model.id, state)}
            onAdd={() => requestAdd(model.id)}
            onClose={close}
          />
          {asking ? (
            <FriendAdultDialog
              name={model.name}
              onConfirm={() => {
                "background only";
                void source.friends?.ackAdult();
                commitAdd(model.id);
              }}
              onCancel={() => commitAdd(model.id)}
            />
          ) : null}
        </>
      ),
    layerOpen,
    openProfile,
  };
}
