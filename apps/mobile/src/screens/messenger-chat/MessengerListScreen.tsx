import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { StatChip } from "../../components/StatChip";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { ChatListEmpty } from "./ChatListEmpty";
import { ChatListRow } from "./ChatListRow";
import { GemShopLayer } from "./GemShopLayer";
import { orderChatRooms } from "./chat-list";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import type { MessengerListScreenProps } from "./messenger-chat.contract";
import { useChatSnapshot } from "./use-chat-source";

import "./messenger-list.css";

/**
 * 메신저 탭의 루트 화면(채팅 목록)입니다. 목록 계산은 `chat-list`가, 구독은 `useChatSnapshot`이,
 * 줄 그리기는 `ChatListRow`가 지고 여기서는 머리 · 목록 · 빈 상태 · 젬 겹침을 잇기만 합니다.
 */
export function MessengerListScreen({
  source,
  gemBalance,
  onOpenRoom,
  onGoToJourney,
  onLayerChange,
}: MessengerListScreenProps): ReactNode {
  const copy = useUiCopy().messengerChat.list;
  const { rooms } = useChatSnapshot(source);
  const [gemOpen, setGemOpen] = useState(false);

  // 겹침 열림은 바뀔 때만 바깥에 알립니다. 열린 채 화면이 내려가면 닫힘을 한 번 더 알립니다
  // (전역 머리가 가려진 채 남지 않게 — `useScreenLayer`와 같은 목적이지만, 마운트 때의 첫 false는 보내지 않습니다).
  const onLayerChangeRef = useRef(onLayerChange);
  const gemOpenRef = useRef(false);
  useEffect(() => {
    onLayerChangeRef.current = onLayerChange;
    gemOpenRef.current = gemOpen;
  });
  useEffect(
    () => () => {
      if (gemOpenRef.current) onLayerChangeRef.current(false);
    },
    [],
  );

  function openGems() {
    "background only";
    playSound("button");
    setGemOpen(true);
    onLayerChange(true);
  }
  function closeGems() {
    "background only";
    setGemOpen(false);
    onLayerChange(false);
  }

  const ordered = orderChatRooms(rooms);
  // 시각 표기의 기준은 목록이 바뀔 때 한 번 잡습니다(그리는 중에 시계를 읽지 않습니다).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
  }, [rooms]);

  return (
    <view className="messenger-list-screen" data-testid={ids.screen}>
      {/* 겹침이 떠 있는 동안 뒤 화면을 낭독에서 숨깁니다(ADR-0016 D9). */}
      <view className="messenger-list-content" accessibility-elements-hidden={gemOpen}>
        <view className="messenger-list-header" data-testid={ids.header}>
          <text
            className="messenger-list-title"
            data-testid={ids.title}
            accessibility-traits="header"
          >
            {copy.title}
          </text>
          <StatChip
            tone="diamond"
            value={gemBalance}
            accessibilityLabel={copy.gemsLabel(gemBalance)}
            testId={ids.gem}
            surface="white"
            height="touch-target"
            onTap={openGems}
          />
        </view>
        {ordered.length === 0 ? (
          <ChatListEmpty onGoToJourney={onGoToJourney} />
        ) : (
          <scroll-view
            className="messenger-list-scroll"
            scroll-orientation="vertical"
            scroll-bar-enable={false}
          >
            <view className="messenger-list-list" data-testid={ids.list}>
              {ordered.map((room) => (
                <ChatListRow key={room.roomId} room={room} now={now} onOpen={onOpenRoom} />
              ))}
            </view>
          </scroll-view>
        )}
      </view>
      {gemOpen ? <GemShopLayer gemBalance={gemBalance} onClose={closeGems} /> : null}
    </view>
  );
}
