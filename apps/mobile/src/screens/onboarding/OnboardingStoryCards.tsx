import type { ReactNode } from "@lynx-js/react";

import { Card } from "@libitums/ui-lynx/card";
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";

import { useUiCopy } from "../../lib/ui-copy";
import storyBackground from "../../assets/onboarding/convenience-store-alley.webp";
import storyCharacter from "../../assets/onboarding/doyun.webp";

import "./onboarding-story-cards.css";

/**
 * 온보딩 첫 스텝의 카드 둘(배경 그림 카드, 대화 카드)을 그립니다. 상태를 갖지 않습니다.
 * 배경은 에피소드 1 편의점 앞 골목, 인물은 도윤입니다(ADR-0159).
 */
// 카드 속 대화의 한국어 대사입니다 — 학습 콘텐츠라 UI 언어를 따르지 않습니다(한글 리터럴 검사의 허용 선언).
const onboardingStoryMessages = {
  atStore: "저 지금 편의점 앞이에요. 뭐 마실래요?",
  water: "물 한 병 사 주세요!",
  onMyWay: "좋아요. 금방 갈게요!",
} as const;

export function OnboardingStoryCards(): ReactNode {
  const copy = useUiCopy();
  const chat = copy.onboarding.storyChat;
  return (
    <view className="onboarding-screen-cards" data-testid="onboarding-screen-cards">
      {/* 첫 카드: 배경 그림이 카드를 채우고, 인물이 카드보다 커서 위로 튀어나옵니다.
          인물은 카드(Media가 모서리로 자릅니다) 밖 형제로 둬야 잘리지 않습니다.
          그림 카드는 순수 장식입니다. `<image>`는 기본 접근성 정지라서(ADR-0016 D5)
          인물 그림이 이름 없는 정지로 남지 않도록 래퍼가 자손을 통째로 가립니다. */}
      <view
        className="onboarding-screen-card-slot onboarding-screen-hero"
        data-testid="onboarding-screen-hero"
        accessibility-elements-hidden={true}
      >
        <Card>
          <Card.Media>
            <image
              className="onboarding-screen-hero-background"
              src={storyBackground}
              mode="aspectFill"
            />
          </Card.Media>
        </Card>
        <image className="onboarding-screen-hero-character" src={storyCharacter} mode="aspectFit" />
      </view>

      {/* 둘째 카드: 도윤 → 나 → 도윤 순의 대화 버블 셋입니다. */}
      <view
        className="onboarding-screen-card-slot onboarding-screen-chat"
        data-testid="onboarding-screen-chat"
      >
        <Card>
          <Card.Content>
            <view className="onboarding-screen-chat-list">
              <ChatBubble
                direction="incoming"
                speaker={chat.friend}
                message={onboardingStoryMessages.atStore}
                translation={chat.atStore}
                size="s"
                contentLanguage="learning"
                languageTag="ko"
              />
              <ChatBubble
                direction="outgoing"
                speaker={copy.common.me}
                message={onboardingStoryMessages.water}
                translation={chat.water}
                size="s"
                contentLanguage="learning"
                languageTag="ko"
              />
              <ChatBubble
                direction="incoming"
                speaker={chat.friend}
                message={onboardingStoryMessages.onMyWay}
                translation={chat.onMyWay}
                size="s"
                contentLanguage="learning"
                languageTag="ko"
              />
            </view>
          </Card.Content>
        </Card>
      </view>
    </view>
  );
}
