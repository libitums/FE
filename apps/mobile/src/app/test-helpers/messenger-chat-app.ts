// 테스트 지원 — 메신저 탭 integration이 함께 쓰는 도우미입니다. 제품 코드는 import하지 않습니다.
// 출처 싱글턴(`app/messenger-chat-wiring.ts`)은 spec §7.1 계약의 이름으로 부릅니다(모듈이 생겨 정적 import로 바꿨습니다 —
// 변수 경로의 동적 import는 이 러너에서 헬퍼 위치가 아닌 setup 파일 기준으로 풀려 늘 실패했습니다).

import { vi } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { systemBackEventName } from "../../lib/system-back";
import type { ChatSource } from "../../screens/messenger-chat/chat-source.contract";
import { messengerChatSource, resetMessengerChatSourceForTests } from "../messenger-chat-wiring";

/** 케이스 사이에 가짜 출처 싱글턴을 처음 씨앗으로 되돌립니다. */
export async function resetMessengerChatSource(): Promise<void> {
  resetMessengerChatSourceForTests();
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
  vi.stubGlobal("NativeModules", { SystemBackModule: host });
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
