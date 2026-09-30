import { learningPassCriterionForStep } from "./learning-assessment";
// `Screen` 유니온을 화면 컴포넌트로 옮기는 `switch` 하나를 소유합니다. `never`
// 망라가 여기 섭니다 — 값(`initialCompletedStepCount` · `journeyStepOrdinal` ·
// `completeStep`)은 App이 읽어 props로 내립니다. 화면끼리는 타입만 공유합니다.

import { judgeAssessment } from "../screens/assessment/assessment";
import { CultureScreen } from "../screens/culture/CultureScreen";
import { cultureNarrativeForStep } from "../screens/culture/culture";
import { CultureQuizScreen } from "../screens/culture-quiz/CultureQuizScreen";
import { HandwritingProbeScreen } from "../screens/handwriting-probe/HandwritingProbeScreen";
import { JourneyMapScreen } from "../screens/journey-map/JourneyMapScreen";
import { journeyStepOrdinal } from "../screens/journey-map/journey-map";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import { ListeningScreen } from "../screens/listening/ListeningScreen";
import { MessengerScreen } from "../screens/messenger/MessengerScreen";
import {
  messengerCompletionStatus,
  messengerConversationFor,
} from "../screens/messenger/messenger";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { PhoneCallScreen } from "../screens/phone-call/PhoneCallScreen";
import {
  getPhoneCallConversation,
  phoneCallCompletionStatus,
} from "../screens/phone-call/phone-call";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { RoleplayEpisodeScreen } from "../screens/roleplay-list/RoleplayEpisodeScreen";
import { RoleplayListScreen } from "../screens/roleplay-list/RoleplayListScreen";
import { findRoleplaySection } from "../screens/roleplay-list/roleplay-list";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { SpeechProbeScreen } from "../screens/speech-probe/SpeechProbeScreen";
import { VisualNovelScreen } from "../screens/visual-novel/VisualNovelScreen";
import { visualNovelStoryFor } from "../screens/visual-novel/visual-novel";
import { profileList } from "./app-content";
import type { Screen } from "./nav-state";
import { renderShellLearningScreen, renderWordChoiceScreen } from "./render-learning-screen";
import { renderMessengerCompleteScreen } from "./render-messenger-complete";
import { renderEpisodeIntroFlow } from "./render-episode-intro";
import { renderEntryScreen } from "./render-entry-screen";
import { renderEpisodeFinalFlow } from "./render-episode-final";
import { renderRoleplayUnitScreen } from "./render-roleplay-screen";
import type { ScreenWiring } from "./screen-wiring";

