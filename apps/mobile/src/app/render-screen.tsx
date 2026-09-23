// `Screen` 유니온을 화면 컴포넌트로 옮기는 `switch` 하나를 소유합니다. `never`
// 망라가 여기 섭니다 — 값(`initialCompletedStepCount` · `journeyStepOrdinal` ·
// `completeStep`)은 App이 읽어 props로 내립니다. 화면끼리는 타입만 공유합니다.

import { AssessmentScreen } from "../screens/assessment/AssessmentScreen";
import { CultureScreen } from "../screens/culture/CultureScreen";
import { cultureNarrativeForStep } from "../screens/culture/culture";
import { CultureQuizScreen } from "../screens/culture-quiz/CultureQuizScreen";
import { HandwritingProbeScreen } from "../screens/handwriting-probe/HandwritingProbeScreen";
import { JourneyMapScreen } from "../screens/journey-map/JourneyMapScreen";
import { journeyStepOrdinal } from "../screens/journey-map/journey-map";
import { JourneyEntryScreen } from "../screens/journey-entry/JourneyEntryScreen";
import { LanguageSelectScreen } from "../screens/language-select/LanguageSelectScreen";
import { ListeningScreen } from "../screens/listening/ListeningScreen";
import { LoginScreen } from "../screens/login/LoginScreen";
import { MessengerScreen } from "../screens/messenger/MessengerScreen";
import {
  messengerCompletionStatus,
  messengerConversationFor,
} from "../screens/messenger/messenger";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { PhoneCallScreen } from "../screens/phone-call/PhoneCallScreen";
import {
  getPhoneCallConversation,
  phoneCallCompletionStatus,
} from "../screens/phone-call/phone-call";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { RoleplayListScreen } from "../screens/roleplay-list/RoleplayListScreen";
import { SentenceOrderScreen } from "../screens/sentence-order/SentenceOrderScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { specialUnitExitLabel } from "../lib/special-unit-entry-source";
import { SpeechProbeScreen } from "../screens/speech-probe/SpeechProbeScreen";
import { SplashScreen } from "../screens/splash/SplashScreen";
import { TermsScreen } from "../screens/terms/TermsScreen";
import { VerificationCodeScreen } from "../screens/verification-code/VerificationCodeScreen";
import { VisualNovelScreen } from "../screens/visual-novel/VisualNovelScreen";
import { visualNovelStoryFor } from "../screens/visual-novel/visual-novel";
import { WordChoiceScreen } from "../screens/word-choice/WordChoiceScreen";
import { notificationList, profileList, roleplayItems, termsSectionList } from "./app-content";
import type { Screen } from "./nav-state";
import { renderRoleplayUnitScreen } from "./render-roleplay-screen";
import type { ScreenWiring } from "./screen-wiring";

