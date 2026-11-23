import { afterAll, afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { UnlimitedPass } from "../lib/unlimited-pass";
import { AppHeader } from "./AppHeader";
import type { TicketHeaderWiring } from "./use-learning-tickets";

// `ui` 계층(AH-M1, ADR-0144 2단계 후속): 구독 무제한 판의 「Manage subscription」 · 「Keep unlimited」가 스토어 구독 관리를 연다.

// 호스트 globalProps의 앱 버전(Android) — 테스트 렌더러는 첫 렌더의 globalProps를 붙들어 두므로 파일 처음에 한 번 둡니다.
const globals = lynx as unknown as { __globalProps: unknown };
const before = globals.__globalProps;
globals.__globalProps = { appVersion: { platform: "android", name: "1.4.1", build: 23 } };

// 외부 링크 모듈도 파일 처음에 한 번 세웁니다 — 탭 처리(background)가 첫 렌더의 전역을 붙들어 둡니다.
const open = vi.fn<(url: string, callback: (result: unknown) => void) => void>();
vi.stubGlobal("NativeModules", { ExternalLinkModule: { open } });

afterAll(() => {
  globals.__globalProps = before;
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  open.mockClear();
});

const tickets: TicketHeaderWiring = {
  status: { available: 2, slots: [], nextInMs: null },
  more: null,
  onGetMore: vi.fn<() => void>(),
  onModalChange: vi.fn<(open: boolean) => void>(),
  dropFrom: null,
  onDropped: vi.fn<() => void>(),
};

const header = (pass: UnlimitedPass) => (
  <AppHeader
    streakDays={1}
    trophyCount={0}
    onOpenNotifications={vi.fn<() => void>()}
    tickets={tickets}
    unlimitedPass={pass}
  />
);

const DAY = 86_400_000;
const PLAY_PREMIUM =
  "https://play.google.com/store/account/subscriptions?sku=duru.premium.monthly.v1&package=libitum.duru.android";
const premium = (autoRenews: boolean, daysLeft: number): UnlimitedPass => ({
  kind: "subscription",
  startedAtMs: Date.now() - (30 - daysLeft) * DAY,
  endsAtMs: Date.now() + daysLeft * DAY,
  autoRenews,
  planLabel: "Premium",
  productId: "duru.premium.monthly.v1",
});

// 테스트 렌더러가 첫 렌더의 전역(globalProps · NativeModules)을 붙들어 두므로 한 트리에서 판만 바꿔 가며 봅니다.
test("AH-M1 구독 판의 Manage subscription · 곧 끝남 판의 Keep unlimited → 그 구독의 Play 구독 관리", () => {
  const { rerender } = render(header(premium(true, 20)));
  act(() => {
    fireEvent.tap(screen.getByTestId("top-bar-tickets"));
  });
  act(() => {
    fireEvent.tap(screen.getByTestId("unlimited-ticket-modal-manage"));
  });
  expect(open).toHaveBeenCalledWith(PLAY_PREMIUM, expect.any(Function));

  open.mockClear();
  rerender(header(premium(false, 3)));
  act(() => {
    fireEvent.tap(screen.getByTestId("unlimited-ticket-modal-keep"));
  });
  expect(open).toHaveBeenCalledWith(PLAY_PREMIUM, expect.any(Function));
});
