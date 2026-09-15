import type {
  ButtonSize,
  ButtonVariant,
  ButtonWidth,
  StatusIndicatorStatus,
  RoundButtonSize,
  RoundButtonVariant,
  ProgressHeaderMotion,
  ChatBubbleContentLanguage,
  ChatBubbleDelivery,
  ChatBubbleDirection,
  ChatBubbleSize,
} from "@libitums/ui-lynx";
import type { BottomNavigatorPreset } from "./bottom-navigator-story";

export type BottomNavigatorStoryArgs = {
  preset: BottomNavigatorPreset;
  selectedId: string;
  disabledLast: boolean;
  viewportWidth: 320 | 390;
  onSelect: (id: string) => void;
};

export type RoundButtonIconKey = "info-02";
export type RoundButtonStoryArgs = {
  accessibilityLabel: string;
  icon: RoundButtonIconKey;
  variant: RoundButtonVariant;
  size: RoundButtonSize;
  disabled: boolean;
  loading: boolean;
  onTap: (accessibilityLabel: string) => void;
};

export type ButtonStoryArgs = {
  label: string;
  variant: ButtonVariant;
  size: ButtonSize;
  width: ButtonWidth;
  disabled: boolean;
  loading: boolean;
  onTap: (label: string) => void;
};

export type BackHeaderStoryArgs = {
  title: string;
  subtitle: string;
  showInfo: boolean;
  onBack: (title: string) => void;
  onInfo: (title: string) => void;
};

export type StatusIndicatorStoryArgs = {
  status: StatusIndicatorStatus;
  label: string;
  contextLabel: string;
};

export type ProgressHeaderStoryArgs = {
  title: string;
  activity: string;
  progress: number;
  exitAccessibilityLabel: string;
  motion: ProgressHeaderMotion;
  onExit: (title: string) => void;
};

export type PageIndicatorStoryArgs = {
  pageCount: number;
  currentPage: number;
};

export type ChatBubbleStoryArgs = {
  message: string;
  speaker: string;
  direction: ChatBubbleDirection;
  size: ChatBubbleSize;
  delivery: ChatBubbleDelivery;
  contentLanguage: ChatBubbleContentLanguage;
  languageTag: string;
};
