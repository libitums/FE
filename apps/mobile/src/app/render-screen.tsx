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
import { renderCatalogStory } from "./render-catalog-story";
import { renderEntryScreen, renderGuestLoginScreen } from "./render-entry-screen";
import { settingsAccountStateOf } from "../screens/settings/settings";
import { DownloadSettingsScreen } from "../screens/download-settings/DownloadSettingsScreen";
import { LanguageSelectScreen } from "../screens/language-select/LanguageSelectScreen";
import { entryLanguageLabel } from "../lib/entry-language";
import { learnerSettingsSummary, renderLearnerProfileSettings } from "./render-learner-profile";
import {
  renderChatMemories,
  renderChatSettings,
  renderMessengerChat,
  renderMessengerList,
  messengerAccessFor,
} from "./render-messenger-chat";
import { NewFriendMapHost } from "./render-new-friend";
import { renderRoleplayStory } from "./render-roleplay-story";
import { renderPlans } from "./render-plans";
import type { ScreenWiring } from "./screen-wiring";

export function renderScreen(screen: Screen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "journey-map":
      return renderJourneyMap(wiring, true);
    case "roleplay-list":
      return (
        <RoleplayListScreen
          sections={wiring.roleplaySections}
          onSelectItem={wiring.onStartRoleplayUnit}
          onViewAll={wiring.onViewAllRoleplayEpisode}
          onLayerChange={wiring.onScreenLayerChange}
        />
      );
    case "messenger-list":
      return renderMessengerList(wiring, screen.notice ?? null);
    // 방 · 대화 설정 · 기억은 메신저를 쓸 수 있는 계정에만 그립니다 — 아니면 목록 자리의 안내로 대신합니다(ADR-0128 리뷰
    // W1: 남은 선톡 알림 · 시험 표시가 꺼진 뒤 열려 있던 화면).
    case "messenger-chat":
    case "chat-settings":
    case "chat-memories": {
      if (messengerAccessFor(wiring) !== "open") return renderMessengerList(wiring, null);
      if (screen.name === "messenger-chat") return renderMessengerChat(screen.roomId, wiring);
      if (screen.name === "chat-settings") return renderChatSettings(wiring);
      return renderChatMemories(screen.characterId, screen.characterName, wiring);
    }
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
          languageSummary={entryLanguageLabel(wiring.entryLanguage)}
          appVersion={wiring.appVersion}
          sessionOptions={wiring.sessionOptions}
          onToggleSessionOption={wiring.onToggleSessionOption}
          account={settingsAccountStateOf(wiring.accountState)}
          onSignIn={wiring.onSignIn}
          onSignOut={wiring.onSignOut}
          onDeleteAccount={wiring.onDeleteAccount}
          onLayerChange={wiring.onScreenLayerChange}
          onOpenChatSettings={
            messengerAccessFor(wiring) === "open" ? wiring.messengerChat.onOpenChatSettings : null
          }
          onOpenPlans={
            wiring.plans === undefined ? null : () => wiring.plans?.openPlans("settings", null)
          }
        />
      );
    case "plans":
      return renderPlans(screen, wiring);
    case "profile":
      return <AccountProfileScreen onExit={wiring.onExitSettingsStack} />;
    case "learner-profile":
      return renderLearnerProfileSettings(wiring);
    case "download-settings":
      return (
        <DownloadSettingsScreen {...wiring.downloadSettings} onBack={wiring.onExitSettingsStack} />
      );
    case "language-settings":
      return (
        <LanguageSelectScreen
          selected={wiring.entryLanguage}
          onSelect={wiring.onChangeUiLanguage}
          onContinue={wiring.onExitSettingsStack}
          onBack={wiring.onExitSettingsStack}
          showSteps={false}
        />
      );
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
    case "catalog-story":
      return renderCatalogStory(screen, wiring);
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
    // 비회원이 설정 › 「로그인」으로 여는 로그인 화면입니다(ADR-0111).
    case "guest-login":
      return renderGuestLoginScreen(wiring);
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}

/**
 * 여정맵 화면 — 탭 루트 사이에서는 셸이 숨겨 둔 채 `active={false}`로도 그립니다(ADR-0106). 막간을 끝내고 돌아온 맵이면
 * 새 친구 시트가 맵 위에 섭니다(`NewFriendMapHost` — 마운트 때 한 번 정함).
 */
export function renderJourneyMap(wiring: ScreenWiring, active: boolean) {
  return (
    <NewFriendMapHost wiring={wiring} active={active}>
      <JourneyMapScreen
        active={active}
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
          onTapPending: wiring.onTapPendingEpisode,
          ...(wiring.catalogFreshness === undefined ? {} : { freshness: wiring.catalogFreshness }),
          ...(wiring.onCheckNewStories === undefined
            ? {}
            : { onCheckNew: wiring.onCheckNewStories }),
          coverImageUrlOf: wiring.episodeContent.imageUrlOf,
        }}
      />
    </NewFriendMapHost>
  );
}
