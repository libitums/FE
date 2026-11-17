import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { messengerAccessTestIds as ids, type MessengerAccess } from "./messenger-access";

import "./messenger-list.css";

export type ChatAccessGateProps = {
  readonly access: Exclude<MessengerAccess, "open">;
  readonly onSignIn: () => void;
  /** 손님 안내의 아바타(최대 셋) — 대화 출처의 열린 인물 이름 첫 글자입니다. */
  readonly faces: readonly string[];
};

// 메신저 탭 목록 대신 서는 안내입니다(ADR-0128) — 손님 · 로그아웃에게 가입 권유. 빈 목록 안내(`ChatListEmpty`)와 같은
// 틀이고, 단추는 감싸는 상자가 탭 · 낭독을 집니다(Android 접근성 탭 다리 — ADR-0125).
export function ChatAccessGate({ access, onSignIn, faces }: ChatAccessGateProps): ReactNode {
  const copy = useUiCopy().messengerChat.access;
  const label = copy.signIn;
  const handleTap = () => {
    "background only";
    playSound("button");
    onSignIn();
  };
  return (
    <view className="messenger-list-empty" data-testid={ids.gate} data-access={access}>
      <view className="messenger-access-faces" accessibility-elements-hidden={true}>
        {faces.map((face, index) => (
          <view
            key={`${index}-${face}`}
            className={`messenger-access-face${index === 0 ? " messenger-access-face-first" : ""}`}
          >
            <text className="messenger-access-face-text">{face}</text>
          </view>
        ))}
      </view>
      <text
        className="messenger-list-empty-title"
        flatten={false}
        accessibility-element={true}
        accessibility-traits="header"
      >
        {copy.signInTitle}
      </text>
      <text className="messenger-list-empty-body" flatten={false} accessibility-element={true}>
        {copy.signInBody}
      </text>
      <view
        className="messenger-list-empty-go"
        data-testid={ids.signIn}
        flatten={false}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={label}
        accessibility-enable-tap={true}
        bindtap={handleTap}
      >
        {/* 안쪽 단추는 모양만 — 펴지면 Android가 숨김을 잃고 단추 이름을 한 번 더 읽어 펴지 않습니다(기기 확인). */}
        <view flatten={false} accessibility-elements-hidden={true}>
          <Button label={label} variant="brand" size="l" />
        </view>
      </view>
    </view>
  );
}