export function renderScreen(screen: Screen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "journey-map":
      return (
        <JourneyMapScreen
          completedStepCount={wiring.completedStepCount}
          onStartStep={wiring.onStartStep}
          completedMessengerUnitIds={wiring.completedMessengerUnitIds}
          onStartMessengerUnit={wiring.onStartMessengerUnit}
          completedPhoneCallUnitIds={wiring.completedPhoneCallUnitIds}
          onStartPhoneCallUnit={wiring.onStartPhoneCallUnit}
          completedVisualNovelUnitIds={
            wiring.visualNovelProgress.status === "completed" ? ["cafe-arrival-visual-novel"] : []
          }
          onStartVisualNovelUnit={wiring.onStartVisualNovelUnit}
          onOpenNotifications={wiring.onOpenNotifications}
        />
      );
    case "roleplay-list":
      // 모듈 상수 `roleplayItems`를 그대로 그리고, 선택은 `onStartRoleplayUnit`으로
      // 올립니다.
      return <RoleplayListScreen items={roleplayItems} onSelectItem={wiring.onStartRoleplayUnit} />;
    case "settings":
      return (
        <SettingsScreen
          sessionOptions={wiring.sessionOptions}
          onSelectNavTarget={wiring.onSelectNavTarget}
          onToggleSessionOption={wiring.onToggleSessionOption}
        />
      );
    // 모듈 상수(`profileList`·`termsSectionList`)를 그대로 그리고, 나가기는
    // 설정 탭 스택의 루트로 곧장 닿습니다.
    case "profile":
      return <ProfileScreen items={profileList} onExit={wiring.onExitSettingsStack} />;
    case "terms":
      return <TermsScreen sections={termsSectionList} onExit={wiring.onExitSettingsStack} />;
    case "notifications":
      // 모듈 상수 `notificationList`를 그대로 그리고, 선택·나가기는 결선으로
      // 올립니다.
      return (
        <NotificationsScreen
          items={notificationList}
          onSelectItem={wiring.onSelectNotification}
          onExit={wiring.onExitNotifications}
        />
      );
    case "listening":
      return (
        <ListeningScreen
          stepId={screen.stepId}
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          onExit={wiring.onExitLearning}
          onFinish={wiring.onFinishLearning}
          // App의 `sessionOptions` 상태로 결선합니다 — 이 경로가 유일한
          // 소비자입니다.
          sessionOptions={wiring.sessionOptions}
        />
      );
    case "assessment":
      return (
        <AssessmentScreen
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          results={screen.results}
          onExit={wiring.onExitAssessment}
        />
      );
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
    // 돌려주는 화면을 push하므로 이 두 case가 실제로 열립니다. 세 학습
    // 화면은 props가 문자 그대로 같지만 `Record`나 공통 렌더 헬퍼로 묶지
    // 않습니다 — 묶으면 `switch`의 exhaustiveness가 죽고, 그 exhaustiveness가
    // 이 저장소가 「빠진 결선」을 컴파일 타임에 잡는 유일한 장치입니다. 분기
    // 셋의 중복은 그 장치의 가격이지 결함이 아닙니다.
    case "sentence-order":
      return (
        <SentenceOrderScreen
          stepId={screen.stepId}
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          onExit={wiring.onExitLearning}
          onFinish={wiring.onFinishLearning}
        />
      );
    case "word-choice":
      return (
        <WordChoiceScreen
          stepId={screen.stepId}
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          onExit={wiring.onExitLearning}
          onFinish={wiring.onFinishLearning}
        />
      );
    case "messenger":
      return (
        <MessengerScreen
          conversation={messengerConversationFor(screen.unitId)}
          completionStatus={messengerCompletionStatus(
            wiring.completedMessengerUnitIds,
            screen.unitId,
          )}
          exitLabel={specialUnitExitLabel("journey")}
          onExit={(outcome) => wiring.onMessengerExit(screen.unitId, outcome)}
          onComplete={wiring.onMessengerComplete}
          onReplay={wiring.onMessengerReplay}
        />
      );
    case "phone-call":
      return (
        <PhoneCallScreen
          unitId={screen.unitId}
          conversation={getPhoneCallConversation()}
          completionStatus={phoneCallCompletionStatus(
            wiring.completedPhoneCallUnitIds,
            screen.unitId,
          )}
          exitLabel={specialUnitExitLabel("journey")}
          onComplete={wiring.onPhoneCallComplete}
          onExit={wiring.onPhoneCallExit}
        />
      );
    case "visual-novel":
      return (
        <VisualNovelScreen
          story={visualNovelStoryFor(screen.unitId)}
          progress={wiring.visualNovelProgress}
          exitLabel={specialUnitExitLabel("journey")}
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
    // 진입 흐름 화면들입니다. 전이·이벤트·토큰 저장은 `wiring`의 콜백이 집니다
    // — 화면은 결과를 그리고 조작을 올릴 뿐입니다.
    case "splash":
      return <SplashScreen onTimeout={wiring.onSplashTimeout} />;
    case "onboarding":
      return <OnboardingScreen onComplete={wiring.onOnboardingComplete} />;
    case "login":
      return (
        <LoginScreen onSelectMethod={wiring.onSelectLoginMethod} onBack={wiring.onLoginBack} />
      );
    case "verification-code":
      return (
        <VerificationCodeScreen
          phoneNumber={screen.phoneNumber}
          onSubmit={wiring.onVerificationCodeSubmit}
          onExit={wiring.onVerificationCodeExit}
        />
      );
    case "language-select":
      return (
        <LanguageSelectScreen
          selected={wiring.entryLanguage}
          onSelect={wiring.onSelectEntryLanguage}
          onContinue={wiring.onContinueLanguageSelect}
          onBack={wiring.onLanguageSelectBack}
        />
      );
    case "journey-entry":
      return (
        <JourneyEntryScreen
          language={wiring.entryLanguage}
          onEnter={wiring.onEnterJourney}
          onBack={wiring.onJourneyEntryBack}
        />
      );
    // `never` 망라가 이 case를 강제합니다. 결선이 없습니다 — 탐침 화면은
    // props도 콜백도 받지 않고 자기 상태를 스스로 듭니다. **아무 코드도 이
    // 화면을 push하지 않습니다** — 위 진입 흐름 case들과 달리 여기로 오는
    // 전이가 한 자리도 없습니다. 여기 닿으려면 `navigation.ts`가 둔 개발용
    // 부팅 상태(`handwritingProbeNav`)를 손수 바꿔 끼워야 합니다.
    case "handwriting-probe":
      return <HandwritingProbeScreen />;
    // 위 case와 같은 자리·같은 근거입니다. `never` 망라가 이 case를 강제하고,
    // 결선은 없습니다 — 탐침 화면은 props도 콜백도 받지 않고 자기 상태를
    // 스스로 듭니다. **아무 코드도 이 화면을 push하지 않습니다.**
    case "speech-probe":
      return <SpeechProbeScreen />;
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
