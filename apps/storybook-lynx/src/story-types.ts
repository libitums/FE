import type {
  ButtonSize,
  ButtonVariant,
  ButtonWidth,
  StatusIndicatorStatus,
  RoundButtonSize,
  RoundButtonVariant,
  ProgressHeaderMotion,
  DialogMotion,
  DialogPhase,
  AnswerLabelEmphasis,
  AnswerLabelResult,
  AnswerLabelSize,
  CardDirection,
  CardPadding,
  CompactNumericInputSize,
  BottomSheetMotion,
  ChatBubbleContentLanguage,
  ChatBubbleDelivery,
  ChatBubbleDirection,
  ChatBubbleSize,
  TextFieldAvailability,
  TextFieldInputPurpose,
  VisualNovelDialogAdvance,
  VisualNovelDialogContentLanguage,
  VisualNovelDialogContinueIndicator,
  VisualNovelDialogDirection,
  VisualNovelDialogReveal,
  VisualNovelDialogStatus,
  VisualNovelDialogSurface,
  VisualNovelDialogVariant,
  TooltipAlignment,
  TooltipArrow,
  TooltipContentLanguage,
  TooltipDirection,
  TooltipPlacement,
  TooltipTone,
  TooltipVisibility,
  OptionSelectorCommit,
  OptionSelectorContentLanguage,
  OptionSelectorLayout,
  OptionSelectorSelection,
  OptionSelectorSize,
  OptionSelectorVariant,
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

export type DialogStoryArgs = {
  title: string;
  description: string;
  actionCount: 1 | 2;
  disabledLast: boolean;
  motion: DialogMotion;
  phase: DialogPhase;
  onAction: (id: string) => void;
};
export type AnswerLabelStoryArgs = {
  result: AnswerLabelResult;
  emphasis: AnswerLabelEmphasis;
  size: AnswerLabelSize;
  label: string;
  contextLabel: string;
};

export type OptionSelectorStoryArgs = {
  variant: OptionSelectorVariant;
  size: OptionSelectorSize;
  selection: OptionSelectorSelection;
  commit: OptionSelectorCommit;
  layout: OptionSelectorLayout;
  contentLanguage: OptionSelectorContentLanguage;
  longLabels: boolean;
  disabledLast: boolean;
  committed: boolean;
  onChange: (selectedIds: readonly string[]) => void;
  onCommit: (id: string) => void;
};

export type CardStoryArgs = {
  padding: CardPadding;
  interaction: "static" | "interactive";
  direction: CardDirection;
  title: string;
  overline: string;
  body: string;
  showMedia: boolean;
  onTap: (title: string) => void;
};

export type CompactNumericInputStoryArgs = {
  accessibilityLabel: string;
  defaultValue: string;
  placeholder: string;
  size: CompactNumericInputSize;
  error: boolean;
  disabled: boolean;
  onInput: (value: string) => void;
};

export type BottomSheetStoryArgs = {
  title: string;
  overline: string;
  description: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  showSecondaryAction: boolean;
  draggable: boolean;
  motion: BottomSheetMotion;
  onDismiss: (reason: string) => void;
  onAction: (id: string) => void;
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

export type TextFieldStoryArgs = {
  label: string;
  qualifier: string;
  defaultValue: string;
  placeholder: string;
  purpose: TextFieldInputPurpose;
  availability: TextFieldAvailability;
  supporting: "none" | "helper" | "error";
  supportingMessage: string;
  counterMaxLength: number;
  adornment: "none" | "icons" | "prefix-suffix" | "action";
};

export type VisualNovelDialogStoryArgs = {
  accessibilityLabel: string;
  variant: VisualNovelDialogVariant;
  surface: VisualNovelDialogSurface;
  reveal: VisualNovelDialogReveal;
  status: VisualNovelDialogStatus;
  advance: VisualNovelDialogAdvance;
  continueIndicator: VisualNovelDialogContinueIndicator;
  contentLanguage: VisualNovelDialogContentLanguage;
  direction: VisualNovelDialogDirection;
  line: string;
  speakerName: string;
  languageTag: string;
  visibleCharacterCount: number;
  showAvatar: boolean;
  reducedMotion: boolean;
};

export type TooltipStoryArgs = {
  message: string;
  placement: TooltipPlacement;
  alignment: TooltipAlignment;
  arrow: TooltipArrow;
  tone: TooltipTone;
  visibility: TooltipVisibility;
  direction: TooltipDirection;
  contentLanguage: TooltipContentLanguage;
  languageTag: string;
};
