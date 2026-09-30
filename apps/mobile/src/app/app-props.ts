// `App`이 받는 props의 합입니다. 씨앗(`AppSeedProps`)은 테스트 · 부팅 자리가 바꿔 끼우는 값입니다.

import type { AnalyticsUserAppProps } from "../lib/analytics.contract";
import type { EntryAppProps } from "../lib/entry-flow";
import type { PhoneSignInVisibility } from "../screens/login/login.contract";
import type {
  EpisodeFinalTest,
  EpisodeFinalUnitId,
} from "../screens/episode-final/episode-final.contract";
import type {
  EpisodeIntroAppProps,
  EpisodeIntroUnitId,
  EpisodePrologue,
} from "../screens/episode-intro/episode-intro.contract";
import type { MessengerAppProps } from "../screens/messenger/messenger.contract";
import type { NotificationAppProps } from "../screens/notifications/notifications.contract";
import type { PhoneCallAppProps } from "../screens/phone-call/phone-call.contract";
import type { SettingsAppProps } from "../screens/settings/settings.contract";
import type { VisualNovelAppProps } from "../screens/visual-novel/visual-novel.contract";
import type { AppJourneySeed } from "./journey-progress";

export type AppSeedProps = {
  readonly journeySeed?: AppJourneySeed;
  /**
   * 이미 끝낸 표지 **유닛**입니다. 없으면 빈 목록 — 그러면 그 에피소드의 나머지 유닛이 전부
   * 잠긴 채로 섭니다(D6). 표지 뒤의 동작을 보려는 자리가 씁니다. 제품 진입점은 주지 않습니다.
   */
  readonly completedEpisodeIntroIds?: readonly EpisodeIntroUnitId[];
  /**
   * 에피소드의 서사 전개를 찾는 함수입니다. 없으면 제품의 표(`episodePrologueFor`)를 씁니다.
   * 다른 형식(통화 · 메신저)의 서사를 보려는 자리가 바꿔 끼웁니다.
   */
  readonly episodePrologueFor?: (episodeId: string) => EpisodePrologue | undefined;
  /** 최종 테스트를 찾는 함수입니다. 없으면 제품의 표(`episodeFinalTestFor`)를 씁니다. */
  readonly episodeFinalTestFor?: (unitId: EpisodeFinalUnitId) => EpisodeFinalTest;
  /** 부팅할 때 가진 젬 수(기본 0)입니다. 결제가 없어 젬이 늘 길이 없으므로 integration만 씁니다. */
  readonly initialGemCount?: number;
  /** 로그인의 전화번호 수단입니다. 없으면 제품 값(`productPhoneSignIn` — 지금은 숨김)입니다. */
  readonly phoneSignIn?: PhoneSignInVisibility;
};

export type AppProps = MessengerAppProps &
  VisualNovelAppProps &
  PhoneCallAppProps &
  NotificationAppProps &
  SettingsAppProps &
  EntryAppProps &
  EpisodeIntroAppProps &
  AnalyticsUserAppProps &
  AppSeedProps;
