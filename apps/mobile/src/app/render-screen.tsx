// `Screen` 유니온을 화면 컴포넌트로 옮기는 `switch` 하나를 소유합니다. `never` 망라가 여기 섭니다 —
// 값은 App이 읽어 props로 내립니다. 화면끼리는 타입만 공유합니다.

import { HandwritingProbeScreen } from "../screens/handwriting-probe/HandwritingProbeScreen";
import { JourneyMapScreen } from "../screens/journey-map/JourneyMapScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { AccountProfileScreen } from "../screens/profile/AccountProfileScreen";
import { FeedbackScreen } from "../screens/feedback/FeedbackScreen";
import { RoleplayEpisodeScreen } from "../screens/roleplay-list/RoleplayEpisodeScreen";
import { RoleplayListScreen } from "../screens/roleplay-list/RoleplayListScreen";
import { findRoleplaySection } from "../screens/roleplay-list/roleplay-list";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { SpeechProbeScreen } from "../screens/speech-probe/SpeechProbeScreen";
import type { Screen } from "./nav-state";
import { renderCatalogFlow } from "./render-catalog";
import { renderCatalogCover } from "./render-catalog-cover";
import { renderEntryScreen } from "./render-entry-screen";
import { learnerSettingsSummary, renderLearnerProfileSettings } from "./render-learner-profile";
import { renderRoleplayStory } from "./render-roleplay-story";
import type { ScreenWiring } from "./screen-wiring";

export function renderScreen(screen: Screen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "journey-map":
      return (
        <JourneyMapScreen
          statusBarInset={wiring.safeAreaInsets.top}
          onLayerChange={wiring.onScreenLayerChange}
          progressLoad={wiring.journeyMapProgressLoad}
          catalog={{
            sections: wiring.catalogSections,
            progress: wiring.catalogProgress,
            ...(wiring.catalogTicketUnits === undefined
              ? {}
              : { ticketUnits: wiring.catalogTicketUnits }),
            legacyTutorialPassed: wiring.legacyTutorialPassed,
            onStartCover: wiring.onStartCatalogCover,
            onStartUnit: wiring.onStartCatalogUnit,
            unitItemCountOf: wiring.catalogUnitItemCountOf,
          }}
        />
      );
    case "roleplay-list":
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
          onSelectNavTarget={wiring.onSelectNavTarget}
          learnerProfileSummary={learnerSettingsSummary(wiring)}
          appVersion={wiring.appVersion}
          onSignOut={wiring.onSignOut}
          onDeleteAccount={wiring.onDeleteAccount}
          onLayerChange={wiring.onScreenLayerChange}
        />
      );
    case "profile":
      return <AccountProfileScreen onExit={wiring.onExitSettingsStack} />;
    case "learner-profile":
      return renderLearnerProfileSettings(wiring);
    case "feedback":
      return (
        <FeedbackScreen onSubmit={wiring.onSubmitFeedback} onExit={wiring.onExitSettingsStack} />
      );
    case "notifications":
      return (
        <NotificationsScreen
          items={wiring.notifications}
          onSelectItem={wiring.onSelectNotification}
          onDeleteItem={wiring.onDeleteNotification}
          onExit={wiring.onExitNotifications}
        />
      );
    // 진입 흐름 화면 여덟입니다 — 스플래시부터 여정 입구까지가 한 흐름이라
    // `render-entry-screen.tsx`가 한 자리에서 집니다.
    case "splash":
    case "onboarding":
    case "login":
    case "verification-code":
    case "learner-name":
    case "learner-country":
    case "language-select":
    case "journey-entry":
    case "update-required":
      return renderEntryScreen(screen, wiring);
    case "catalog-cover":
      return renderCatalogCover(screen, wiring);
    case "catalog-lesson":
    case "catalog-final":
    case "catalog-unit-complete":
    case "catalog-epilogue":
      return renderCatalogFlow(screen, wiring);
    // `never` 망라가 이 case를 강제합니다. 결선이 없습니다 — 탐침 화면은 props도
    // 콜백도 받지 않습니다. **아무 코드도 이 화면을 push하지 않습니다** — 닿으려면
    // `navigation.ts`가 둔 개발용 부팅 상태(`handwritingProbeNav`)를 바꿔 끼웁니다.
    case "handwriting-probe":
      return <HandwritingProbeScreen />;
    // 위 case와 같은 자리·같은 근거입니다 — 결선이 없고 **아무 코드도 이 화면을 push하지 않습니다.**
    case "speech-probe":
      return <SpeechProbeScreen />;
    case "roleplay-story":
    case "roleplay-story-complete":
      return renderRoleplayStory(screen, wiring);
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
