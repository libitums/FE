import type { EntryLanguage } from "../../lib/entry-language";

export type JourneyEntryScreenProps = {
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
