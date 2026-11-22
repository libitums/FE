import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";

import { MotionProvider } from "@libitums/ui-lynx/motion";

import { PurchasePill } from "./PurchasePill";

// `ui` 계층(PP-1 ~ PP-4, ADR-0163 D3 · D4): 구매 뒤 확인 대기 알약 — 스피너 + 「Confirming」, 늦으면 조용한 안내, 엽전이 들어오면 「added」.
// 한 요소로 이름을 갖고, 뜰 때 · 글이 바뀔 때 한 번 낭독한다(Lynx에 live region이 없음).

const spoken = vi.hoisted(() => ({ lines: [] as string[] }));
vi.mock("../lib/accessibility", async (original) => ({
  ...(await original<typeof import("../lib/accessibility")>()),
  announce: (line: string) => {
    spoken.lines.push(line);
    return "announced";
  },
}));

beforeEach(() => {
  spoken.lines = [];
});
afterEach(() => {
  cleanup();
});

const reduced = (element: ReactNode) => <MotionProvider motion="reduced">{element}</MotionProvider>;

test("PP-1 waiting — 스피너 + 「Confirming your purchase…」, 한 요소 이름 · 낭독 한 번", () => {
  render(<PurchasePill pill={{ kind: "waiting" }} theme="dark" />);
  const pill = screen.getByTestId("purchase-pill");
  expect(pill.getAttribute("data-kind")).toBe("waiting");
  expect(pill).toHaveTextContent("Confirming your purchase…");
  expect(pill.getAttribute("accessibility-label")).toBe("Confirming your purchase…");
  expect(screen.getByTestId("purchase-pill-spinner").getAttribute("data-still")).toBe("false");
  expect(spoken.lines).toEqual(["Confirming your purchase…"]);
});

test("PP-2 late — 스피너 없이 조용한 안내, 글이 바뀌면 다시 낭독", () => {
  const view = render(<PurchasePill pill={{ kind: "waiting" }} theme="light" />);
  view.rerender(<PurchasePill pill={{ kind: "late" }} theme="light" />);
  const pill = screen.getByTestId("purchase-pill");
  expect(pill.getAttribute("data-kind")).toBe("late");
  expect(pill).toHaveTextContent("Your purchase is safe. It'll appear shortly.");
  expect(screen.queryByTestId("purchase-pill-spinner")).toBeNull();
  expect(spoken.lines).toEqual([
    "Confirming your purchase…",
    "Your purchase is safe. It'll appear shortly.",
  ]);
});

test("PP-3 added — 「+1,200 coins added」(엽전 수는 기존 서식)", () => {
  render(<PurchasePill pill={{ kind: "added", coins: 1200 }} theme="dark" />);
  const pill = screen.getByTestId("purchase-pill");
  expect(pill.getAttribute("data-kind")).toBe("added");
  expect(pill).toHaveTextContent("+1,200 coins added");
  expect(spoken.lines).toEqual(["+1,200 coins added"]);
});

test("PP-4 움직임 줄이기 — 스피너는 멈춘 고리만", () => {
  render(reduced(<PurchasePill pill={{ kind: "waiting" }} theme="dark" />));
  expect(screen.getByTestId("purchase-pill-spinner").getAttribute("data-still")).toBe("true");
});
