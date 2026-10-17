import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { journeySeedBefore } from "./test-helpers/journey-seed";
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

const tutorialSpecialIds = [
  "tutorial-intro",
  "appointment-confirmation",
  "appointment-confirmation-phone-call",
  "cafe-arrival-visual-novel",
  "tutorial-final-test",
] as const;

const special = (id: string) => screen.getByTestId(`ui-lynx-special-unit-${id}`);
const labelOf = (id: string) => screen.getByTestId(`journey-special-unit-label-${id}`);
const seed = journeySeedBefore("appointment-confirmation");
const narrativeScreenIds = ["messenger-screen", "phone-call-screen", "visual-novel-screen"];

describe("SPI1. 새 설치 부팅", () => {
  test("표지만 available이고 나머지 튜토리얼 스페셜 넷은 default이며 잠긴 메신저를 눌러도 맵에 남는다", async () => {
    await renderSignedInApp(<App />);

    expect(special("tutorial-intro")).toHaveAttribute("data-status", "available");
    for (const id of tutorialSpecialIds.slice(1)) {
      expect(special(id)).toHaveAttribute("data-status", "default");
      expect(special(id)).toHaveAttribute("accessibility-traits", "disabled");
    }

    fireEvent.tap(special("appointment-confirmation"), {});

    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("messenger-screen")).not.toBeInTheDocument();
  });

  test("스텝 노드는 스페셜이 아닌 LearningUnit으로 남는다", async () => {
    await renderSignedInApp(<App />);

    expect(screen.getByTestId("ui-lynx-learning-unit-greeting")).toBeInTheDocument();
    expect(screen.queryByTestId("ui-lynx-special-unit-greeting")).not.toBeInTheDocument();
  });
});

describe("SPI2. 표지를 끝낸 진행", () => {
  test("메신저가 available(brand)이고 전화 · 비주얼 노벨은 차례를 기다리며 표지는 clear(correct)이다", async () => {
    await renderSignedInApp(
      <App journeySeed={seed} completedEpisodeIntroIds={["tutorial-intro"]} />,
    );

    expect(special("appointment-confirmation")).toHaveAttribute("data-status", "available");
    expect(labelOf("appointment-confirmation")).toHaveClass("journey-special-unit-label-brand");
    for (const id of ["appointment-confirmation-phone-call", "cafe-arrival-visual-novel"]) {
      expect(special(id)).toHaveAttribute("data-status", "default");
      expect(labelOf(id)).toHaveClass("journey-special-unit-label-muted");
    }
    expect(special("tutorial-intro")).toHaveAttribute("data-status", "clear");
    expect(labelOf("tutorial-intro")).toHaveClass("journey-special-unit-label-correct");
    expect(special("tutorial-final-test")).toHaveAttribute("data-status", "default");
  });

  test("열린 메신저를 누르면 메신저 화면이 선다", async () => {
    await renderSignedInApp(
      <App journeySeed={seed} completedEpisodeIntroIds={["tutorial-intro"]} />,
    );

    fireEvent.tap(special("appointment-confirmation"), {});

    expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  });

  test("잠긴 튜토리얼 최종을 눌러도 어느 서사 화면도 서지 않는다", async () => {
    await renderSignedInApp(
      <App journeySeed={seed} completedEpisodeIntroIds={["tutorial-intro"]} />,
    );

    fireEvent.tap(special("tutorial-final-test"), {});

    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    for (const id of narrativeScreenIds) expect(screen.queryByTestId(id)).not.toBeInTheDocument();
  });
});

describe("SPI3. 튜토리얼 최종을 통과한 진행의 카탈로그", () => {
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
  test("튜토리얼 스페셜의 이름은 special, 로 시작하고 상태 접미사가 붙되 story는 없다", async () => {
    await renderSignedInApp(<App />);

    expect(special("appointment-confirmation")).toHaveAttribute(
      "accessibility-label",
      "special, A Message from Minseo, locked",
    );
    expect(special("tutorial-intro")).toHaveAttribute(
      "accessibility-label",
      "special, Episode intro",
    );
    expect(special("tutorial-final-test")).toHaveAttribute(
      "accessibility-label",
      "special, Final test, locked",
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
