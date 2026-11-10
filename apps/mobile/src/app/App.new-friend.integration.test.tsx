import { fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { chatFixtureSeed } from "../screens/messenger-chat/chat-fixture";
import { lessonPlan, resetApp, tapNode } from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";
import {
  advance,
  isTabSelected,
  listRowOrder,
  openTab,
  present,
  resetMessengerChatSource,
  tapId,
  tapRound,
  textOf,
} from "./test-helpers/messenger-chat-app";
import { bootBeforeFinal, exitToMap, playFinal, u01, u03 } from "./test-helpers/new-friend-app";

// `integration` 계층(MC2-I1 ~ MC2-I4): 에피소드 3(u03-mina)의 최종 테스트를 통과하면 결과 화면 위에 「새 친구」 시트가
// 서고(보상 움직임이 끝난 2.0 s 뒤 typing → 1.2 s 뒤 message), Reply가 결과 화면을 나가 메신저 탭의 미나 방(키보드 닫힘 ·
// opening이 로그에 있음)을 열며, Later · scrim은 시트만 닫는지 봅니다. 해금은 통과 순간 확정되어 시트를 못 본 채 떠나도
// 목록에 미나가 열려 있고, 이미 해금했거나 다른 에피소드 · 틀린 최종 · 레슨 결과에서는 시트가 없습니다.
// 실제 App · 카탈로그 · 최종 화면 · 결과 화면 · 메신저 두 화면 · 가짜 출처 · 해금 저장(메모리)이 맞물립니다.
// 대역은 경계뿐입니다 — `NativeModules`(저장소) · `fetch` · 가짜 타이머.

const SHEET = "new-friend-sheet";
const RESULT = "lesson-complete-screen";
const SHEET_APPEAR_MS = 2000;
const SHEET_TYPING_MS = 1200;

const minaSeed = chatFixtureSeed.rooms.find((room) => room.roomId === "mina");
const OPENING_KO = minaSeed?.opening?.ko ?? "";
const OPENING_EN = minaSeed?.opening?.en ?? "";

beforeEach(async () => {
  await resetMessengerChatSource();
});
afterEach(resetApp);

/** u03 최종을 모두 맞혀 결과 화면까지 갑니다. 이 시점부터 시계는 가짜입니다. */
async function passMinaFinal(): Promise<void> {
  await bootBeforeFinal(u03);
  playFinal(u03, 3, true);
  expect(screen.getByTestId(RESULT)).toBeInTheDocument();
}

/** 시트를 message 단계까지 띄웁니다. */
function showSheetMessage(): void {
  advance(SHEET_APPEAR_MS);
  advance(SHEET_TYPING_MS);
  expect(screen.getByTestId(SHEET).getAttribute("data-phase")).toBe("message");
}

// ------------------------------------------------------------------ MC2-I1 · 시트가 서는 시점

test("MC2-I1. 최종 통과 결과 화면에는 2000 ms 전에는 시트가 없고 2000 ms에 typing으로 선다 — 결과 화면은 그대로 아래에 있다", async () => {
  await passMinaFinal();
  expect(present(SHEET)).toBe(false);

  advance(SHEET_APPEAR_MS - 1);
  expect(present(SHEET)).toBe(false);

  advance(1);
  const sheet = screen.getByTestId(SHEET);
  expect(sheet.getAttribute("data-phase")).toBe("typing");
  expect(present("new-friend-typing")).toBe(true);
  expect(present("new-friend-message")).toBe(false);
  expect(screen.getByTestId(RESULT)).toBeInTheDocument();
});

test("MC2-I1. 시트는 typing 1200 ms 뒤 message가 되어 미나의 opening(한국어 · 영어)을 같은 자리에 보인다", async () => {
  await passMinaFinal();
  advance(SHEET_APPEAR_MS);

  advance(SHEET_TYPING_MS - 1);
  expect(screen.getByTestId(SHEET).getAttribute("data-phase")).toBe("typing");

  advance(1);
  expect(screen.getByTestId(SHEET).getAttribute("data-phase")).toBe("message");
  expect(present("new-friend-typing")).toBe(false);
  const message = textOf("new-friend-message");
  expect(OPENING_KO.length).toBeGreaterThan(0);
  expect(message).toContain(OPENING_KO);
  expect(message).toContain(OPENING_EN);
});

test("MC2-I1. 시트는 미나의 이름 · 만난 회차(Episode 3) · NEW FRIEND를 보이고 Reply는 message 단계에서 켜진다", async () => {
  await passMinaFinal();
  advance(SHEET_APPEAR_MS);

  expect(textOf("new-friend-name")).toBe("미나");
  expect(textOf("new-friend-chip")).toContain("Episode 3");
  expect(textOf("new-friend-met")).toContain("Episode 3");
  expect(screen.getByTestId(SHEET)).toHaveTextContent("NEW FRIEND");
  expect(screen.getByTestId("new-friend-reply").getAttribute("data-state")).toBe("dim");

  advance(SHEET_TYPING_MS);
  expect(screen.getByTestId("new-friend-reply").getAttribute("data-state")).toBe("lit");
});

// ------------------------------------------------------------------ MC2-I2 · Reply

test("MC2-I2. Reply: 결과 화면을 나가 메신저 탭의 미나 방이 서고, opening이 로그에 있으며 키보드는 닫혀 있다", async () => {
  await passMinaFinal();
  showSheetMessage();

  tapId("new-friend-reply");

  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
  expect(textOf("messenger-chat-title")).toBe("미나");
  expect(present(SHEET)).toBe(false);
  expect(present(RESULT)).toBe(false);
  const incoming = screen.getAllByTestId("messenger-chat-incoming");
  expect(incoming).toHaveLength(1);
  expect(incoming[0]?.textContent).toContain(OPENING_KO);
  expect(screen.getByTestId("messenger-chat-slot").getAttribute("data-content")).toBe("closed");
  expect(present("messenger-keyboard-rows")).toBe(false);
});

test("MC2-I2. Reply로 연 방에서 뒤로 가면 미나가 목록 맨 위이고 NEW가 사라지며 탭은 메신저다 — 여정 탭은 결과 화면이 아니다", async () => {
  await passMinaFinal();
  showSheetMessage();
  tapId("new-friend-reply");

  tapRound("messenger-chat-back");

  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
  expect(listRowOrder()[0]).toBe("mina");
  expect(present("messenger-list-row-mina-new")).toBe(false);
  expect(present("messenger-list-row-mina-unread")).toBe(false);
  expect(isTabSelected("messenger")).toBe(true);

  // spec §7.1-4 · test-plan MC2-I2: 여정 탭은 에필로그(있으면) 또는 맵 — u03은 에필로그 표지가 있다(구현 단계 확인).
  // 표지 화면에는 바텀 네비게이터가 없으므로 탭 선택 대신 표지와 「결과 화면이 아님」을 본다.
  openTab("journey");
  expect(present("catalog-cover-screen")).toBe(true);
  expect(present(RESULT)).toBe(false);
});

// ------------------------------------------------------------------ MC2-I3 · Later

test("MC2-I3. Later: 시트만 닫히고 결과 화면 · 「Continue story」 그대로이며, 메신저 탭의 미나 줄은 NEW · 1 · opening 미리보기다", async () => {
  await passMinaFinal();
  showSheetMessage();

  tapId("new-friend-later");

  expect(present(SHEET)).toBe(false);
  expect(screen.getByTestId(RESULT)).toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-exit")).toHaveTextContent("Continue story");

  await exitToMap();
  openTab("messenger");
  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
  expect(listRowOrder()[0]).toBe("mina");
  expect(screen.getByTestId("messenger-list-row-mina").getAttribute("data-locked")).not.toBe(
    "true",
  );
  expect(textOf("messenger-list-row-mina-new")).toContain("NEW");
  expect(textOf("messenger-list-row-mina-unread")).toBe("1");
  expect(textOf("messenger-list-row-mina-preview")).toContain(OPENING_KO);
});

test("MC2-I3. scrim을 눌러도 시트만 닫히고 결과 화면이 그대로다 — 방은 열리지 않는다", async () => {
  await passMinaFinal();
  showSheetMessage();

  fireEvent.tap(within(screen.getByTestId(SHEET)).getByTestId("ui-lynx-overlay"), {});

  expect(present(SHEET)).toBe(false);
  expect(screen.getByTestId(RESULT)).toBeInTheDocument();
  expect(present("messenger-chat-screen")).toBe(false);
});

test("MC2-I3. typing 단계에서도 Later가 닫고, 닫힌 뒤에는 시간이 흘러도 시트가 다시 서지 않는다", async () => {
  await passMinaFinal();
  advance(SHEET_APPEAR_MS);
  expect(screen.getByTestId(SHEET).getAttribute("data-phase")).toBe("typing");

  tapId("new-friend-later");
  advance(10_000);

  expect(present(SHEET)).toBe(false);
  expect(screen.getByTestId(RESULT)).toBeInTheDocument();
});

// ------------------------------------------------------------------ MC2-I4 · 시트가 없는 경우

test("MC2-I4. 미나를 이미 해금한 설치에서 같은 최종을 통과하면 시트가 서지 않는다", async () => {
  await resetMessengerChatSource({ unlocked: ["mina"] });
  await bootBeforeFinal(u03);
  playFinal(u03, 3, true);
  expect(screen.getByTestId(RESULT)).toBeInTheDocument();

  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);

  expect(present(SHEET)).toBe(false);
});

