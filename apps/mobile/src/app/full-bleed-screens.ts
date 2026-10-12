// 셸이 여백을 잡지 않는 route 판정입니다.

import type { Screen } from "./nav-state";

export function isFullBleedScreen(screen: Screen): boolean {
  return (
    screen.name === "episode-intro" ||
    screen.name === "episode-prologue" ||
    screen.name === "episode-final" ||
    screen.name === "visual-novel" ||
    screen.name === "roleplay-visual-novel" ||
    screen.name === "journey-entry" ||
    screen.name === "catalog-cover"
  );
}
