import type {
  ButtonSize,
  ButtonVariant,
  ButtonWidth,
  StatusIndicatorStatus,
  RoundButtonSize,
  RoundButtonVariant,
} from "@libitums/ui-lynx";

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
