// `App`이 받는 props의 합입니다. 씨앗(`AppSeedProps`)은 테스트 · 부팅 자리가 바꿔 끼우는 값입니다.

import type { AnalyticsUserAppProps } from "../lib/analytics.contract";
import type { CatalogProgress } from "../lib/catalog-progress";
import type { EntryAppProps } from "../lib/entry-flow";
import type { PhoneSignInVisibility } from "../screens/login/login.contract";
import type { EpisodeIntroAppProps } from "../screens/episode-intro/episode-intro.contract";
import type { NotificationAppProps } from "../screens/notifications/notifications.contract";
import type { SettingsAppProps } from "../screens/settings/settings.contract";
import type { LegacyTutorialRecord } from "./legacy-tutorial-progress";

/** 부팅할 때의 진행 씨앗입니다 — 둘 다 없으면 빈 진행입니다. */
export type AppProgressSeed = {
  /** 옛 튜토리얼의 얼린 기록입니다. 옛 앱 사용자를 흉내 낼 때 씁니다. */
  readonly legacyTutorial?: LegacyTutorialRecord;
  readonly catalogProgress?: CatalogProgress;
};

export type AppSeedProps = {
  /** 부팅할 때의 진행입니다(integration · 개발 확인). 제품 진입점은 주지 않습니다. */
  readonly progressSeed?: AppProgressSeed;
  /** 부팅할 때 가진 젬 수(기본 0)입니다. 결제가 없어 젬이 늘 길이 없으므로 integration만 씁니다. */
  readonly initialGemCount?: number;
  /** 로그인의 전화번호 수단입니다. 없으면 제품 값(`productPhoneSignIn` — 지금은 숨김)입니다. */
  readonly phoneSignIn?: PhoneSignInVisibility;
};

export type AppProps = NotificationAppProps &
  SettingsAppProps &
  EntryAppProps &
  EpisodeIntroAppProps &
  AnalyticsUserAppProps &
  AppSeedProps;
