// 에피소드 서사 표지의 타입 전용 계약입니다 — 구현 · JSX를 두지 않습니다.

import type { SafeAreaInsets } from "../../lib/safe-area";
import type { JourneyStepId } from "../journey-map/journey-map";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";

/**
 * 표지를 넘긴 뒤 열 유닛입니다. 표지는 에피소드의 유닛을 **처음 여는 순간** 그 앞에
 * 끼어듭니다 — 사용자가 누른 것은 유닛이고, 표지를 지나면 그 유닛이 열립니다.
 */
export type EpisodeIntroTarget =
  | { readonly kind: "step"; readonly stepId: JourneyStepId }
  | { readonly kind: "messenger"; readonly unitId: MessengerUnitId }
  | { readonly kind: "phone-call"; readonly unitId: PhoneCallUnitId }
  | { readonly kind: "visual-novel"; readonly unitId: VisualNovelUnitId };

export type EpisodeIntroScreenProps = {
  /**
   * 가장자리 여백입니다. 이 화면은 배경을 상태바 · 홈 인디케이터 뒤까지 깔고, 글자와
   * 버튼만 이 여백 안에 둡니다 — 셸이 여백을 잡으면 셸 배경이 띠로 남아 장면을 끊습니다.
   */
  readonly insets: SafeAreaInsets;
  /** 첫 줄입니다 — `Episode 0.` */
  readonly label: string;
  /** 둘째 줄입니다 — 에피소드의 이름입니다. */
  readonly title: string;
  /** 표지를 보지 않은 것으로 두고 맵으로 돌아갑니다. 다음에 유닛을 열면 다시 뜹니다. */
  readonly onBack: () => void;
  /** 확인 모달에서 `건너뛰기`를 골랐을 때만 불립니다. `Skip`을 누른 것만으로는 불리지 않습니다. */
  readonly onSkip: () => void;
  readonly onNext: () => void;
};

export type EpisodeIntroTestId =
  | "episode-intro-screen"
  | "episode-intro-screen-safe"
  | "episode-intro-screen-back"
  | "episode-intro-screen-heading"
  | "episode-intro-screen-label"
  | "episode-intro-screen-title"
  | "episode-intro-screen-skip"
  | "episode-intro-screen-next"
  | "episode-intro-screen-confirm";
