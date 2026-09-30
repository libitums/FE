import { useState } from "@lynx-js/react";
import { MessengerScreen } from "../screens/messenger/MessengerScreen";
import { messengerConversationFor } from "../screens/messenger/messenger";
import { PhoneCallScreen } from "../screens/phone-call/PhoneCallScreen";
import { getPhoneCallConversation } from "../screens/phone-call/phone-call";
import { VisualNovelScreen } from "../screens/visual-novel/VisualNovelScreen";
import { visualNovelStoryFor } from "../screens/visual-novel/visual-novel";
import { EpisodeFinalJourneyScreen } from "../app/EpisodeFinalJourneyScreen";
import { episodeFinalTestFor } from "../screens/episode-final/episode-final-tests";

const noop = () => undefined;

// 제품 데이터로 스페셜 세 화면과 최종 복습을 순서대로 확인하는 개발용 경로입니다.
// 완료 저장·잠금 해제는 App 통합 테스트에서 검증합니다.
export function TutorialSpecialsFixture({
  onExit,
  initialStage = 0,
}: {
  onExit: () => void;
  initialStage?: 0 | 3;
}) {
  const [stage, setStage] = useState<number>(initialStage);
  if (stage < 3)
    return (
      <view
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          paddingTop: "62px",
          paddingBottom: "34px",
        }}
      >
        <TutorialStoryStage stage={stage} setStage={setStage} onExit={onExit} />
      </view>
    );
  const review = episodeFinalTestFor("tutorial-final-test");
  if (review.format !== "visual-novel") return null;
  return (
    <EpisodeFinalJourneyScreen
      insets={{ top: 62, bottom: 34, left: 0, right: 0 }}
      episodeLabel="Episode 0."
      test={review}
      onFinish={onExit}
      onExit={onExit}
    />
  );
}

function TutorialStoryStage({
  stage,
  setStage,
  onExit,
}: {
  stage: number;
  setStage: (stage: number) => void;
  onExit: () => void;
}) {
  if (stage === 0)
    return (
      <MessengerScreen
        conversation={messengerConversationFor("appointment-confirmation")}
        completionStatus="available"
        onExit={onExit}
        onComplete={noop}
        onFinish={() => setStage(1)}
      />
    );
  if (stage === 1)
    return (
      <PhoneCallScreen
        unitId="appointment-confirmation-phone-call"
        conversation={getPhoneCallConversation()}
        completionStatus="available"
        onComplete={noop}
        onExit={() => setStage(2)}
      />
    );
  if (stage === 2)
    return (
      <VisualNovelScreen
        story={visualNovelStoryFor("cafe-arrival-visual-novel")}
        progress={{ status: "active", beatIndex: 0 }}
        onAdvance={noop}
        onReplay={noop}
        onExit={() => setStage(3)}
      />
    );
  return null;
}
