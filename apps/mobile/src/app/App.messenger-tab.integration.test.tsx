import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import { keyboardRowsInsetStyle } from "../lib/keyboard-dock";
import { App } from "./App";
import {
  isTabSelected,
  listRowOrder,
  navigatorItemIds,
  openTab,
  present,
  pressSystemBack,
  resetMessengerChatSource,
  stubBackHost,
  tapId,
  tapRound,
  textOf,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed, legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { expectJourneyMapHidden } from "./test-helpers/tab-keep-alive";

// `integration` 계층(MC-I1 · MC-I2 · MC-I6): 메신저 탭의 결선 — 바 항목 넷 · 목록 ↔ 방 이동 · 바 · 시스템 뒤로 ·
// 셸 모드(방 = keyboard-dock, 목록 = padded). 실제 App · navReducer · BottomNavigator · AppHeader · 메신저 두 화면 ·
// 가짜 출처 싱글턴이 맞물립니다. 목킹은 호스트 경계(NativeModules)뿐입니다.
// 출처 씨앗(chat-fixture.ts): 미나(안 읽음 2) · 사장님 · 익선 게스트하우스(안 읽음 1) · 점원(잠김).

const listScreen = "messenger-list-screen";
const roomScreen = "messenger-chat-screen";
const row = (id: string) => `messenger-list-row-${id}`;

beforeEach(async () => {
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ------------------------------------------------------------------ MC-I1 · 탭

test("MC-I1. 로그인 뒤 바 항목은 여정 · 롤플레이 · 메신저 · 설정 넷이 이 순서로 선다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);

  expect(navigatorItemIds()).toEqual(["journey", "roleplay", "messenger", "settings"]);
});

test("MC-I1. 메신저 탭을 누르면 채팅 목록이 서고 탭 표시가 메신저로 옮겨 간다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  expect(present(listScreen)).toBe(false);

  openTab("messenger");

  expect(screen.getByTestId(listScreen)).toBeInTheDocument();
  expect(textOf("messenger-list-title")).toBe("Chats");
  expect(isTabSelected("messenger")).toBe(true);
  expect(isTabSelected("journey")).toBe(false);
});

test("MC-I1. 목록은 씨앗의 방을 최근 먼저로 놓고 잠긴 방을 맨 끝에 둔다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);

  openTab("messenger");

  expect(listRowOrder()).toEqual(["mina", "guesthouse", "owner", "clerk"]);
  expect(screen.getByTestId(row("clerk")).getAttribute("data-locked")).toBe("true");
  expect(screen.getByTestId(row("mina")).getAttribute("data-locked")).not.toBe("true");
});

test("MC-I1. 다른 탭에 갔다 메신저 탭으로 돌아오면 목록이 다시 서고 그 탭의 화면은 사라진다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");

  openTab("settings");
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(present(listScreen)).toBe(false);

  openTab("messenger");
  expect(screen.getByTestId(listScreen)).toBeInTheDocument();
  expect(present("settings-screen-title")).toBe(false);
  expect(listRowOrder()).toEqual(["mina", "guesthouse", "owner", "clerk"]);
});

test("MC-I1. 메신저 탭에 있는 동안에도 여정 맵은 숨김 상자에 그대로 남는다(keep-alive)", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  const map = screen.getByTestId("journey-map-screen");

  openTab("messenger");

  expect(screen.getByTestId(listScreen)).toBeInTheDocument();
  expectJourneyMapHidden();
  expect(screen.getByTestId("journey-map-screen")).toBe(map);

  openTab("journey");
  expect(screen.getByTestId("journey-map-screen")).toBe(map);
  expect(present(listScreen)).toBe(false);
});

test("MC-I1. 목록 루트에서 시스템 뒤로를 누르면 다른 탭 루트와 같이 여정 맵이 서고 처리됨으로 응답한다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  expect(screen.getByTestId(listScreen)).toBeInTheDocument();

  const token = pressSystemBack();

  expect(host.respond).toHaveBeenCalledTimes(1);
  expect(host.respond).toHaveBeenCalledWith(token, "handled");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(present(listScreen)).toBe(false);
  expect(isTabSelected("journey")).toBe(true);
});

