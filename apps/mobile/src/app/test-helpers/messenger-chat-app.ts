// 테스트 지원 — 메신저 탭 integration이 함께 쓰는 도우미입니다. 제품 코드는 import하지 않습니다.
// 출처 싱글턴(`app/messenger-chat-wiring.ts`)은 spec §7.1 계약의 이름으로 부릅니다(모듈이 생겨 정적 import로 바꿨습니다 —
// 변수 경로의 동적 import는 이 러너에서 헬퍼 위치가 아닌 setup 파일 기준으로 풀려 늘 실패했습니다).

import { vi } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { systemBackEventName } from "../../lib/system-back";
import {
  deviceTurnRecordStore,
  memoryUnlockStore,
} from "../../screens/messenger-chat/chat-local-stores";
import type { ChatTier, TurnRecord } from "../../screens/messenger-chat/free-turns";
import type { ChatSource } from "../../screens/messenger-chat/chat-source.contract";
import {
  memoryTurnRecordStore,
  type TurnRecordStore,
} from "../../screens/messenger-chat/turn-ledger";
import { chatFixtureSeed } from "../../screens/messenger-chat/chat-fixture";
import * as chatWiring from "../messenger-chat-wiring";
import { messengerChatSource, resetMessengerChatSourceForTests } from "../messenger-chat-wiring";
import { renderSignedInApp } from "./signed-in-app";

export type MessengerStoresOptions = {
  /** 하루 무료 수 원장의 처음 기록입니다(기본 비어 있음 = 오늘 3통). */
  readonly turnRecord?: TurnRecord | null;
  /** 이미 해금된 인물 id입니다(기본 없음 = 미나 잠김). */
  readonly unlocked?: readonly string[];
  /** 생년(ADR-0125)은 기본으로 이미 답한 것으로 둡니다 — 방을 열 때 생년 시트가 다른 흐름을 가리지 않게요. 시트를 보는 케이스만 `unasked`. */
  readonly birthYear?: "answered" | "unasked";
  /** 대화 등급 고정(ADR-0128 — 메신저는 시험 계정에게만 열리고 시험 계정은 무제한). 무료 흐름을 보는 테스트는 `free`. */
  readonly tier?: ChatTier;
};

const STALE_RECORD: TurnRecord = { day: "1970-01-01", used: 0, outPanel: "due" };

type StoresHook = (stores: {
  readonly unlock: ReturnType<typeof memoryUnlockStore>;
  readonly turns: TurnRecordStore;
  readonly now: () => number;
  readonly tier?: ChatTier;
}) => void;

/**
 * 케이스 사이에 가짜 출처 · 지갑 · 원장 · 해금 저장 싱글턴을 처음으로 되돌립니다(spec §7.2 —
 * `resetMessengerChatSourceForTests` 뒤 `setMessengerChatStoresForTests`로 메모리 저장 · 시계를 끼웁니다).
 * 시계는 늘 현재 `Date.now()`라 가짜 타이머의 `vi.setSystemTime`을 따릅니다. 돌려주는 `turns`는 원장이 읽고 쓰는 저장소입니다.
 */
export async function resetMessengerChatSource(
  options: MessengerStoresOptions = {},
): Promise<{ readonly turns: TurnRecordStore }> {
  resetMessengerChatSourceForTests(
    options.birthYear === "unasked"
      ? chatFixtureSeed
      : { ...chatFixtureSeed, birthYear: { kind: "set", year: 2000 } },
  );
  const hook = (chatWiring as unknown as Record<string, unknown>)["setMessengerChatStoresForTests"];
  const turns = memoryTurnRecordStore(options.turnRecord ?? null);
  if (typeof hook === "function") {
    (hook as StoresHook)({
      unlock: memoryUnlockStore(options.unlocked ?? []),
      turns,
      now: () => Date.now(),
      ...(options.tier === undefined ? {} : { tier: options.tier }),
    });
    return { turns };
  }
  // 훅이 아직 없으면 기기 저장 원장을 옛 날 기록으로 비웁니다(해금 저장은 비울 길이 없다).
  deviceTurnRecordStore.write(options.turnRecord ?? STALE_RECORD);
  return { turns: deviceTurnRecordStore };
}

/** 앱이 쓰는 출처 싱글턴입니다(테스트가 씨앗을 비우는 데 씁니다). */
export async function appChatSource(): Promise<ChatSource | null> {
  return messengerChatSource((path) => path);
}

