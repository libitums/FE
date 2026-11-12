import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import message from "@libitums/icons/lynx/message";
import { Button } from "@libitums/ui-lynx/button";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { messengerAccessTestIds as ids, type MessengerAccess } from "./messenger-access";

import "./messenger-list.css";

export type ChatAccessGateProps = {
  readonly access: Exclude<MessengerAccess, "open">;
  readonly onSignIn: () => void;
  readonly onGoToJourney: () => void;
  /** 손님 안내의 아바타(최대 셋) — 대화 출처의 열린 인물 이름 첫 글자입니다. */
  readonly faces: readonly string[];
};

// 메신저 탭 목록 대신 서는 안내입니다(ADR-0128) — 손님에게 가입 권유, 시험 계정이 아닌 회원에게 「곧 열림」. 빈 목록
// 안내(`ChatListEmpty`)와 같은 틀이고, 단추는 감싸는 상자가 탭 · 낭독을 집니다(Android 접근성 탭 다리 — ADR-0125).
export function ChatAccessGate({
  access,
  onSignIn,
  onGoToJourney,
  faces,
}: ChatAccessGateProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const copy = chat.access;
  const signIn = access === "sign-in";
  const label = signIn ? copy.signIn : chat.list.goToJourney;
  const handleTap = () => {
    "background only";
    playSound("button");
    if (signIn) onSignIn();
    else onGoToJourney();
  };
  return (
    <view className="messenger-list-empty" data-testid={ids.gate} data-access={access}>
      {signIn ? (
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
      ) : (
        <view className="messenger-list-empty-circle" accessibility-elements-hidden={true}>
          <svg
            className="messenger-list-empty-icon"
            content={message}
            current-color={color.brand.primary}
          />
        </view>
      )}
      <text
        className="messenger-list-empty-title"
        flatten={false}
        accessibility-element={true}
        accessibility-traits="header"
      >
        {signIn ? copy.signInTitle : copy.comingSoonTitle}
      </text>
      <text className="messenger-list-empty-body" flatten={false} accessibility-element={true}>
        {signIn ? copy.signInBody : copy.comingSoonBody}
      </text>
      <view
        className="messenger-list-empty-go"
        data-testid={signIn ? ids.signIn : ids.journey}
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
