import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { coinIcon } from "../../components/coin-icon";
import { useUiCopy } from "../../lib/ui-copy";
import {
  chatAlbumTestIds as albumIds,
  DEFAULT_SNAPSHOT_SELF,
  SNAPSHOT_SELVES,
  type ChatSnapshotSelf,
} from "./chat-album.contract";
import { ChatModalFrame } from "./ChatModalFrame";
import { askMediaPlan } from "./chat-rules";
import type { ChatMediaKind } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./chat-overlays.css";
import "./chat-turns.css";
import "./chat-album.css";

export type AskMediaDialogProps = {
  readonly media: ChatMediaKind;
  readonly name: string;
  readonly balance: number;
  readonly price: number;
  /** 첫 Snapshot이면 내 모습을 함께 묻습니다(ADR-0150 M5). 확정은 고른 값(묻지 않았으면 null)과 함께. */
  readonly selfAsk?: boolean;
  readonly onConfirm: (self: ChatSnapshotSelf | null) => void;
  readonly onGetCoins: () => void;
  readonly onCancel: () => void;
};

type CoinPriceButtonProps = {
  readonly price: number;
  readonly label: string;
  readonly onTap: () => void;
};

// 주 버튼: 엽전 아이콘(ADR-0116, 주황 면 위라 흰 원판에 얹음 — 접근성 M8) + 수. 아이콘만으로 뜻을 전하지 않도록 낭독은 「Ask for {n} coins」 한 문장입니다.
function CoinPriceButton({ price, label, onTap }: CoinPriceButtonProps): ReactNode {
  const handleTap = () => {
    "background only";
    onTap();
  };
  return (
    <view
      className="chat-modal-action chat-coin-button"
      data-testid={ids.askConfirm}
      data-plan="ask"
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      bindtap={handleTap}
    >
      <view className="chat-coin-disc" accessibility-elements-hidden={true}>
        <svg className="chat-coin-button-icon" content={coinIcon} />
      </view>
      <text className="chat-coin-button-label" accessibility-elements-hidden={true}>
        {price}
      </text>
    </view>
  );
}

type SelfAskProps = {
  readonly selected: ChatSnapshotSelf;
  readonly onSelect: (self: ChatSnapshotSelf) => void;
};

// 첫 Snapshot의 「How should you appear?」 — 칩 셋(기본 Woman). 낭독은 칩마다 「이름, 선택됨」(ChoiceRow와 같은 규칙).
function SelfAsk({ selected, onSelect }: SelfAskProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const copy = chat.album;
  return (
    <view className="chat-self-ask" data-testid={albumIds.selfAsk}>
      <text className="chat-self-ask-title" flatten={false} accessibility-element={true}>
        {copy.selfAsk}
      </text>
      <view className="chat-self-chips">
        {SNAPSHOT_SELVES.map((self) => {
          const on = self === selected;
          const title = copy.selfOptions[self].title;
          return (
            <view
              key={self}
              className={`chat-self-chip${on ? " chat-self-chip-on" : ""}`}
              data-testid={albumIds.selfOption(self)}
              data-selected={on ? "true" : "false"}
              flatten={false}
              accessibility-element={true}
              accessibility-traits="button"
              accessibility-label={on ? chat.toggle.selected(title) : title}
              accessibility-enable-tap={true}
              bindtap={() => {
                "background only";
                onSelect(self);
              }}
            >
              <text className="chat-self-chip-label" accessibility-elements-hidden={true}>
                {title}
              </text>
            </view>
          );
        })}
      </view>
      <text className="chat-self-ask-note" flatten={false} accessibility-element={true}>
        {copy.selfAskNote}
      </text>
    </view>
  );
}

// 사진 · 음성 요청 대화상자(Z4 · Z6)입니다. 미리보기 · 가격 줄은 없고 가격은 주 버튼에만 있습니다.
// 잔액이 모자라면(top-up) 주 버튼이 「Get coins」가 되어 엽전 상점으로 갑니다.
export function AskMediaDialog({
  media,
  name,
  balance,
  price,
  selfAsk = false,
  onConfirm,
  onGetCoins,
  onCancel,
}: AskMediaDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.askMedia;
  const [self, setSelf] = useState<ChatSnapshotSelf>(DEFAULT_SNAPSHOT_SELF);
  const plan = askMediaPlan(balance, price);
  const text = copy[media];
  return (
    <view data-testid={ids.askDialog} data-media={media} data-plan={plan.kind}>
      <ChatModalFrame
        testId={`${ids.askDialog}-frame`}
        title={text.title}
        description={text.description(name)}
        actions={
          <>
            <view className="chat-modal-action" data-testid={ids.askCancel}>
              <Button
                label={copy.cancel}
                variant="outline"
                size="xl"
                width="fill"
                bindtap={onCancel}
              />
            </view>
            {plan.kind === "ask" ? (
              <CoinPriceButton
                price={plan.price}
                label={copy.confirmLabel(plan.price)}
                onTap={() => onConfirm(selfAsk ? self : null)}
              />
            ) : (
              <view className="chat-modal-action" data-testid={ids.askConfirm} data-plan="top-up">
                <Button
                  label={copy.getCoins}
                  variant="brand"
                  size="xl"
                  width="fill"
                  bindtap={onGetCoins}
                />
              </view>
            )}
          </>
        }
      >
        {selfAsk ? <SelfAsk selected={self} onSelect={setSelf} /> : null}
        <text className="chat-ask-balance" data-testid={ids.askBalance}>
          {copy.balance(balance)}
        </text>
      </ChatModalFrame>
    </view>
  );
}
