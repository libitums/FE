import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { CatalogUpdateNoticeDialog } from "./CatalogUpdateNoticeDialog";
import { catalogUpdateNoticeTestIds as ids } from "./catalog-update-notice.contract";

// `ui` 계층: 업데이트 안내 대화상자 — 문구 · 체크 행 토글 · 닫기(체크 여부를 올림) · 시스템 뒤로.

afterEach(() => {
  cleanup();
});

function mount() {
  const onClose = vi.fn<(muted: boolean) => void>();
  render(<CatalogUpdateNoticeDialog onClose={onClose} />);
  return { onClose };
}
const confirm = () =>
  fireEvent.tap(within(screen.getByTestId(ids.confirm)).getByTestId("ui-lynx-button"), {});
const mute = () => screen.getByTestId(ids.mute);

test("UNU1. 제목 · 본문 · 버튼 · 체크 행을 그린다 — 에피소드 이름이나 바뀐 목록은 없다", () => {
  mount();
  const dialog = screen.getByTestId(ids.dialog);
  expect(dialog.textContent).toContain("Psst, something new! 👀");
  expect(dialog.textContent).toContain(
    "your progress is safe. Just look for the NEW tags on the map.",
  );
  expect(dialog.textContent).toContain("Cool, got it");
  expect(dialog.textContent).toContain("Don't show this again");
  expect(mute().getAttribute("accessibility-label")).toBe("Don't show this again, not checked");
});

test("UNU2. 체크하지 않고 닫으면 muted=false, 체크하고 닫으면 true — 다시 누르면 풀린다", () => {
  const { onClose } = mount();
  confirm();
  expect(onClose).toHaveBeenLastCalledWith(false);
  fireEvent.tap(mute(), {});
  expect(mute().getAttribute("accessibility-label")).toBe("Don't show this again, checked");
  confirm();
  expect(onClose).toHaveBeenLastCalledWith(true);
  fireEvent.tap(mute(), {});
  confirm();
  expect(onClose).toHaveBeenLastCalledWith(false);
});

test("UNU3. 시스템 뒤로는 닫기와 같다 — 체크 상태를 따른다", () => {
  const { onClose } = mount();
  fireEvent.tap(mute(), {});
  act(() => {
    backHandlers.runTop();
  });
  expect(onClose).toHaveBeenCalledWith(true);
});
