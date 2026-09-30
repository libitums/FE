import { AppSession } from "../app/AppSession";
import { initialNav } from "../app/nav-state";
import { productJourneySeed } from "../app/journey-progress";

// 개발 전용: 인증 화면을 생략하고 진척 0의 실제 AppSession으로 전체 여정을 확인합니다.
// 저장된 로그인 상태를 만들거나 바꾸지 않습니다. 화면·진행·해금·음성은 제품 구현입니다.
export function TutorialJourneyFixture({ onExit }: { onExit: () => void }) {
  return (
    <AppSession
      start={initialNav}
      exit={null}
      onLeaveApp={onExit}
      journeySeed={{ ...productJourneySeed, completedStepCount: 0 }}
    />
  );
}
