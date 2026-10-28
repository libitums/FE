import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { UpdateRequiredScreen } from "./UpdateRequiredScreen";
import { announce } from "../../lib/accessibility";
import type { AppUpdateStoreOutcome } from "../../lib/app-update.contract";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

vi.mock("../../lib/accessibility", () => ({ announce: vi.fn() }));

// `ui` 계층: 강제 업데이트 화면(ADR-0086) — 제목 · 본문 · 버튼 하나, 스토어를 못 열면 실패 문구.

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderMarked(onUpdate: () => Promise<AppUpdateStoreOutcome>) {
  return render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <UpdateRequiredScreen onUpdate={onUpdate} />
    </UiCopyContext.Provider>,
  );
}

function updateButton(): HTMLElement {
  return within(screen.getByTestId("update-required-screen-update")).getByTestId("ui-lynx-button");
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

test("[UU1] 제목이 heading이고 제목 · 본문 · 버튼 라벨이 표에서 온다", () => {
  renderMarked(() => Promise.resolve("opened"));

  const title = screen.getByTestId("update-required-screen-title");
  expect(title).toHaveTextContent("⟦appUpdate.title⟧");
  expect(title).toHaveAttribute("accessibility-traits", "header");
  expect(screen.getByTestId("update-required-screen-description")).toHaveTextContent(
    "⟦appUpdate.description⟧",
  );
  // 본문 · 실패 문구는 Android TalkBack에 노출되도록 요소를 평탄화하지 않는다(접근성 F2).
  expect(screen.getByTestId("update-required-screen-description")).toHaveAttribute(
    "flatten",
    "false",
  );
  expect(screen.getByTestId("update-required-screen-body")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
  expect(updateButton()).toHaveAttribute("accessibility-label", "⟦appUpdate.update⟧");
  expect(screen.queryByTestId("update-required-screen-failure")).toBeNull();
});

test("[UU2] 나가는 수단이 없다 — 버튼은 하나뿐이다", () => {
  renderMarked(() => Promise.resolve("opened"));

  expect(screen.getAllByTestId("ui-lynx-button")).toHaveLength(1);
  expect(screen.queryByTestId("ui-lynx-round-button")).toBeNull();
});

test("[UU3] 버튼을 누르면 onUpdate가 한 번 불리고 응답까지 로딩이다", async () => {
  let settle: (outcome: AppUpdateStoreOutcome) => void = () => undefined;
  const onUpdate = vi.fn(
    () =>
      new Promise<AppUpdateStoreOutcome>((resolve) => {
        settle = resolve;
      }),
  );
  renderMarked(onUpdate);

  fireEvent.tap(updateButton(), {});
  expect(onUpdate).toHaveBeenCalledTimes(1);
  expect(updateButton()).toHaveAttribute("data-loading", "true");
  fireEvent.tap(updateButton(), {});
  expect(onUpdate).toHaveBeenCalledTimes(1);

  await act(async () => {
    settle("opened");
    await Promise.resolve();
  });
  expect(updateButton()).toHaveAttribute("data-loading", "false");
  expect(screen.queryByTestId("update-required-screen-failure")).toBeNull();
});

test.each<AppUpdateStoreOutcome>(["failed", "unconfigured", "unavailable", "malformed"])(
  "[UU4] 결과가 %s면 실패 문구가 서고 한 번 낭독한다",
  async (outcome) => {
    renderMarked(() => Promise.resolve(outcome));

    fireEvent.tap(updateButton(), {});
    await flush();

    expect(screen.getByTestId("update-required-screen-failure")).toHaveTextContent(
      "⟦appUpdate.failure⟧",
    );
    expect(screen.getByTestId("update-required-screen-failure")).toHaveAttribute(
      "flatten",
      "false",
    );
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("⟦appUpdate.failure⟧");
  },
);

test("[UU5] 실패 뒤 다시 누르면 문구가 지워지고 onUpdate가 또 불린다", async () => {
  const onUpdate = vi
    .fn<() => Promise<AppUpdateStoreOutcome>>()
    .mockResolvedValueOnce("failed")
    .mockResolvedValueOnce("opened");
  renderMarked(onUpdate);

  fireEvent.tap(updateButton(), {});
  await flush();
  expect(screen.getByTestId("update-required-screen-failure")).toBeInTheDocument();

  fireEvent.tap(updateButton(), {});
  expect(onUpdate).toHaveBeenCalledTimes(2);
  expect(screen.queryByTestId("update-required-screen-failure")).toBeNull();
  await flush();
  expect(screen.queryByTestId("update-required-screen-failure")).toBeNull();
});
