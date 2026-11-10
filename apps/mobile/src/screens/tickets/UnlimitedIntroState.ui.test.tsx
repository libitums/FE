import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { UnlimitedIntroState, unlimitedIntroTestIds as ids } from "./UnlimitedIntroState";

// `ui` 계층(MC2-UI8 보충, spec §17 Q1): 무료 사용자용 「무제한 소개」 상태 — 얻는 것(하루 메시지 제한 없음 · 모든 레슨 열림)과
// 「Coming soon」(아직 결제 없음)을 보이고 Got it이 닫는다. 가정(구현자가 따를 것): 얻는 것 문구에 「message」가,
// comingSoon에 「coming soon」(대소문자 무시)이 든다.

afterEach(cleanup);

function mount() {
  const onClose = vi.fn<() => void>();
  render(<UnlimitedIntroState onClose={onClose} />);
  return { onClose };
}

test("MC2-UI8. 소개 판이 서고 얻는 것(메시지 제한 없음)과 Coming soon 안내를 보인다", () => {
  mount();

  const root = screen.getByTestId(ids.root);
  expect(root.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  expect(root.textContent).toMatch(/message/i);
  expect(screen.getByTestId(ids.comingSoon).textContent).toMatch(/coming soon/i);
});

test("MC2-UI8. 아직 결제가 없으므로 구독 · 구매 단추가 없다(Got it 하나)", () => {
  mount();

  expect(screen.getByTestId(ids.gotIt)).toBeTruthy();
  expect(screen.queryByTestId("unlimited-ticket-modal-manage")).toBeNull();
  expect(screen.queryByTestId("unlimited-ticket-modal-keep")).toBeNull();
});

test("MC2-UI8. Got it 탭 → onClose 한 번", () => {
  const { onClose } = mount();

  const target = screen.getByTestId(ids.gotIt);
  fireEvent.tap(target.querySelector('[data-testid="ui-lynx-button"]') ?? target, {});

  expect(onClose).toHaveBeenCalledTimes(1);
});
