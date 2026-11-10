import type { LearnerProfile } from "../lib/placeholder-fill";
import { type SafeAreaInsets, zeroSafeAreaInsets } from "../lib/safe-area";
import { catalogLessonPlanFor } from "./catalog-lesson-plan";
import type { CatalogActivityForm } from "./catalog-lesson-types";
import type { EpisodeContent } from "./episode-content";
import { isFullBleedScreen, shellInsetsFor as routeShellInsetsFor } from "./full-bleed-screens";
import type { Screen } from "./nav-state";

/** 셸이 화면에 대해 비우는 가장자리입니다. */
export type ShellEdgeMode = "padded" | "keyboard-dock" | "full-bleed";

/** `ScreenWiring`이 구조적으로 만족합니다. */
export type ShellEdgeSource = {
  readonly episodeContent: EpisodeContent;
  readonly learnerFill: LearnerProfile;
};

/**
 * 탭 루트 위에 겹치는 전역 머리(AppHeader — 연속 학습 · 트로피 · 티켓 칩 · 알림)를 그 화면에서 그릴지입니다.
 * 메신저 목록은 자기 머리(제목 + 엽전 칩)만 쓰고 안전 영역 바로 아래에서 시작합니다(사용자 결정 2026-11-09, ADR-0113 결정 ④ 뒤집음).
 */
export function appHeaderVisibleOn(screen: Screen): boolean {
  return screen.name !== "messenger-list";
}

/** 화면별 셸 가장자리 처리를 정합니다. */
export function shellEdgeModeFor(
  screen: Screen,
  catalogActivityForm: CatalogActivityForm | null,
): ShellEdgeMode {
  if (isFullBleedScreen(screen)) return "full-bleed";
  if (screen.name === "catalog-lesson" && catalogActivityForm === "typing") return "keyboard-dock";
  // 자유 대화 방은 키보드 자리 · 입력 줄이 아래 · 좌 · 우 인셋을 집니다(messenger-chat-ui spec §7.2).
  if (screen.name === "messenger-chat") return "keyboard-dock";
  return "padded";
}

/** 모드에 따라 셸이 잡을 인셋을 정합니다. */
export function shellInsetsFor(mode: ShellEdgeMode, insets: SafeAreaInsets): SafeAreaInsets {
  if (mode === "full-bleed") return zeroSafeAreaInsets;
  if (mode === "keyboard-dock") return { ...zeroSafeAreaInsets, top: insets.top };
  return insets;
}

/** 카탈로그 레슨의 현재 활동 형식입니다. 해당 없으면 `null`. */
export function catalogActivityFormOf(
  screen: Screen,
  content: EpisodeContent,
  profile: LearnerProfile,
): CatalogActivityForm | null {
  if (screen.name !== "catalog-lesson") return null;
  const plan = catalogLessonPlanFor(content, screen.episodeId, screen.unitKey, profile);
  return plan?.activities[screen.activityIndex]?.form ?? null;
}

/** 화면 · 인셋 · 출처에서 셸 인셋을 한 번에 정합니다. 자판 화면이 아니면 route 규칙(그림 화면 0 · 여정 맵 위 0)을 따릅니다. */
export function shellInsetsOf(
  screen: Screen,
  insets: SafeAreaInsets,
  source: ShellEdgeSource,
): SafeAreaInsets {
  const form = catalogActivityFormOf(screen, source.episodeContent, source.learnerFill);
  const mode = shellEdgeModeFor(screen, form);
  return mode === "keyboard-dock"
    ? shellInsetsFor(mode, insets)
    : routeShellInsetsFor(screen, insets);
}
