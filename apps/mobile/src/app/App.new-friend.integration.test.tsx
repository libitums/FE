import { fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { chatFixtureSeed } from "../screens/messenger-chat/chat-fixture";
import { forgetNewFriend } from "./new-friend-pending";
import { resetApp } from "./test-helpers/episode-format-harness";
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
import {
  bootAfterEpisode,
  bootAfterInterlude,
  bootBeforeFinal,
  bootBeforeInterlude,
  exitToMap,
  finishEpilogue,
  finishInterlude,
  playFinal,
  u03,
} from "./test-helpers/new-friend-app";

// 고정 내장본(2026-10-23)의 u03에는 막간이 없습니다 — 실제 내장본 u03의 막간(INT, look 형식)을 S4 뒤에 끼우고 완료 키에도
// 넣습니다(ADR-0088, `App.catalog-story.integration.test.tsx`와 같은 방식).
vi.mock("../lib/episode-bundled", async () => {
  const fixture = await import("../lib/episode-bundled.test-support");
  const live = (await import("../../content/episodes/u03-mina.json")).default as {
    interlude: unknown;
  };
  const u03 = structuredClone(fixture.bundledCatalogInput.episodes["u03-mina"]) as {
    steps: { id: string; order: number }[];
    completion: { requires: string[] };
    interlude?: unknown;
  };
  const at = u03.steps.findIndex((step) => step.id === "S4") + 1;
  for (const step of u03.steps.slice(at)) step.order += 1;
  u03.steps.splice(at, 0, { id: "INT", order: at + 1, kind: "interlude", items: [] } as {
    id: string;
    order: number;
  });
  u03.completion.requires.splice(u03.completion.requires.indexOf("S4") + 1, 0, "INT");
  u03.interlude = live.interlude;
  return {
    bundledCatalogInput: {
      ...fixture.bundledCatalogInput,
      episodes: { ...fixture.bundledCatalogInput.episodes, "u03-mina": u03 },
    },
  };
});

// `integration` 계층(MC2-I1 ~ MC2-I5): 에피소드 3(u03-mina)을 끝내고(최종 통과) 뒤 컷까지 지나면(「다음」으로 끝까지 보거나
// 뒤로 닫기 — 해금 JSON, ADR-0141 · 전에는 막간 INT) 돌아온 여정 맵 위에 「새 친구」 시트가 서고(2.0 s 뒤 typing → 1.2 s 뒤 message), Reply가
// 메신저 탭의 미나 방(키보드 닫힘 · opening이 로그에 있음)을 열며, Later · scrim은 시트만 닫는지 봅니다. 해금은 끝낸 순간
// 확정되어 시트를 못 본 채 탭을 옮겨도 목록에 미나가 열려 있고, 이미 해금했거나 막간만 끝냈거나 최종에 떨어지면 시트가 없습니다.
// 실제 App · 카탈로그 · 막간 화면 · 맵 · 메신저 두 화면 · 가짜 출처 · 해금 저장(메모리)이 맞물립니다.
// 대역은 경계뿐입니다 — `NativeModules`(저장소) · `fetch` · 가짜 타이머.

const SHEET = "new-friend-sheet";
const MAP = "journey-map-screen";
const SHEET_APPEAR_MS = 2000;
const SHEET_TYPING_MS = 1200;

const minaSeed = chatFixtureSeed.rooms.find((room) => room.roomId === "mina");
const OPENING_KO = minaSeed?.opening?.ko ?? "";
const OPENING_EN = minaSeed?.opening?.en ?? "";

beforeEach(async () => {
  forgetNewFriend();
  await resetMessengerChatSource();
});
afterEach(resetApp);

/** u03 최종을 통과하고 뒤 컷을 끝까지 보고 맵으로 돌아옵니다. 이 시점부터 시계는 가짜입니다. */
async function finishMinaEpisode(): Promise<void> {
  await bootBeforeFinal(u03);
  playFinal(u03, 3, true);
  await finishEpilogue();
}

/** 시트를 message 단계까지 띄웁니다. */
function showSheetMessage(): void {
  advance(SHEET_APPEAR_MS);
  advance(SHEET_TYPING_MS);
  expect(screen.getByTestId(SHEET).getAttribute("data-phase")).toBe("message");
}

/** 메신저 목록의 미나 줄이 열려 있는가. */
const minaUnlocked = (): boolean =>
  screen.getByTestId("messenger-list-row-mina").getAttribute("data-locked") !== "true";

// ------------------------------------------------------------------ MC2-I1 · 시트가 서는 시점

test("MC2-I1. 에피소드를 끝내고 뒤 컷을 지나 돌아온 맵에는 2000 ms 전에는 시트가 없고 2000 ms에 typing으로 선다 — 맵은 그대로 아래에 있다", async () => {
  await finishMinaEpisode();
  expect(present(SHEET)).toBe(false);

  advance(SHEET_APPEAR_MS - 1);
  expect(present(SHEET)).toBe(false);

  advance(1);
  const sheet = screen.getByTestId(SHEET);
  expect(sheet.getAttribute("data-phase")).toBe("typing");
  expect(present("new-friend-typing")).toBe(true);
  expect(present("new-friend-message")).toBe(false);
  expect(screen.getByTestId(MAP)).toBeInTheDocument();
});

test("MC2-I1. 시트가 선 동안 전역 탭 바는 낭독에서 가려지고, 닫히면 풀린다", async () => {
  await finishMinaEpisode();
  const hidden = () =>
    screen.getByTestId("app-navigator").getAttribute("accessibility-elements-hidden") === "true";
  expect(hidden()).toBe(false);

  showSheetMessage();
  expect(hidden()).toBe(true);

  tapId("new-friend-later");
  expect(hidden()).toBe(false);
});

test("MC2-I1. 시트는 typing 1200 ms 뒤 message가 되어 미나의 opening(한국어 · 영어)을 같은 자리에 보인다", async () => {
  await finishMinaEpisode();
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
  await finishMinaEpisode();
  advance(SHEET_APPEAR_MS);

  expect(textOf("new-friend-name")).toBe("미나");
  expect(textOf("new-friend-chip")).toContain("Episode 3");
  expect(textOf("new-friend-met")).toContain("Episode 3");
  expect(screen.getByTestId(SHEET)).toHaveTextContent("NEW FRIEND");
  expect(screen.getByTestId("new-friend-reply").getAttribute("data-state")).toBe("dim");

  advance(SHEET_TYPING_MS);
  expect(screen.getByTestId("new-friend-reply").getAttribute("data-state")).toBe("lit");
});

test("MC2-I1. 뒤 컷을 뒤로 닫아도 에피소드는 끝낸 것이라 해금되고 맵에 시트가 선다", async () => {
  await bootBeforeFinal(u03);
  playFinal(u03, 3, true);
  await exitToMap();

  showSheetMessage();
  expect(textOf("new-friend-name")).toBe("미나");
});

// ------------------------------------------------------------------ MC2-I2 · Reply

test("MC2-I2. Reply: 메신저 탭의 미나 방이 서고, opening이 로그에 있으며 키보드는 닫혀 있다", async () => {
  await finishMinaEpisode();
  showSheetMessage();

  tapId("new-friend-reply");

  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
  expect(textOf("messenger-chat-title")).toBe("미나");
  expect(present(SHEET)).toBe(false);
  const incoming = screen.getAllByTestId("messenger-chat-incoming");
  expect(incoming).toHaveLength(1);
  expect(incoming[0]?.textContent).toContain(OPENING_KO);
  expect(screen.getByTestId("messenger-chat-slot").getAttribute("data-content")).toBe("closed");
  expect(present("messenger-keyboard-rows")).toBe(false);
});

test("MC2-I2. Reply로 연 방에서 뒤로 가면 미나가 목록 맨 위이고 NEW가 사라지며, 여정 탭에 돌아와도 시트가 없다", async () => {
  await finishMinaEpisode();
  showSheetMessage();
  tapId("new-friend-reply");

  tapRound("messenger-chat-back");

  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
  expect(listRowOrder()[0]).toBe("mina");
  expect(present("messenger-list-row-mina-new")).toBe(false);
  expect(present("messenger-list-row-mina-unread")).toBe(false);
  expect(isTabSelected("messenger")).toBe(true);

  openTab("journey");
  expect(isTabSelected("journey")).toBe(true);
  expect(screen.getByTestId(MAP)).toBeInTheDocument();
  advance(10_000);
  expect(present(SHEET)).toBe(false);
});

// ------------------------------------------------------------------ MC2-I3 · Later

test("MC2-I3. Later: 시트만 닫히고 맵이 그대로이며, 메신저 탭의 미나 줄은 NEW · 1 · opening 미리보기다", async () => {
  await finishMinaEpisode();
  showSheetMessage();

  tapId("new-friend-later");

  expect(present(SHEET)).toBe(false);
  expect(screen.getByTestId(MAP)).toBeInTheDocument();

  openTab("messenger");
  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
  expect(listRowOrder()[0]).toBe("mina");
  expect(minaUnlocked()).toBe(true);
  expect(textOf("messenger-list-row-mina-new")).toContain("NEW");
  expect(textOf("messenger-list-row-mina-unread")).toBe("1");
  expect(textOf("messenger-list-row-mina-preview")).toContain(OPENING_KO);
});

test("MC2-I3. Later 뒤에는 탭을 오가거나 맵이 다시 마운트돼도 시트가 다시 서지 않는다", async () => {
  await finishMinaEpisode();
  showSheetMessage();
  tapId("new-friend-later");

  openTab("messenger");
  openTab("journey");
  advance(10_000);
  expect(present(SHEET)).toBe(false);
});

test("MC2-I3. scrim을 눌러도 시트만 닫히고 맵이 그대로다 — 방은 열리지 않는다", async () => {
  await finishMinaEpisode();
  showSheetMessage();

  fireEvent.tap(within(screen.getByTestId(SHEET)).getByTestId("ui-lynx-overlay"), {});

  expect(present(SHEET)).toBe(false);
  expect(screen.getByTestId(MAP)).toBeInTheDocument();
  expect(present("messenger-chat-screen")).toBe(false);
});

test("MC2-I3. typing 단계에서도 Later가 닫고, 닫힌 뒤에는 시간이 흘러도 시트가 다시 서지 않는다", async () => {
  await finishMinaEpisode();
  advance(SHEET_APPEAR_MS);
  expect(screen.getByTestId(SHEET).getAttribute("data-phase")).toBe("typing");

  tapId("new-friend-later");
  advance(10_000);

  expect(present(SHEET)).toBe(false);
  expect(screen.getByTestId(MAP)).toBeInTheDocument();
});

// ------------------------------------------------------------------ MC2-I4 · 시트가 없는 경우

test("MC2-I4. 미나를 이미 해금한 설치에서 에피소드를 끝내면 시트가 서지 않는다", async () => {
  await resetMessengerChatSource({ unlocked: ["mina"] });
  await finishMinaEpisode();

  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);

  expect(present(SHEET)).toBe(false);
});

