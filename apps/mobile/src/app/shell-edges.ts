import type { LearnerProfile } from "../lib/placeholder-fill";
import type { SafeAreaInsets } from "../lib/safe-area";
import type { CatalogActivityForm } from "./catalog-lesson-types";
import type { EpisodeContent } from "./episode-content";
import type { Screen } from "./nav-state";

/** 셸이 화면에 대해 비우는 가장자리입니다. */
export type ShellEdgeMode = "padded" | "keyboard-dock" | "full-bleed";

/** `ScreenWiring`이 구조적으로 만족합니다. */
export type ShellEdgeSource = {
  readonly episodeContent: EpisodeContent;
  readonly learnerFill: LearnerProfile;
};

/** 화면별 셸 가장자리 처리를 정합니다. */
export function shellEdgeModeFor(
  _screen: Screen,
  _catalogActivityForm: CatalogActivityForm | null,
): ShellEdgeMode {
  return "padded";
}

/** 모드에 따라 셸이 잡을 인셋을 정합니다. */
export function shellInsetsFor(_mode: ShellEdgeMode, insets: SafeAreaInsets): SafeAreaInsets {
  return insets;
}

/** 카탈로그 레슨의 현재 활동 형식입니다. 해당 없으면 `null`. */
export function catalogActivityFormOf(
  _screen: Screen,
  _content: EpisodeContent,
  _profile: LearnerProfile,
): CatalogActivityForm | null {
  return null;
}

/** 화면 · 인셋 · 출처에서 셸 인셋을 한 번에 정합니다. */
export function shellInsetsOf(
  _screen: Screen,
  insets: SafeAreaInsets,
  _source: ShellEdgeSource,
): SafeAreaInsets {
  return insets;
}
