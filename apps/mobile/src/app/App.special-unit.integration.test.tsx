import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import {
  boot,
  cover,
  node,
  resetApp,
  status,
  tapId,
  u01,
} from "./test-helpers/episode-format-harness";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// 실제 내장 데이터로 App을 세워 스페셜 유닛(Special Unit)의 잠김 가드 · 열림 · 끝 · 낭독 이름을 봅니다.
// 외부 인증 · 저장소 · 네트워크만 대역이고 맵 · 어댑터 · 유닛은 실물입니다.

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const U00 = "u00-tutorial";
const special = (id: string) => screen.getByTestId(`ui-lynx-special-unit-${id}`);

describe("SPI1. 새 설치 부팅", () => {
  test("u00 표지만 available이고 u00 최종은 default(disabled)이며 잠긴 최종을 눌러도 맵에 남는다", async () => {
    await renderSignedInApp(<App />);

    expect(special(`catalog-cover-${U00}`)).toHaveAttribute("data-status", "available");
    const finalNode = special(`catalog-unit-${U00}-RP`);
    expect(finalNode).toHaveAttribute("data-status", "default");
    expect(finalNode).toHaveAttribute("accessibility-traits", "disabled");

    fireEvent.tap(finalNode, {});

    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("catalog-final-screen")).not.toBeInTheDocument();
  });

  test("u00의 레슨 노드는 스페셜이 아닌 LearningUnit이다", async () => {
    await renderSignedInApp(<App />);

    expect(screen.getByTestId(`ui-lynx-learning-unit-catalog-unit-${U00}-S1`)).toBeInTheDocument();
    expect(
      screen.queryByTestId(`ui-lynx-special-unit-catalog-unit-${U00}-S1`),
    ).not.toBeInTheDocument();
  });
});

describe("SPI3. u00을 끝낸 진행의 카탈로그", () => {
  afterEach(resetApp);

  test("표지는 available이고 문화 · 최종은 default이며 레슨 · 문화는 LearningUnit이다", async () => {
    await boot({});

    expect(cover(u01)).toHaveAttribute("data-status", "available");
    expect(status(u01, "CULT")).toBe("default");
    expect(status(u01, "RP")).toBe("default");
    expect(node(u01, "CULT").getAttribute("data-testid")).toBe(
      `ui-lynx-learning-unit-catalog-unit-${u01}-CULT`,
    );
    expect(node(u01, "RP").getAttribute("data-testid")).toBe(
      `ui-lynx-special-unit-catalog-unit-${u01}-RP`,
    );
    expect(node(u01, "S1").getAttribute("data-testid")).toBe(
      `ui-lynx-learning-unit-catalog-unit-${u01}-S1`,
    );
    expect(screen.queryByTestId(`ui-lynx-special-unit-catalog-unit-${u01}-S1`)).toBeNull();
  });

  test("표지를 누르면 표지 화면이 서고 잠긴 최종은 눌러도 맵에 남는다", async () => {
    await boot({});

    tapId(`ui-lynx-special-unit-catalog-unit-${u01}-RP`);
    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

    fireEvent.tap(cover(u01), {});
    expect(screen.getByTestId("episode-intro-screen")).toBeInTheDocument();
  });
});

describe("SPI4. 실데이터 낭독 이름", () => {
  test("u00 표지 · 최종의 이름은 special, 로 시작하고 상태 접미사가 붙되 story는 없다", async () => {
    await renderSignedInApp(<App />);

    expect(special(`catalog-cover-${U00}`).getAttribute("accessibility-label")).toMatch(
      /^special, Episode 0\. /,
    );
    expect(special(`catalog-unit-${U00}-RP`)).toHaveAttribute(
      "accessibility-label",
      "special, Episode 0. Final test, locked",
    );
  });

  test("카탈로그 최종의 이름은 special, Episode 1. Final test, locked이고 문화는 special 접두가 없다", async () => {
    await boot({});

    expect(node(u01, "RP")).toHaveAttribute(
      "accessibility-label",
      "special, Episode 1. Final test, locked",
    );
    expect(node(u01, "CULT")).toHaveAttribute("accessibility-label", "Episode 1. Culture, locked");
    expect(cover(u01).getAttribute("accessibility-label")).toMatch(/^special, Episode 1\. /);
  });
});
