import { afterEach, beforeEach, expect, test, vi, type MockInstance } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

// 여정 맵 화면이 첫 렌더에서만 던지게 바꿉니다. 재시도 뒤에는 원래 화면을 그립니다 —
// 항상 던지면 에러 루프라 재시도 뒤 상태를 볼 수 없습니다.
const crash = vi.hoisted(() => ({ armed: true, thrown: null as Error | null }));
vi.mock("../screens/journey-map/JourneyMapScreen", async (importOriginal) => {
  const original = await importOriginal<typeof import("../screens/journey-map/JourneyMapScreen")>();
  return {
    ...original,
    JourneyMapScreen: (props: Parameters<typeof original.JourneyMapScreen>[0]) => {
      if (crash.armed) {
        crash.armed = false;
        crash.thrown = new Error("probe-render-failure");
        throw crash.thrown;
      }
      return original.JourneyMapScreen(props);
    },
  };
});

import { App } from "./App";
import { uiCopyEn } from "../lib/ui-copy-en";
import { journeySeedBefore } from "./test-helpers/journey-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// `integration` 계층: App 루트에서 에러 경계 · 문구 컨텍스트 · 보고 통로(`lynx.reportError`)가
// 함께 서는지 봅니다. 경계 단독 동작은 `ErrorBoundary.ui.test.tsx`가 봅니다.

let reportError: MockInstance<typeof lynx.reportError>;

beforeEach(() => {
  crash.armed = true;
  crash.thrown = null;
  // 경계와 React가 잡힌 오류를 둘 다 찍습니다 — 출력이 실패처럼 보이지 않게 막고 끝나면 되돌립니다.
  vi.spyOn(console, "error").mockImplementation(() => {});
  reportError = vi.spyOn(lynx, "reportError").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("I1 화면이 렌더 중 던지면 App의 문구로 에러 화면이 뜨고 lynx.reportError가 같은 오류로 정확히 1회 불린다", async () => {
  await renderSignedInApp(<App journeySeed={journeySeedBefore("ordering")} />);

  // 던졌다는 사실부터 못 박습니다 — 이게 없으면 아래 단언이 아무 일도 없었던 화면을 보게 됩니다.
  expect(crash.thrown).not.toBeNull();
  expect(screen.getByTestId("error-boundary-title")).toHaveTextContent(
    uiCopyEn.shell.errorBoundary.title,
  );
  expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
  expect(reportError).toHaveBeenCalledTimes(1);
  expect(reportError.mock.calls[0]).toHaveLength(1);
  expect(reportError.mock.calls[0]?.[0]).toBe(crash.thrown);
});

test("I1 재시도하면 앱 셸이 다시 보이고 보고 횟수는 1 그대로다", async () => {
  await renderSignedInApp(<App journeySeed={journeySeedBefore("ordering")} />);
  expect(reportError).toHaveBeenCalledTimes(1);

  fireEvent.tap(screen.getByTestId("error-boundary-retry"), {});

  expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("error-boundary-title")).not.toBeInTheDocument();
  expect(reportError).toHaveBeenCalledTimes(1);
});

test("I1 보고 통로가 던져도 App의 에러 화면은 그대로 뜬다", async () => {
  reportError.mockImplementation(() => {
    throw new Error("channel down");
  });

  await renderSignedInApp(<App journeySeed={journeySeedBefore("ordering")} />);

  expect(reportError).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("error-boundary-title")).toBeInTheDocument();
});