/** 감싸개가 test-id를 갖고 탭은 안쪽 ui-lynx 단추가 받는 경우(`Button` · `RoundButton`)는 안쪽을, 아니면 요소 자신을 누릅니다. */
export const tapId = (testId: string): void => {
  const el = screen.getByTestId(testId);
  const inner = el.querySelector(
    '[data-testid="ui-lynx-round-button"], [data-testid="ui-lynx-button"]',
  );
  void fireEvent.tap(inner ?? el, {});
};

/** ui-lynx RoundButton이 test-id 감싸개 안에 있으면 안쪽 단추를, 아니면 요소 자신을 누릅니다. */
export const tapRound = (testId: string): void => {
  const el = screen.getByTestId(testId);
  const inner = el.querySelector('[data-testid="ui-lynx-round-button"]');
  void fireEvent.tap(inner ?? el, {});
};

export const tapButtonIn = (wrapperTestId: string): void => {
  void fireEvent.tap(within(screen.getByTestId(wrapperTestId)).getByTestId("ui-lynx-button"), {});
};

export type TabId = "journey" | "roleplay" | "messenger" | "settings";

export const openTab = (tab: TabId): void => tapId(`ui-lynx-bottom-navigator-item-${tab}`);

export const tapKeys = (...keys: string[]): void => {
  for (const key of keys) void fireEvent.tap(screen.getByTestId(`messenger-key-${key}`), {});
};

export const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

/** 목록의 줄 순서(방 id)입니다. */
export function listRowOrder(): string[] {
  const list = screen.getByTestId("messenger-list-list");
  return Array.from(list.querySelectorAll('[data-testid^="messenger-list-row-"]'))
    .map((el) => /^messenger-list-row-([^-]+)$/.exec(el.getAttribute("data-testid") ?? "")?.[1])
    .filter((id): id is string => id !== undefined);
}

export const textOf = (testId: string): string => screen.getByTestId(testId).textContent ?? "";
export const present = (testId: string): boolean => screen.queryByTestId(testId) !== null;

export const navigatorItemIds = (): string[] =>
  screen
    .queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)
    .map((el) =>
      (el.getAttribute("data-testid") ?? "").replace("ui-lynx-bottom-navigator-item-", ""),
    );

export const isTabSelected = (tab: TabId): boolean =>
  screen.getByTestId(`ui-lynx-bottom-navigator-item-${tab}`).getAttribute("data-selected") ===
  "true";

/** 호스트의 시스템 뒤로 누름 하나를 쏘고 응답 대역의 호출을 돌려줍니다. */
export type BackHost = {
  readonly ready: ReturnType<typeof vi.fn<() => void>>;
  readonly respond: ReturnType<typeof vi.fn<(token: string, outcome: string) => void>>;
};

export function stubBackHost(): BackHost {
  const host: BackHost = {
    ready: vi.fn<() => void>(),
    respond: vi.fn<(token: string, outcome: string) => void>(),
  };
  // 다른 모듈(세션 저장소 등)을 지우지 않고 뒤로가기 모듈만 얹습니다 — 지우면 세션 토큰을 잃어 시험 계정 판정이 꺼졌다(ADR-0128).
  const existing = (globalThis as { NativeModules?: Record<string, unknown> }).NativeModules ?? {};
  vi.stubGlobal("NativeModules", { ...existing, SystemBackModule: host });
  return host;
}

let tokenCounter = 0;
export function pressSystemBack(): string {
  tokenCounter += 1;
  const token = `mc-${String(tokenCounter)}`;
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(systemBackEventName, [token]);
  });
  return token;
}

const base64Url = (value: unknown): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** 시험 계정 표시(`app_metadata.duru_tester`)가 켜진 액세스 토큰입니다 — 메신저 탭이 열리는 계정(ADR-0085 · ADR-0128). */
export const testerAccessToken = `${base64Url({ alg: "none" })}.${base64Url({
  sub: "tester-1",
  app_metadata: { duru_tester: true },
})}.sig`;

/** 시험 계정으로 로그인된 설치를 부팅합니다. 메신저 탭은 시험 계정에게만 목록을 보입니다(ADR-0128). */
export function renderTesterApp(
  ui: Parameters<typeof renderSignedInApp>[0],
  options: Parameters<typeof renderSignedInApp>[1] = {},
): ReturnType<typeof renderSignedInApp> {
  return renderSignedInApp(ui, { ...options, refreshedAccessToken: testerAccessToken });
}