test("MC2-I4. 최종을 틀리면(Try again) 시트가 없고 미나는 잠긴 채다", async () => {
  await bootBeforeFinal(u03);
  playFinal(u03, 3, false);
  expect(screen.getByTestId("lesson-complete-screen-retry")).toBeInTheDocument();

  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);
  expect(present(SHEET)).toBe(false);

  await exitToMap();
  openTab("messenger");
  expect(screen.getByTestId("messenger-list-row-mina").getAttribute("data-locked")).toBe("true");
});

test("MC2-I4. 다른 에피소드(u01)의 최종 통과에는 시트가 없고 미나는 잠긴 채다", async () => {
  await bootBeforeFinal(u01);
  playFinal(u01, 1, true);
  expect(screen.getByTestId(RESULT)).toBeInTheDocument();

  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);
  expect(present(SHEET)).toBe(false);

  await exitToMap();
  openTab("messenger");
  expect(screen.getByTestId("messenger-list-row-mina").getAttribute("data-locked")).toBe("true");
});

test("MC2-I4. 결과 화면을 2000 ms 전에 떠나면 시트는 서지 않지만 해금은 이미 확정이라 목록의 미나가 열려 있고 NEW다", async () => {
  await passMinaFinal();
  advance(SHEET_APPEAR_MS - 500);

  await exitToMap();
  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);
  expect(present(SHEET)).toBe(false);

  openTab("messenger");
  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
  expect(screen.getByTestId("messenger-list-row-mina").getAttribute("data-locked")).not.toBe(
    "true",
  );
  expect(present("messenger-list-row-mina-new")).toBe(true);
  expect(listRowOrder()[0]).toBe("mina");
});

test("MC2-I4. 레슨(S1) 결과 화면에는 시트가 없고 미나는 잠긴 채다", async () => {
  await bootBeforeFinal(u03);
  vi.useFakeTimers();
  tapNode(u03, "S1");
  const plan = lessonPlan(u03, "S1");
  plan.activities.forEach((activity, index) =>
    solveActivity(activity, true, index === plan.activities.length - 1),
  );
  expect(screen.getByTestId(RESULT)).toBeInTheDocument();

  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);
  expect(present(SHEET)).toBe(false);

  await exitToMap();
  openTab("messenger");
  expect(screen.getByTestId("messenger-list-row-mina").getAttribute("data-locked")).toBe("true");
});

test("MC2-I4. Later 뒤 목록에서 미나 방을 열면 opening은 로그에 한 줄뿐이다(해금이 중복으로 들어가지 않음)", async () => {
  await passMinaFinal();
  showSheetMessage();
  tapId("new-friend-later");
  await exitToMap();
  openTab("messenger");

  tapId("messenger-list-row-mina");

  expect(screen.getAllByTestId("messenger-chat-incoming")).toHaveLength(1);
});