test("MC-I1. 메신저 루트에는 전역 머리(AppHeader · top-bar)가 없고 바텀 네비게이션만 선다(사용자 결정 2026-11-09 — 앞선 결정 ④를 뒤집음)", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);

  openTab("messenger");

  expect(screen.queryByTestId("app-header")).not.toBeInTheDocument();
  expect(screen.queryByTestId("top-bar-streak")).not.toBeInTheDocument();
  expect(screen.queryByTestId("top-bar-trophy")).not.toBeInTheDocument();
  expect(screen.queryByTestId("top-bar-notifications")).not.toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator")).toBeInTheDocument();
  // 목록 자기 머리(제목 + 엽전 칩)가 맨 위(안전 영역 아래)에 선다.
  expect(screen.getByTestId("messenger-list-header")).toBeInTheDocument();
});

test("MC-I1. 목록의 엽전 칩 값은 앱의 보유 엽전(받은 유닛 × 10)이다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeedWithCoins(90)} />);

  openTab("messenger");

  expect(textOf("messenger-list-coins")).toContain("90");
});

test("MC-I1. 잔액이 0이면 엽전 칩도 0이다 — 자리 표시 상수를 쓰지 않는다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);

  openTab("messenger");

  const chip = textOf("messenger-list-coins");
  expect(chip).toContain("0");
  expect(chip).not.toContain("120");
});

test("MC-I1. 목록의 엽전 칩을 누르면 엽전 상점이 서고 닫으면 목록으로 돌아온다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeedWithCoins(90)} />);
  openTab("messenger");

  tapId("messenger-list-coins");
  expect(screen.getByTestId("coin-shop-screen")).toBeInTheDocument();

  tapRound("coin-shop-screen-close");
  expect(present("coin-shop-screen")).toBe(false);
  expect(screen.getByTestId(listScreen)).toBeInTheDocument();
});

// ------------------------------------------------------------------ MC-I2 · 목록 ↔ 방

test("MC-I2. 열린 줄을 누르면 방이 서고 바텀 네비게이션과 전역 머리는 내려간다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  expect(screen.getByTestId("ui-lynx-bottom-navigator")).toBeInTheDocument();

  tapId(row("mina"));

  expect(screen.getByTestId(roomScreen)).toBeInTheDocument();
  expect(textOf("messenger-chat-title")).toBe("미나");
  expect(present(listScreen)).toBe(false);
  expect(present("ui-lynx-bottom-navigator")).toBe(false);
  expect(present("app-header")).toBe(false);
});

test("MC-I2. 잠긴 줄을 눌러도 방은 열리지 않는다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");

  tapId(row("clerk"));

  expect(present(roomScreen)).toBe(false);
  expect(screen.getByTestId(listScreen)).toBeInTheDocument();
});

test("MC-I2. 방의 머리 뒤로를 누르면 목록과 바가 다시 서고 탭 표시는 메신저다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  tapId(row("mina"));
  expect(screen.getByTestId(roomScreen)).toBeInTheDocument();

  tapRound("messenger-chat-back");

  expect(screen.getByTestId(listScreen)).toBeInTheDocument();
  expect(present(roomScreen)).toBe(false);
  expect(screen.getByTestId("ui-lynx-bottom-navigator")).toBeInTheDocument();
  // 메신저 목록에는 전역 머리가 없다(사용자 결정 2026-11-09).
  expect(present("app-header")).toBe(false);
  expect(isTabSelected("messenger")).toBe(true);
});

test("MC-I2. 다시 방을 열고 시스템 뒤로를 누르면 목록이 서고 처리됨으로 응답하며 바가 다시 선다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  tapId(row("owner"));
  expect(screen.getByTestId(roomScreen)).toBeInTheDocument();

  const token = pressSystemBack();

  expect(host.respond).toHaveBeenCalledTimes(1);
  expect(host.respond).toHaveBeenCalledWith(token, "handled");
  expect(screen.getByTestId(listScreen)).toBeInTheDocument();
  expect(present(roomScreen)).toBe(false);
  expect(screen.getByTestId("ui-lynx-bottom-navigator")).toBeInTheDocument();
  expect(isTabSelected("messenger")).toBe(true);
});