test("MC2-I4. 최종 통과 결과 화면에서는 아직 시트가 없다 — 뒤 컷을 지나야 맵에 선다", async () => {
  await bootBeforeFinal(u03);
  playFinal(u03, 3, true);
  expect(screen.getByTestId("lesson-complete-screen")).toBeInTheDocument();

  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);
  expect(present(SHEET)).toBe(false);

  await finishEpilogue();
  showSheetMessage();
});

test("MC2-I4. 최종에 떨어지면 해금되지 않는다 — 시트가 없고 미나는 잠긴 채다", async () => {
  await bootBeforeFinal(u03);
  playFinal(u03, 3, false);
  await exitToMap();

  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);
  expect(present(SHEET)).toBe(false);
  openTab("messenger");
  expect(minaUnlocked()).toBe(false);
});

test("MC2-I4. 시트가 서기 전에 메신저 탭으로 옮기면 시트는 서지 않지만 해금은 이미 확정이라 목록의 미나가 열려 있고 NEW다", async () => {
  await finishMinaEpisode();
  advance(SHEET_APPEAR_MS - 500);

  openTab("messenger");
  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);
  expect(present(SHEET)).toBe(false);

  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
  expect(minaUnlocked()).toBe(true);
  expect(present("messenger-list-row-mina-new")).toBe(true);
  expect(listRowOrder()[0]).toBe("mina");
});

