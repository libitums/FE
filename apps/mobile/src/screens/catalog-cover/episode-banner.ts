// 배너의 순수 판정 — 유지 시간 · 문구 고르기 · 모션 변형 · 닫힘 가드.

import type { Motion } from "@libitums/ui-lynx/motion";

import type {
  CatalogCoverCopy,
  EpisodeBannerKind,
  EpisodeBannerMotion,
} from "./catalog-cover.contract";

/** 배너가 스스로 닫히기까지의 시간(ms)입니다. */
export const EPISODE_BANNER_HOLD_MS = 1600;

export type EpisodeBannerCopy = Pick<
  CatalogCoverCopy,
  "episodeStart" | "episodeClear" | "episodeContinue"
>;

/** `start` → `episodeStart`, `clear` → `episodeClear`, `continue` → `episodeContinue`. */
export function episodeBannerTextOf(kind: EpisodeBannerKind, copy: EpisodeBannerCopy): string {
  if (kind === "start") return copy.episodeStart;
  return kind === "clear" ? copy.episodeClear : copy.episodeContinue;
}

/** `standard` → `reward`, `reduced` → `fade`. */
export function episodeBannerMotionOf(motion: Motion): EpisodeBannerMotion {
  return motion === "reduced" ? "fade" : "reward";
}

/** `episode-banner-screen-text episode-banner-screen-text-motion-<motion>`. */
export function episodeBannerTextClassName(motion: EpisodeBannerMotion): string {
  return `episode-banner-screen-text episode-banner-screen-text-motion-${motion}`;
}

export type EpisodeBannerDoneGuard = { done: boolean };

/** 처음 부르면 `true`를 내고 가드를 닫습니다. 그 뒤로는 `false`. */
export function claimEpisodeBannerDone(guard: EpisodeBannerDoneGuard): boolean {
  if (guard.done) return false;
  guard.done = true;
  return true;
}