test("MC-I2. 방에서 겹침(사이드바)이 열려 있으면 시스템 뒤로는 그 겹침만 닫고 방은 남는다", async () => {
  const host = stubBackHost();
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  tapId(row("mina"));
  tapRound("messenger-chat-settings");
  expect(screen.getByTestId("messenger-chat-sidebar")).toBeInTheDocument();

  const first = pressSystemBack();
  expect(host.respond).toHaveBeenLastCalledWith(first, "handled");
  expect(present("messenger-chat-sidebar")).toBe(false);
  expect(screen.getByTestId(roomScreen)).toBeInTheDocument();

  const second = pressSystemBack();
  expect(host.respond).toHaveBeenLastCalledWith(second, "handled");
  expect(screen.getByTestId(listScreen)).toBeInTheDocument();
});

test("MC-I2. 방에서 돌아와 다른 탭을 눌렀다 메신저로 오면 방이 아니라 목록이 선다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  tapId(row("mina"));
  tapRound("messenger-chat-back");

  openTab("roleplay");
  openTab("messenger");

  expect(screen.getByTestId(listScreen)).toBeInTheDocument();
  expect(present(roomScreen)).toBe(false);
});

// ------------------------------------------------------------------ MC-I6 · 셸 가장자리

const ios = { safeAreaInsets: { top: 59, bottom: 34, left: 6, right: 8 } };

function setHostInsets(value: unknown): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

const shellStyle = () => screen.getByTestId("app-shell").style;

test("MC-I6. 방에서는 셸이 위 인셋만 잡고 아래 · 좌 · 우는 0이다(keyboard-dock)", async () => {
  setHostInsets(ios);
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  tapId(row("mina"));
  expect(screen.getByTestId(roomScreen)).toBeInTheDocument();

  expect(shellStyle().paddingTop).toBe("59px");
  expect(shellStyle().paddingBottom).toBe("0px");
  expect(shellStyle().paddingLeft).toBe("0px");
  expect(shellStyle().paddingRight).toBe("0px");
});

test("MC-I6. 방의 학습 키보드 키 줄 묶음은 호스트 인셋의 아래 · 좌 · 우를 이어받는다", async () => {
  setHostInsets(ios);
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  tapId(row("mina"));
  // 방은 키보드가 닫힌 채 열리므로 입력 칸을 눌러 학습 키보드를 엽니다.
  tapId("messenger-chat-field");

  const rows = screen.getByTestId("messenger-keyboard-rows");
  expect({
    marginBottom: rows.style.marginBottom,
    marginLeft: rows.style.marginLeft,
    marginRight: rows.style.marginRight,
  }).toEqual(keyboardRowsInsetStyle({ bottom: 34, left: 6, right: 8 }));
  expect(rows.style.marginBottom).toBe("34px");
});

test("MC-I6. 목록은 padded다 — 셸이 위 · 좌 · 우 인셋을 잡고 바텀 네비게이션이 선다", async () => {
  setHostInsets(ios);
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);

  openTab("messenger");

  expect(screen.getByTestId(listScreen)).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator")).toBeInTheDocument();
  expect(shellStyle().paddingTop).toBe("59px");
  expect(shellStyle().paddingLeft).toBe("6px");
  expect(shellStyle().paddingRight).toBe("8px");
});

test("MC-I6. 방에서 목록으로 돌아오면 셸 좌 · 우 인셋이 다시 잡힌다", async () => {
  setHostInsets(ios);
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  tapId(row("mina"));
  expect(shellStyle().paddingLeft).toBe("0px");

  tapRound("messenger-chat-back");

  expect(shellStyle().paddingLeft).toBe("6px");
  expect(shellStyle().paddingRight).toBe("8px");
});
