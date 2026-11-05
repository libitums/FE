import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { TabRootsLayout } from "./TabRootsLayout";

// `ui` 계층: 탭 루트 배치(ADR-0106 D1) — 여정이면 지도만, 다른 탭이면 지도를 숨긴 채 남기고 그 탭을 겹쳐 그린다.

afterEach(cleanup);

const mapBox = () => screen.getByTestId("app-tab-map");
const layout = (mapActive: boolean) => (
  <TabRootsLayout
    mapActive={mapActive}
    map={<text data-testid="the-map">map</text>}
    current={mapActive ? null : <text data-testid="the-tab">tab</text>}
  />
);

test("TR1. 여정이면 지도 상자가 보이고(숨김 없음) 다른 탭 상자는 없다", () => {
  render(layout(true));
  expect(mapBox().getAttribute("class")).not.toContain("app-tab-map-hidden");
  expect(mapBox()).toHaveAttribute("accessibility-elements-hidden", "false");
  expect(screen.queryByTestId("app-tab-current")).toBeNull();
  expect(screen.getByTestId("the-map")).toBeInTheDocument();
});

test("TR2. 다른 탭이면 지도는 남되 숨김 · 터치 막음 · 낭독 가림이고, 그 탭이 겹쳐 선다", () => {
  render(layout(false));
  expect(mapBox().getAttribute("class")).toContain("app-tab-map-hidden");
  expect(mapBox()).toHaveAttribute("user-interaction-enabled", "false");
  expect(mapBox()).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(screen.getByTestId("the-map")).toBeInTheDocument();
  expect(screen.getByTestId("app-tab-current")).toBeInTheDocument();
  expect(screen.getByTestId("the-tab")).toBeInTheDocument();
});

test("TR3. 숨김은 visibility(레이아웃 유지)이고 겹친 탭은 상자를 채운다", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/tab-roots.css"), "utf8");
  expect(css).toMatch(/\.app-tab-map-hidden\s*\{[^}]*visibility:\s*hidden/);
  expect(css).not.toMatch(/\.app-tab-map-hidden\s*\{[^}]*display:\s*none/);
  expect(css).toMatch(/\.app-tab-current\s*\{[^}]*position:\s*absolute/);
});
