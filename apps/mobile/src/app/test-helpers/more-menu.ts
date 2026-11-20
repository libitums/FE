// integration 테스트 공용 — 설정으로 가는 길(ADR-0169: 바 넷째 ⋯ → 더보기 메뉴 › Settings). 제품 코드가 import하지 않습니다.

import { fireEvent, screen } from "@lynx-js/react/testing-library";

/** 바의 더보기 단추입니다(설정 탭 자리). */
export const moreTabTestId = "ui-lynx-bottom-navigator-item-more";

/** ⋯를 눌러 메뉴를 열고 Settings 줄을 누릅니다 — 옛 「설정 탭 누름」 자리. */
export function openSettingsFromMore(): void {
  fireEvent.tap(screen.getByTestId(moreTabTestId), {});
  fireEvent.tap(screen.getByTestId("more-menu-row-settings"), { eventType: "catchEvent" });
}

/** 탭 루트로 갑니다 — `settings`는 더보기 › Settings, 나머지는 그 탭 단추. */
export function goToTabRoot(tab: "journey" | "roleplay" | "messenger" | "settings"): void {
  if (tab === "settings") openSettingsFromMore();
  else fireEvent.tap(screen.getByTestId(`ui-lynx-bottom-navigator-item-${tab}`), {});
}
