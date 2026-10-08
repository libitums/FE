import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { PremiumRoleplayItem, RoleplaySection } from "./roleplay-list.contract";
import { RoleplayListScreen } from "./RoleplayListScreen";

const sharedTable: PremiumRoleplayItem = {
  id: "premium-shared-table",
  title: "Can I share this table?",
  situation: "Share a table with another customer",
};

const openSection: RoleplaySection = {
  episodeId: "tutorial",
  label: "Episode 0.",
  title: "Tutorial.",
  unlocked: true,
  items: [
    { form: "messenger", unitId: "appointment-confirmation", title: "A Message from Minseo" },
  ],
  premiumItems: [sharedTable],
};

function renderList() {
  return render(
    <RoleplayListScreen sections={[openSection]} onSelectItem={vi.fn()} onViewAll={vi.fn()} />,
  );
}

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

test("[UL3] 플러스 안내 열림 → 뒤로가기는 안내만 닫는다", () => {
  renderList();
  // 안내는 보이는 잠긴 카드로 엽니다 — 이 케이스는 층 등록만 따로 봅니다.
  fireEvent.tap(screen.getByTestId("roleplay-premium-card-premium-shared-table"), {});
  expect(screen.getByTestId("roleplay-list-premium-notice")).toBeInTheDocument();

  expect(pressBack()).toBe(true);

  expect(screen.queryByTestId("roleplay-list-premium-notice")).not.toBeInTheDocument();
});

test("[UN6] 롤플레이 탭 루트(층 없음) → 등록이 없어 runTop()은 false", () => {
  renderList();

  expect(pressBack()).toBe(false);
});
