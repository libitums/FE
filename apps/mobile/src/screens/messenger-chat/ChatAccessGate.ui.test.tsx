import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { ChatAccessGate } from "./ChatAccessGate";
import { MessengerListScreen } from "./MessengerListScreen";
import { makeSource } from "./chat-ui.test-support";
import { createCoinWallet } from "./coin-wallet";

// `ui` 계층(MA-UI1 ~ UI4): 메신저 탭 접근 안내(ADR-0128).

afterEach(cleanup);

const GATE = "messenger-access-gate";
const tapIn = (id: string) =>
  fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});

test("MA-UI1 손님 — 아바타 · 제목 · 본문 · Sign up or log in, 단추는 onSignIn", () => {
  const onSignIn = vi.fn<() => void>();
  const onGoToJourney = vi.fn<() => void>();
  render(
    <ChatAccessGate
      access="sign-in"
      onSignIn={onSignIn}
      onGoToJourney={onGoToJourney}
      faces={["A", "B"]}
    />,
  );
  const gate = screen.getByTestId(GATE);
  expect(gate.getAttribute("data-access")).toBe("sign-in");
  expect(gate.textContent).toContain("Text the people you meet");
  expect(gate.textContent).toContain("Create a free account");
  // 제목 · 본문은 Android 접근성 트리에 남는다(펴지 않음) — 제목은 header.
  const title = within(gate).getByText("Text the people you meet");
  expect(title.getAttribute("flatten")).toBe("false");
  expect(title.getAttribute("accessibility-element")).toBe("true");
  expect(title.getAttribute("accessibility-traits")).toBe("header");
  const body = within(gate).getByText(/Create a free account/);
  expect(body.getAttribute("flatten")).toBe("false");
  expect(body.getAttribute("accessibility-element")).toBe("true");
  expect(gate.querySelectorAll(".messenger-access-face")).toHaveLength(2);
  tapIn("messenger-access-sign-in");
  expect(onSignIn).toHaveBeenCalledTimes(1);
  expect(onGoToJourney).not.toHaveBeenCalled();
  const button = screen.getByTestId("messenger-access-sign-in");
  expect(button.getAttribute("accessibility-enable-tap")).toBe("true");
  expect(button.getAttribute("flatten")).toBe("false");
  // 안쪽 단추를 숨긴 상자도 펴지 않는다 — 펴지면 Android가 단추 이름을 두 번 읽었다(기기 확인).
  expect(
    button.querySelector('[accessibility-elements-hidden="true"]')?.getAttribute("flatten"),
  ).toBe("false");
});

test("MA-UI2 시험 계정 아님 — Chats are almost here · Go to Journey, 단추는 onGoToJourney", () => {
  const onSignIn = vi.fn<() => void>();
  const onGoToJourney = vi.fn<() => void>();
  render(
    <ChatAccessGate
      access="coming-soon"
      onSignIn={onSignIn}
      onGoToJourney={onGoToJourney}
      faces={[]}
    />,
  );
  expect(screen.getByTestId(GATE).textContent).toContain("Chats are almost here");
  tapIn("messenger-access-journey");
  expect(onGoToJourney).toHaveBeenCalledTimes(1);
  expect(onSignIn).not.toHaveBeenCalled();
});

const listProps = (access: "open" | "sign-in" | "coming-soon") => ({
  source: makeSource(),
  coinBalance: 30,
  wallet: createCoinWallet({ earned: 30 }),
  onOpenRoom: vi.fn<(id: string) => void>(),
  onGoToJourney: vi.fn<() => void>(),
  onLayerChange: vi.fn<(open: boolean) => void>(),
  notice: null,
  onNoticeShown: vi.fn<() => void>(),
  access,
  onSignIn: vi.fn<() => void>(),
});

test("MA-UI3 목록 화면 — 손님이면 목록 · 엽전 칩 대신 안내, 시험 계정 아님이면 칩은 두고 목록 대신 안내", () => {
  render(<MessengerListScreen {...listProps("sign-in")} />);
  expect(screen.queryByTestId("messenger-list-list") === null).toBe(true);
  expect(screen.queryByTestId("messenger-list-coins") === null).toBe(true);
  expect(screen.getByTestId(GATE).getAttribute("data-access")).toBe("sign-in");
  cleanup();

  render(<MessengerListScreen {...listProps("coming-soon")} />);
  expect(screen.queryByTestId("messenger-list-list") === null).toBe(true);
  expect(screen.getByTestId("messenger-list-coins")).toBeTruthy();
  expect(screen.getByTestId(GATE).getAttribute("data-access")).toBe("coming-soon");
});

test("MA-UI4 open이면 안내 없이 지금 목록", () => {
  render(<MessengerListScreen {...listProps("open")} />);
  expect(screen.queryByTestId(GATE) === null).toBe(true);
  expect(screen.getByTestId("messenger-list-list")).toBeTruthy();
});
