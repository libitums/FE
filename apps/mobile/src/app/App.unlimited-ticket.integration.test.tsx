import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { setTesterAccessActive } from "../lib/tester-access";
import { App } from "./App";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// 「세션 갱신 → 시험 계정 표시(ADR-0085) → 머리 무제한 칩(ADR-0115) → 무제한 모달 시험 계정 판」을 App 한 트리에서
// 봅니다. 대역은 저장소 · fetch뿐입니다. 일반 계정은 지금 티켓 모달이 그대로 열립니다(회귀).

afterEach(() => {
  cleanup();
  setTesterAccessActive(false);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jwt(payload: Record<string, unknown>): string {
  return `${base64Url({ alg: "none" })}.${base64Url(payload)}.sig`;
}

test("IU1. 시험 계정이면 머리 칩이 무제한 칩이고, 누르면 시험 계정 판이 열리며 Got it이 닫는다", async () => {
  await renderSignedInApp(<App />, {
    refreshedAccessToken: jwt({ sub: "tester-1", app_metadata: { duru_tester: true } }),
  });

  await vi.waitFor(() => expect(screen.getByTestId("top-bar-tickets-infinity")).toBeTruthy());
  const chip = screen.getByTestId("top-bar-tickets");
  expect(chip).toHaveAttribute("accessibility-label", "Unlimited tickets");
  expect(chip).toHaveAttribute("accessibility-traits", "button");

  act(() => {
    fireEvent.tap(chip);
  });
  expect(screen.getByTestId("unlimited-ticket-modal-plan")).toHaveTextContent("GUEST PASS");
  expect(screen.queryByTestId("ticket-modal")).not.toBeInTheDocument();
  // 모달이 떠 있는 동안 머리는 낭독에서 빠지고, 닫으면 돌아옵니다(ADR-0016 D9).
  expect(screen.getByTestId("app-header")).toHaveAttribute("accessibility-elements-hidden", "true");

  act(() => {
    fireEvent.tap(screen.getByTestId("unlimited-ticket-modal-got-it"));
  });
  expect(screen.queryByTestId("unlimited-ticket-modal")).not.toBeInTheDocument();
  expect(screen.getByTestId("app-header")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

test("IU2. 일반 계정은 숫자 칩이고, 누르면 지금 티켓 모달이 열린다", async () => {
  await renderSignedInApp(<App />, { refreshedAccessToken: jwt({ sub: "user-42" }) });

  await vi.waitFor(() => expect(screen.getByTestId("top-bar-tickets")).toBeTruthy());
  expect(screen.queryByTestId("top-bar-tickets-infinity")).not.toBeInTheDocument();

  act(() => {
    fireEvent.tap(screen.getByTestId("top-bar-tickets"));
  });
  expect(screen.getByTestId("ticket-modal")).toBeInTheDocument();
  expect(screen.queryByTestId("unlimited-ticket-modal")).not.toBeInTheDocument();
});
