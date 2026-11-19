import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { StatChip } from "../../components/StatChip";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { ChatAccessGate } from "./ChatAccessGate";
import { ChatListEmpty } from "./ChatListEmpty";
import { ChatListNotice } from "./ChatListNotice";
import { ChatListRow } from "./ChatListRow";
import { CoinShopLayer } from "./CoinShopLayer";
import { MessengerListGuide } from "./MessengerGuide";
import { useChatEvents } from "./chat-events";
import { deviceGuideStore, GUIDE_ROOM_ID, suggestedRowShown } from "./messenger-guide";
import { orderChatRooms } from "./chat-list";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import type { MessengerListScreenProps } from "./messenger-chat.contract";
import type { SuggestedFriendsProps } from "./suggested-friends.contract";
import { useChatSnapshot } from "./use-chat-source";
import { useCoinBalance } from "./use-coin-balance";
import { useSuggestedFriends } from "./use-suggested-friends";

import "./messenger-list.css";

/**
 * 메신저 탭의 루트 화면(채팅 목록)입니다. 목록 계산은 `chat-list`가, 구독은 `useChatSnapshot`이,
 * 줄 그리기는 `ChatListRow`가 지고 여기서는 머리 · 목록 · 빈 상태 · 엽전 상점 겹침을 잇기만 합니다.
 */
export function MessengerListScreen({
  source,
  wallet,
  onOpenRoom,
  onGoToJourney,
  onLayerChange,
  notice,
  onNoticeShown,
  access,
  onSignIn,
  guideStore = deviceGuideStore,
  friends,
}: MessengerListScreenProps & SuggestedFriendsProps): ReactNode {
  const copy = useUiCopy().messengerChat.list;
  const { rooms } = useChatSnapshot(source);
  // 잔액 = 앱의 보유 엽전 − 이번 실행에서 쓴 양. 방에서 엽전을 쓰고 돌아오면 칩이 따라갑니다.
  const coinBalance = useCoinBalance(wallet);
  const [coinShopOpen, setCoinShopOpen] = useState(false);
  // 첫 입장 안내(덕수쌤 줄만 떠 있는 오버레이) — 덕수쌤 방이 있는 메신저(서버 모드)에서 한 번.
  const [guideUnseen, setGuideUnseen] = useState(() => guideStore.unseen("list"));
  const guideRoom = rooms.find((r) => r.roomId === GUIDE_ROOM_ID && r.access.kind === "open");
  const guideShown = access === "open" && guideUnseen && guideRoom !== undefined;
  const { emit } = useChatEvents();
  const endGuide = (outcome: "done" | "skipped") => {
    emit({ name: "messenger_guide_finished", surface: "chat", part: "list", outcome });
    guideStore.markSeen("list");
    setGuideUnseen(false);
  };

  function openCoinShop() {
    "background only";
    playSound("button");
    setCoinShopOpen(true);
  }
  function closeCoinShop() {
    "background only";
    setCoinShopOpen(false);
  }
  // 추천 친구 줄 · 시트 · 친구 찾기(ADR-0162) — 엽전이 모자라면 상점을 엽니다(그동안 친구 찾기는 낭독에서 가려짐).
  const suggested = useSuggestedFriends({
    port: access === "open" ? friends : undefined,
    rooms,
    covered: coinShopOpen,
    onShortOfCoins: openCoinShop,
  });

  // 겹침(엽전 상점 · 첫 입장 안내 · 추천 친구 시트 · 친구 찾기)을 합친 값 하나만, 바뀔 때 바깥에 알립니다 — 겹침끼리 바뀌는 사이에
  // 닫힘이 끼어 전역 머리가 다시 읽히지 않게(접근성 리뷰 W3). 마운트 때의 첫 false는 보내지 않고, 열린 채 화면이 내려가면 닫힘을
  // 한 번 더 알립니다(전역 머리가 가려진 채 남지 않게 — `useScreenLayer`와 같은 목적).
  const layerOpen = coinShopOpen || guideShown || suggested.layerOpen;
  const onLayerChangeRef = useRef(onLayerChange);
  const sentRef = useRef(false);
  useEffect(() => {
    onLayerChangeRef.current = onLayerChange;
  });
  useEffect(() => {
    if (sentRef.current === layerOpen) return;
    sentRef.current = layerOpen;
    onLayerChangeRef.current(layerOpen);
  }, [layerOpen]);
  useEffect(
    () => () => {
      if (sentRef.current) onLayerChangeRef.current(false);
    },
    [],
  );

  const ordered = orderChatRooms(rooms);
  // 시각 표기의 기준은 그릴 때마다 읽습니다(상태로 두면 목록이 바뀔 때마다 두 번 그려집니다 — 리뷰 #10).
  const now = Date.now();

  return (
    <view className="messenger-list-screen" data-testid={ids.screen}>
      {/* 겹침이 떠 있는 동안 뒤 화면을 낭독에서 숨깁니다(ADR-0016 D9). */}
      <view className="messenger-list-content" accessibility-elements-hidden={layerOpen}>
        <view className="messenger-list-header" data-testid={ids.header}>
          <text
            className="messenger-list-title"
            data-testid={ids.title}
            accessibility-traits="header"
          >
            {copy.title}
          </text>
          {/* 손님은 엽전이 없어 칩을 두지 않습니다(ADR-0128). */}
          {access === "sign-in" ? null : (
            <StatChip
              tone="coin"
              value={coinBalance}
              accessibilityLabel={copy.coinsLabel(coinBalance)}
              testId={ids.coins}
              surface="white"
              height="touch-target"
              onTap={openCoinShop}
            />
          )}
        </view>
        {access !== "open" ? (
          <ChatAccessGate
            access={access}
            onSignIn={onSignIn}
            faces={ordered
              .filter((room) => room.access.kind === "open")
              .map((room) => [...room.counterpart.name][0] ?? "")
              .filter((face) => face !== "")
              .slice(0, 3)}
          />
        ) : ordered.length === 0 ? (
          <ChatListEmpty onGoToJourney={onGoToJourney} />
        ) : (
          <scroll-view
            className="messenger-list-scroll"
            scroll-orientation="vertical"
            scroll-bar-enable={false}
          >
            <view className="messenger-list-list" data-testid={ids.list}>
              {/* 안내 중에는 추천 줄을 빼 원본 첫 줄이 떠 있는 덕수쌤 줄 자리에 섭니다. */}
              {suggestedRowShown({ listGuideShown: guideShown }) ? suggested.row : null}
              {ordered.map((room) => (
                <ChatListRow key={room.roomId} room={room} now={now} onOpen={onOpenRoom} />
              ))}
            </view>
          </scroll-view>
        )}
      </view>
      <ChatListNotice notice={notice} onNoticeShown={onNoticeShown} />
      {suggested.layers}
      {coinShopOpen ? <CoinShopLayer coinBalance={coinBalance} onClose={closeCoinShop} /> : null}
      {guideShown && guideRoom !== undefined ? (
        <MessengerListGuide
          room={guideRoom}
          now={now}
          onOpen={() => {
            endGuide("done");
            onOpenRoom(GUIDE_ROOM_ID);
          }}
          onSkip={() => endGuide("skipped")}
        />
      ) : null}
    </view>
  );
}
