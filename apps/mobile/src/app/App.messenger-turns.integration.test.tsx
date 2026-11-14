import { cleanup, screen } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { setTesterAccessActive } from "../lib/tester-access";
import type { TurnRecord } from "../screens/messenger-chat/free-turns";
import type { TurnRecordStore } from "../screens/messenger-chat/turn-ledger";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { App } from "./App";
import {
  advance,
  openTab,
  present,
  resetMessengerChatSource,
  tapId,
  tapKeys,
  tapRound,
  textOf,
  renderTesterApp,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(MC2-I5 · MC2-I6): 하루 무료 3통(모든 인물 합 · 기기 원장) → 마지막 무료 띠 → 다 쓴 판(하루 한 번) →
// 엽전 보내기 → 지역 자정이 지나면 다시 무료, 그리고 시험 계정(무제한)에서는 줄 · 띠 · 판 · 엽전 단추가 없다는 것을
// 실제 App · 메신저 두 화면 · 가짜 출처 · 싱글턴 지갑 · 원장(메모리 저장)이 한 트리에서 맞물려 봅니다.
// 대역은 경계뿐 — 저장소 · fetch · 가짜 타이머(`vi.setSystemTime`이 원장의 시계를 정합니다).
// 시계는 2026-11-10 18:48(지역)이라 다음 지역 자정까지 5h 12m입니다.

const NOW = new Date(2026, 10, 10, 18, 48, 0, 0);
const TOMORROW = new Date(2026, 10, 11, 0, 5, 0, 0);
const TODAY_KEY = "2026-11-10";
const LINE = "messenger-chat-turn-line";
const OUTGOING = "messenger-chat-outgoing";
const COIN_SHOP = "coin-shop-screen";
const UNLIMITED_INTRO = "unlimited-ticket-modal-intro";

/** 오늘 기록된 무료 사용 수입니다(기록이 없거나 옛 날이면 0). */
const usedToday = (turns: TurnRecordStore): number => {
  const record = turns.read();
  return record?.day === TODAY_KEY ? record.used : 0;
};

const row = (id: string) => `messenger-list-row-${id}`;
const used = (count: number, outPanel: "due" | "shown"): TurnRecord => ({
  day: TODAY_KEY,
  used: count,
  outPanel,
});

afterEach(() => {
  cleanup();
  setTesterAccessActive(false);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const testerToken = `${base64Url({ alg: "none" })}.${base64Url({ sub: "tester-1", app_metadata: { duru_tester: true } })}.sig`;

/** 앱이 낸 제품 사용 이벤트입니다 — 부팅마다 비웁니다. */
let events: EpisodeIntroEvent[] = [];
const named = (name: string) => events.filter((event) => event.name === name);

/** 가짜 시계 2026-11-10 18:48로 부팅해 메신저 목록까지 갑니다. 돌려주는 저장소가 원장의 기록입니다. */
async function bootToList(
  coins: number,
  record: TurnRecord | null = null,
  tester = false,
): Promise<TurnRecordStore> {
  // 메신저는 시험 계정에게만 열리고(ADR-0128) 시험 계정은 무제한이라, 일반 계정의 무료 흐름은 등급을 free로 고정해 봅니다.
  const { turns } = await resetMessengerChatSource({
    turnRecord: record,
    ...(tester ? {} : { tier: "free" as const }),
  });
  if (tester) setTesterAccessActive(true);
  events = [];
  const sink = (event: EpisodeIntroEvent) => events.push(event);
  await renderTesterApp(
    <App progressSeed={legacyPassedSeedWithCoins(coins)} episodeIntroEventSink={sink} />,
    {
      keepFakeTimers: true,
      ...(tester ? { refreshedAccessToken: testerToken } : {}),
    },
  );
  vi.setSystemTime(NOW);
  openTab("messenger");
  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
  return turns;
}

function openRoom(id: string): void {
  tapId(row(id));
  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
}

function leaveRoom(): void {
  tapRound("messenger-chat-back");
  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
}

/** 학습 키보드로 「안」을 입력 칸에 씁니다(키보드가 닫혀 있으면 먼저 엽니다). */
function typeAn(): void {
  if (!present("messenger-keyboard-rows")) tapId("messenger-chat-field");
  tapKeys("ㅇ", "ㅏ", "ㄴ");
}

function sendAn(): void {
  typeAn();
  tapRound("messenger-chat-send");
}

const lineText = (): string => textOf(LINE);
const linePlan = (): string | null => screen.getByTestId(LINE).getAttribute("data-plan");

// ------------------------------------------------------------------ MC2-I5 · T1 → T2 → T3 → T4 → 다음 날 T1

test("MC2-I5. 무료 수는 방을 가로질러 합산된다 — 사장님 방 2통 뒤 게스트하우스 방은 「Last free message today」와 띠가 선다", async () => {
  await bootToList(100);
  openRoom("owner");
  expect(lineText()).toBe("3 of 3 free messages left today");
  expect(linePlan()).toBe("free");

  sendAn();
  expect(lineText()).toBe("2 of 3 free messages left today");
  sendAn();
  expect(screen.getAllByTestId(OUTGOING)).toHaveLength(2);
  leaveRoom();

  openRoom("guesthouse");

  expect(lineText()).toBe("Last free message today");
  expect(linePlan()).toBe("last-free");
  expect(present("messenger-chat-turn-strip")).toBe(true);
  expect(textOf("messenger-chat-turn-strip")).toContain("3 coins");
});

test("MC2-I5. 셋째 통을 보내면 다 쓴 판이 독 자리에 서고(로그는 남고 키보드는 접힘), 판을 닫고 나가 다른 방에 들어오면 판 없이 엽전 보내기다", async () => {
  await bootToList(100, used(2, "due"));
  openRoom("owner");

  sendAn();

  expect(screen.getByTestId("messenger-chat-out-panel")).toBeInTheDocument();
  expect(textOf("messenger-chat-out-panel")).toContain("Today's 3 free messages are used");
  expect(textOf("messenger-chat-out-balance")).toBe("You have 100 coins");
  expect(present("messenger-chat-send")).toBe(false);
  expect(present("messenger-chat-field")).toBe(false);
  expect(present("messenger-keyboard-rows")).toBe(false);
  expect(screen.getAllByTestId("messenger-chat-incoming").length).toBeGreaterThan(0);
  expect(screen.getAllByTestId(OUTGOING)).toHaveLength(1);

  tapId("messenger-chat-out-back");
  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();

  openRoom("guesthouse");
  expect(present("messenger-chat-out-panel")).toBe(false);
  expect(linePlan()).toBe("coin");
  expect(lineText()).toBe("Each message 3 coins · free again in 5h 12m");
  expect(screen.getByTestId("messenger-chat-coin-send")).toBeInTheDocument();
  expect(present("messenger-chat-send")).toBe(false);
});

test("MC2-I5. 엽전 보내기는 글을 보내고 지갑에서 3을 쓰며(목록 칩 100 → 97) 원장의 무료 수는 그대로다", async () => {
  const turns = await bootToList(100, used(3, "shown"));
  openRoom("owner");
  typeAn();

  tapId("messenger-chat-coin-send");

  expect(screen.getAllByTestId(OUTGOING)).toHaveLength(1);
  expect(turns.read()?.used).toBe(3);
  // EV-I3 엽전으로 보낸 한 통은 chat_message_sent(낸 값 3)와 첫 메시지 마일스톤 없이(마일스톤은 PostHog sink가 냅니다) 납니다.
  expect(named("chat_message_sent")).toEqual([
    {
      name: "chat_message_sent",
      surface: "chat",
      daysSinceFirstOpen: "0",
      characterId: "owner",
      paid: true,
      cost: "3",
    },
  ]);
  leaveRoom();
  expect(textOf("messenger-list-coins")).toContain("97");
});

test("MC2-I5. 지역 자정이 지나 분 단위 갱신이 돌면 방에 머문 채로 다시 무료 3통(T1)이 된다", async () => {
  await bootToList(100, used(3, "shown"));
  openRoom("owner");
  expect(linePlan()).toBe("coin");

  vi.setSystemTime(TOMORROW);
  advance(60_000);

  expect(linePlan()).toBe("free");
  expect(lineText()).toBe("3 of 3 free messages left today");
  expect(present("messenger-chat-coin-send")).toBe(false);
  expect(present("messenger-chat-send")).toBe(true);
});

test("MC2-I5. 다 쓴 판은 하루에 한 번만 서고 — 열 때 판이 서 있는 채 나갔다 와도 다시 서지 않는다(원장에 본 것으로 남음)", async () => {
  const turns = await bootToList(100, used(3, "due"));

  openRoom("owner");
  expect(screen.getByTestId("messenger-chat-out-panel")).toBeInTheDocument();
  expect(turns.read()?.outPanel).toBe("shown");
  tapId("messenger-chat-out-back");

  openRoom("owner");
  expect(present("messenger-chat-out-panel")).toBe(false);
  expect(linePlan()).toBe("coin");
});

test("MC2-I5. 판의 「Keep chatting」은 판을 닫고 엽전 보내기 단추를 세운다", async () => {
  await bootToList(100, used(3, "due"));
  openRoom("owner");

  tapId("messenger-chat-out-keep");

  expect(present("messenger-chat-out-panel")).toBe(false);
  expect(screen.getByTestId("messenger-chat-coin-send")).toBeInTheDocument();
});

// ------------------------------------------------------------------ 잔액 부족 · Go unlimited 없음

test("MC2-I5. 잔액이 모자라면 엽전 보내기는 보내지 않고 엽전 상점이 서며 글은 입력 칸에 남고, 닫으면 단추로 돌아온다", async () => {
  await bootToList(0, used(3, "shown"));
  openRoom("owner");
  typeAn();

  tapId("messenger-chat-coin-send");

  expect(screen.getByTestId(COIN_SHOP)).toBeInTheDocument();
  expect(present(OUTGOING)).toBe(false);
  expect(textOf("messenger-chat-display")).toContain("안");
  // EV-I4 모자란 엽전은 chat_coins_short(메시지 · 3 모자람)이고, 보낸 메시지는 없습니다.
  expect(named("chat_coins_short")).toEqual([
    {
      name: "chat_coins_short",
      surface: "chat",
      daysSinceFirstOpen: "0",
      reason: "message",
      shortBy: "3",
    },
  ]);
  expect(named("chat_message_sent")).toEqual([]);

  tapRound(`${COIN_SHOP}-close`);
  expect(present(COIN_SHOP)).toBe(false);
  expect(present(OUTGOING)).toBe(false);
  expect(screen.getByTestId("messenger-chat-coin-send")).toBeInTheDocument();
});

// 무제한 티켓은 학습 전용입니다(2026-11-10 결정) — 메신저의 띠 · 판에는 Go unlimited가 없고 무제한 소개도 열리지 않습니다.
test("MC2-I5. 마지막 무료 띠에는 「Go unlimited」가 없다 — 글 한 줄뿐이다", async () => {
  await bootToList(100, used(2, "due"));
  openRoom("owner");

  expect(present("messenger-chat-turn-strip")).toBe(true);
  expect(present("messenger-chat-turn-strip-unlimited")).toBe(false);
  expect(screen.getByTestId("messenger-chat-turn-strip").textContent).not.toContain("Go unlimited");
  expect(present(UNLIMITED_INTRO)).toBe(false);
});

test("MC2-I5. 다 쓴 판에도 「Go unlimited」가 없다 — Keep chatting · Back to chats · 잔액 줄", async () => {
  await bootToList(100, used(3, "due"));
  openRoom("owner");

  expect(screen.getByTestId("messenger-chat-out-panel")).toBeInTheDocument();
  expect(present("messenger-chat-out-unlimited")).toBe(false);
  expect(screen.getByTestId("messenger-chat-out-panel").textContent).not.toContain("Go unlimited");
  expect(present("messenger-chat-out-keep")).toBe(true);
  expect(present("messenger-chat-out-back")).toBe(true);
  expect(present(UNLIMITED_INTRO)).toBe(false);
});

// ------------------------------------------------------------------ MC2-I6 · 시험 계정(무제한)

test("MC2-I6. 시험 계정(무제한)은 턴 줄 · 띠 · 판 · 엽전 단추가 없고 열 번을 보내도 원장이 변하지 않는다", async () => {
  const turns = await bootToList(120, null, true);
  openRoom("owner");

  expect(present(LINE)).toBe(false);
  expect(present("messenger-chat-turn-strip")).toBe(false);
  for (let count = 1; count <= 10; count += 1) {
    sendAn();
    expect(screen.getAllByTestId(OUTGOING)).toHaveLength(count);
  }

  expect(present(LINE)).toBe(false);
  expect(present("messenger-chat-turn-strip")).toBe(false);
  expect(present("messenger-chat-out-panel")).toBe(false);
  expect(present("messenger-chat-coin-send")).toBe(false);
  expect(present("messenger-chat-send")).toBe(true);
  expect(usedToday(turns)).toBe(0);
  leaveRoom();
  expect(textOf("messenger-list-coins")).toContain("120");
});

test("MC2-I6. 무제한이어도 사진 요청은 엽전 35를 낸다 — 지갑 120 → 85", async () => {
  await bootToList(120, null, true);
  openRoom("owner");

  tapId("messenger-chat-feature-snapshot");
  expect(textOf("messenger-chat-ask-balance")).toBe("You have 120 coins");
  tapRound("messenger-chat-ask-confirm");
  expect(present("messenger-chat-photo-pending")).toBe(true);

  leaveRoom();
  expect(textOf("messenger-list-coins")).toContain("85");
});

test("MC2-I6. 일반 계정의 사진 요청도 엽전 35를 낸다 — 무료 3통과는 별개라 원장은 그대로다", async () => {
  const turns = await bootToList(120);
  openRoom("owner");

  tapId("messenger-chat-feature-snapshot");
  tapRound("messenger-chat-ask-confirm");

  expect(present("messenger-chat-photo-pending")).toBe(true);
  expect(usedToday(turns)).toBe(0);
  // EV-I5 사진 요청은 chat_media_requested(가격 35)입니다.
  expect(named("chat_media_requested")).toEqual([
    {
      name: "chat_media_requested",
      surface: "chat",
      daysSinceFirstOpen: "0",
      characterId: "owner",
      media: "photo",
      price: "35",
    },
  ]);
  leaveRoom();
  expect(textOf("messenger-list-coins")).toContain("85");
});

test("EV-I6. 무료로 보낸 한 통은 chat_message_sent(낸 값 0 · 무료)이고 메신저 탭 열기는 처음 배지를 싣는다", async () => {
  await bootToList(0);
  openRoom("owner");
  sendAn();

  expect(named("chat_message_sent")).toEqual([
    {
      name: "chat_message_sent",
      surface: "chat",
      daysSinceFirstOpen: "0",
      characterId: "owner",
      paid: false,
      cost: "0",
    },
  ]);
  expect(named("messenger_tab_opened")).toEqual([
    { name: "messenger_tab_opened", surface: "chat", daysSinceFirstOpen: "0", badge: "first" },
  ]);
});