export function renderScreen(screen: Screen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "journey-map":
      return (
        <JourneyMapScreen
          completedStepCount={wiring.completedStepCount}
          onStartStep={wiring.onStartStep}
          completedEpisodeIntroIds={wiring.completedEpisodeIntroIds}
          onStartEpisodeIntroUnit={wiring.onStartEpisodeIntroUnit}
          completedMessengerUnitIds={wiring.completedMessengerUnitIds}
          onStartMessengerUnit={wiring.onStartMessengerUnit}
          completedPhoneCallUnitIds={wiring.completedPhoneCallUnitIds}
          onStartPhoneCallUnit={wiring.onStartPhoneCallUnit}
          completedVisualNovelUnitIds={
            wiring.visualNovelProgress.status === "completed" ? ["cafe-arrival-visual-novel"] : []
          }
          onStartVisualNovelUnit={wiring.onStartVisualNovelUnit}
          completedEpisodeFinalIds={wiring.completedEpisodeFinalIds}
          onStartEpisodeFinal={wiring.onStartEpisodeFinal}
          onLayerChange={wiring.onScreenLayerChange}
        />
      );
    case "roleplay-list":
      // 구획은 App이 진행에서 파생해 내리고, 선택은 `onStartRoleplayUnit`으로 올립니다.
      return (
        <RoleplayListScreen
          sections={wiring.roleplaySections}
          onSelectItem={wiring.onStartRoleplayUnit}
          onViewAll={wiring.onViewAllRoleplayEpisode}
          onLayerChange={wiring.onScreenLayerChange}
        />
      );
    case "roleplay-episode": {
      // 없는 에피소드는 데이터 오류라 숨기지 않고 던집니다 — 이 route를 여는 자리는
      // 구획 머리 하나뿐이고, 거기서 온 id는 구획에 반드시 있습니다.
      const section = findRoleplaySection(wiring.roleplaySections, screen.episodeId);
      if (section === undefined) {
        throw new Error(`롤플레이 구획에 없는 에피소드입니다: ${screen.episodeId}`);
      }
      return (
        <RoleplayEpisodeScreen
          section={section}
          onSelectItem={wiring.onStartRoleplayUnit}
          onExit={wiring.onExitRoleplayEpisode}
        />
      );
    }
    case "settings":
      return (
        <SettingsScreen
          sessionOptions={wiring.sessionOptions}
          onSelectNavTarget={wiring.onSelectNavTarget}
          onToggleSessionOption={wiring.onToggleSessionOption}
          onSignOut={wiring.onSignOut}
          onDeleteAccount={wiring.onDeleteAccount}
          onLayerChange={wiring.onScreenLayerChange}
        />
      );
    // 모듈 상수(`profileList`)를 그대로 그리고, 나가기는 설정 탭 스택의 루트로 곧장
    // 닿습니다. 방침 · 약관은 route가 아니라 앱 위 브라우저입니다(ADR-0033).
    case "profile":
      return <ProfileScreen items={profileList} onExit={wiring.onExitSettingsStack} />;
    case "episode-intro":
    case "episode-prologue":
    case "episode-prologue-complete":
      return renderEpisodeIntroFlow(screen, wiring);
    case "notifications":
      return (
        <NotificationsScreen
          items={wiring.notifications}
          onSelectItem={wiring.onSelectNotification}
          onDeleteItem={wiring.onDeleteNotification}
          onExit={wiring.onExitNotifications}
        />
      );
    case "listening":
      return (
        <ListeningScreen
          stepId={screen.stepId}
          onExit={wiring.onExitLearning}
          onFinish={(id, results, skippedCount) =>
            wiring.onFinishLearning(id, screen.activityIndex, results, skippedCount)
          }
          // App의 `sessionOptions` 상태로 결선합니다 — 이 경로가 유일한
          // 소비자입니다.
          sessionOptions={wiring.sessionOptions}
          gemCount={wiring.gemCount}
        />
      );
    // ⟨2026-09-28⟩ **통과도 미통과도 같은 화면입니다.** 갈리는 것은 화면이 아니라
    // 그 화면 안의 셋입니다(표식 · 제목 · 보상). 판정은 셸(`onFinishLearning`)과
    // 같은 순수 함수 · 같은 상수로 다시 냅니다. 연속 · 트로피는 규칙이 없어 0입니다.
    case "assessment": {
      const verdict = judgeAssessment(screen.results, learningPassCriterionForStep(screen.stepId));
      return (
        <LessonCompleteScreen
          results={screen.results}
          skippedCount={screen.skippedCount}
          verdict={verdict}
          streakDays={0}
          trophyCount={0}
          diamondCount={wiring.gemCount}
          reward={lessonRewardPlaceholder}
          onExit={wiring.onExitAssessment}
          // 미통과에서만 씁니다 — 같은 스텝을 첫 활동부터 새로 엽니다. 맵을 거쳐
          // 노드를 다시 누르는 것과 같은 일이고, 그 길을 한 번에 줄인 것입니다.
          onRetry={() => wiring.onStartStep(screen.stepId)}
        />
      );
    }
    case "culture":
      return (
        <CultureScreen
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          narrative={cultureNarrativeForStep(screen.stepId)}
          onExit={wiring.onExitCulture}
          onStartQuiz={() => wiring.onStartCultureQuiz(screen.stepId)}
        />
      );
    // 문화 퀴즈입니다. `onExit`은 학습 화면 셋이 쓰는 그 콜백을 그대로 씁니다
    // — 하는 일이 문자 그대로 같습니다. 그 하는 일은 `back` 하나가 아니라
    // 활성 스택의 루트로 곧장 닿는 것입니다(ADR-0007 D6). `onFinish`가 없습니다
    // — 판정이 화면 밖으로 나가지 않습니다.
    case "culture-quiz":
      return (
        <CultureQuizScreen
          stepId={screen.stepId}
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          onExit={wiring.onExitLearning}
        />
      );
    // 결선은 `onStartStep`이 `learningFormForStep`을 거쳐 `learningScreenFor`가
    // 돌려주는 화면을 push하므로 이 case들이 실제로 열립니다. 학습 화면은 props가 같지만
    // `Record`나 공통 렌더 헬퍼로 묶지 않습니다 — 묶으면 `switch`의 exhaustiveness가 죽고,
    // 그것이 이 저장소가 「빠진 결선」을 컴파일 타임에 잡는 유일한 장치입니다. 분기의
    // 중복은 그 장치의 가격이지 결함이 아닙니다.
    case "sentence-order":
    case "speaking":
    case "writing":
      return renderShellLearningScreen(screen, wiring);
    case "word-choice":
      return renderWordChoiceScreen(screen, wiring);
    case "messenger":
      return (
        <MessengerScreen
          conversation={messengerConversationFor(screen.unitId)}
          completionStatus={messengerCompletionStatus(
            wiring.completedMessengerUnitIds,
            screen.unitId,
          )}
          exitTo="journey"
          onExit={(outcome) => wiring.onMessengerExit(screen.unitId, outcome)}
          onComplete={wiring.onMessengerComplete}
          onFinish={wiring.onMessengerFinish}
        />
      );
    case "messenger-complete":
      return renderMessengerCompleteScreen(screen, wiring);
    case "phone-call":
      return (
        <PhoneCallScreen
          unitId={screen.unitId}
          conversation={getPhoneCallConversation()}
          completionStatus={phoneCallCompletionStatus(
            wiring.completedPhoneCallUnitIds,
            screen.unitId,
          )}
          exitTo="journey"
          onComplete={wiring.onPhoneCallComplete}
          onExit={wiring.onPhoneCallExit}
        />
      );
    case "visual-novel":
      return (
        <VisualNovelScreen
          story={visualNovelStoryFor(screen.unitId)}
          progress={wiring.visualNovelProgress}
          exitTo="journey"
          onAdvance={wiring.onVisualNovelAdvance}
          onExit={wiring.onVisualNovelExit}
          onReplay={wiring.onVisualNovelReplay}
        />
      );
    // 롤플레이 route 셋입니다. `renderRoleplayUnitScreen`이 연습 경계를 진
    // 매개변수 타입으로 세 화면을 잇습니다.
    case "roleplay-messenger":
    case "roleplay-phone-call":
    case "roleplay-visual-novel":
      return renderRoleplayUnitScreen(screen, wiring.roleplay);
    // 진입 흐름 화면 여섯입니다 — 스플래시부터 여정 입구까지가 한 흐름이라
    // `render-entry-screen.tsx`가 한 자리에서 집니다.
    case "splash":
    case "onboarding":
    case "login":
    case "verification-code":
    case "language-select":
    case "journey-entry":
      return renderEntryScreen(screen, wiring);
    case "episode-final":
    case "episode-final-complete":
      return renderEpisodeFinalFlow(screen, wiring);
    // `never` 망라가 이 case를 강제합니다. 결선이 없습니다 — 탐침 화면은 props도
    // 콜백도 받지 않습니다. **아무 코드도 이 화면을 push하지 않습니다** — 닿으려면
    // `navigation.ts`가 둔 개발용 부팅 상태(`handwritingProbeNav`)를 바꿔 끼웁니다.
    case "handwriting-probe":
      return <HandwritingProbeScreen />;
    // 위 case와 같은 자리·같은 근거입니다 — 결선이 없고 **아무 코드도 이 화면을 push하지 않습니다.**
    case "speech-probe":
      return <SpeechProbeScreen />;
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
