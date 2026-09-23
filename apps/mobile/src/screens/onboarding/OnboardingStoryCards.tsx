import type { ReactNode } from "@lynx-js/react";

import { Card } from "@libitums/ui-lynx/card";
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";

import storyBackground from "./assets/story-background.png";
import storyCharacter from "./assets/story-character.png";

import "./onboarding-story-cards.css";

/** 온보딩 첫 스텝의 카드 둘(배경 그림 카드, 대화 카드)을 그립니다. 상태를 갖지 않습니다. */
export function OnboardingStoryCards(): ReactNode {
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

      {/* 둘째 카드: 상대 → 나 → 상대 순의 대화 버블 셋입니다. 문구는 임시입니다. */}
      <view
        className="onboarding-screen-card-slot onboarding-screen-chat"
        data-testid="onboarding-screen-chat"
      >
        <Card>
          <Card.Content>
            <view className="onboarding-screen-chat-list">
              <ChatBubble
                direction="incoming"
                speaker="Staff"
                message="어서 오세요! 찾으시는 거 있으세요?"
                translation="Welcome! Are you looking for anything?"
                size="s"
                contentLanguage="learning"
                languageTag="ko"
              />
              <ChatBubble
                direction="outgoing"
                speaker="Me"
                message="선크림 있어요?"
                translation="Do you have sunscreen?"
                size="s"
                contentLanguage="learning"
                languageTag="ko"
              />
              <ChatBubble
                direction="incoming"
                speaker="Staff"
                message="네, 이쪽으로 오세요."
                translation="Yes, come this way."
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