test("MC2-I4. 막간을 끝까지 봐도 해금되지 않는다(전 규칙) — 시트가 없고 미나는 잠긴 채다", async () => {
  await bootBeforeInterlude();
  await finishInterlude();

  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);
  expect(present(SHEET)).toBe(false);

  openTab("messenger");
  expect(minaUnlocked()).toBe(false);
});

test("MC2-I4. Later 뒤 목록에서 미나 방을 열면 opening은 로그에 한 줄뿐이다(해금이 중복으로 들어가지 않음)", async () => {
  await finishMinaEpisode();
  showSheetMessage();
  tapId("new-friend-later");
  openTab("messenger");

  tapId("messenger-list-row-mina");

  expect(screen.getAllByTestId("messenger-chat-incoming")).toHaveLength(1);
});

// ------------------------------------------------------------------ MC2-I5 · 이미 끝낸 에피소드의 보정

test("MC2-I5. 에피소드를 이미 끝낸 진도로 켜면 시트 없이 미나가 열려 있고 첫 메시지가 NEW · 안 읽음으로 와 있다", async () => {
  await bootAfterEpisode();
  vi.useFakeTimers();

  advance(SHEET_APPEAR_MS + SHEET_TYPING_MS + 5000);
  expect(present(SHEET)).toBe(false);

  openTab("messenger");
  expect(minaUnlocked()).toBe(true);
  expect(present("messenger-list-row-mina-new")).toBe(true);
  expect(listRowOrder()[0]).toBe("mina");
  expect(textOf("messenger-list-row-mina")).toContain(OPENING_KO);
});

test("MC2-I5. 이미 해금한 설치는 보정이 아무것도 바꾸지 않는다 — NEW가 다시 붙지 않는다", async () => {
  await resetMessengerChatSource({ unlocked: ["mina"] });
  await bootAfterEpisode();

  openTab("messenger");
  expect(minaUnlocked()).toBe(true);
  expect(present("messenger-list-row-mina-new")).toBe(false);
});

test("MC2-I5. 막간만 끝낸 진도로 켜면 보정이 없고 미나는 잠긴 채다", async () => {
  await bootAfterInterlude();

  openTab("messenger");
  expect(minaUnlocked()).toBe(false);
});
