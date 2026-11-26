import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";

import { PurchasePill } from "../../components/PurchasePill";
import { UiCopyContext, uiCopyFor } from "../../lib/ui-copy";
import type { UiLanguage } from "../../lib/ui-copy.contract";
import { CoinShopScreen } from "./CoinShopScreen";

// `ui` 계층(CD-U1 ~ U2): 엽전 수의 세 자리 묶음 기호가 화면 언어의 관례다(2026-11-19 l10n 점검 — es · id · vi에서 「1,240」은
// 1.24로 읽힌다). 상점 보유 · 팩 카드 · 구매 뒤 알약.

afterEach(cleanup);

const inLanguage = (language: UiLanguage, children: ReactNode) =>
  render(<UiCopyContext.Provider value={uiCopyFor(language)}>{children}</UiCopyContext.Provider>);

test("CD-U1. 베트남어 상점 — 보유 1.240 · 팩 1.200, 쉼표 없음", () => {
  inLanguage("vi", <CoinShopScreen coinBalance={1240} onClose={vi.fn()} />);
  const balance = screen.getByTestId("coin-shop-screen-balance").textContent ?? "";
  expect(balance).toContain("1.240");
  const packs = screen.getAllByTestId(/^coin-shop-pack-/).map((node) => node.textContent ?? "");
  expect(packs.join("|")).toContain("1.200");
  expect(`${balance}${packs.join("|")}`).not.toMatch(/\d,\d{3}/);
});

test("CD-U2. 인도네시아어 알약 · 일본어 알약 — 각 언어의 묶음 기호", () => {
  inLanguage("id", <PurchasePill pill={{ kind: "added", coins: 3000 }} theme="dark" />);
  expect(screen.getByTestId("purchase-pill").textContent).toContain("3.000");
  cleanup();
  inLanguage("ja", <PurchasePill pill={{ kind: "added", coins: 3000 }} theme="dark" />);
  expect(screen.getByTestId("purchase-pill").textContent).toContain("3,000");
});

test("CD-U3. 태국어 · 미얀마어 상점 — 보유 1,240 · 팩 1,200(쉼표 묶음), 팩 카드 글은 영어가 아니다(ADR-0158 개정)", () => {
  inLanguage("en", <CoinShopScreen coinBalance={1240} onClose={vi.fn()} />);
  const englishPacks = screen
    .getAllByTestId(/^coin-shop-pack-/)
    .map((node) => node.textContent ?? "");
  cleanup();
  for (const language of ["th", "my"] as const) {
    inLanguage(language, <CoinShopScreen coinBalance={1240} onClose={vi.fn()} />);
    const balance = screen.getByTestId("coin-shop-screen-balance").textContent ?? "";
    expect(balance, language).toContain("1,240");
    const packs = screen.getAllByTestId(/^coin-shop-pack-/).map((node) => node.textContent ?? "");
    expect(packs.join("|"), language).toContain("1,200");
    expect(packs, language).not.toEqual(englishPacks);
    cleanup();
  }
});

test("CD-U4. 대만 중국어 상점 — 보유 1,240 · 팩 1,200(쉼표 묶음), 팩 카드 글은 영어가 아니고 한자다(ADR-0185)", () => {
  inLanguage("en", <CoinShopScreen coinBalance={1240} onClose={vi.fn()} />);
  const englishPacks = screen
    .getAllByTestId(/^coin-shop-pack-/)
    .map((node) => node.textContent ?? "");
  cleanup();
  inLanguage("zh-TW", <CoinShopScreen coinBalance={1240} onClose={vi.fn()} />);
  expect(screen.getByTestId("coin-shop-screen-balance").textContent ?? "").toContain("1,240");
  const packs = screen.getAllByTestId(/^coin-shop-pack-/).map((node) => node.textContent ?? "");
  expect(packs.join("|")).toContain("1,200");
  expect(packs).not.toEqual(englishPacks);
  expect(packs.join("|")).toMatch(/[\u4e00-\u9fff]/u);
});
