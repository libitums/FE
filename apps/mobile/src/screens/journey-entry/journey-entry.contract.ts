import type { EntryLanguage } from "../../lib/entry-language";

/**
 * 셸이 넘기는 가려지는 가장자리입니다. **이 화면은 셸의 안쪽 여백을 받지 않습니다** —
 * 그림이 화면 끝까지 깔려야 하는 유일한 학습 밖 화면이라, 여백을 셸이 잡으면 위 · 아래에
 * 그림이 닿지 않는 띠가 남습니다(기기에서 그렇게 보였습니다).
 *
 * 그래서 가장자리를 피하는 일을 **글자 묶음이 스스로** 집니다. 그림과 Fog는 그대로 끝까지
 * 갑니다.
 */
export type JourneyEntrySafeArea = {
  readonly top: number;
  readonly bottom: number;
};

export type JourneyEntryScreenProps = {
  readonly safeArea: JourneyEntrySafeArea;
  readonly language: EntryLanguage;
  readonly onEnter: () => void;
  /** 좌상단 뒤로가기(2026-09-21 디자인 반영)입니다. 없으면 그리지 않습니다. */
  readonly onBack?: () => void;
};

export type JourneyEntryTestId =
  | "journey-entry-screen-background"
  | "journey-entry-screen-header"
  | "journey-entry-screen-title"
  | "journey-entry-screen-display"
  | "journey-entry-screen-separator"
  | "journey-entry-screen-caption"
  | "journey-entry-screen-notice"
  | "journey-entry-screen-language"
  | "journey-entry-screen-start";
