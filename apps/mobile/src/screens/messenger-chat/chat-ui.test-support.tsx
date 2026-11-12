// ui 테스트 지원 — 자유 대화 화면 테스트가 함께 쓰는 씨앗 · 출처 · 마운트 · 이벤트 도우미입니다.
// 제품 코드는 이 파일을 import하지 않습니다. 한국어 대화 내용은 테스트 데이터입니다.

import { vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { zeroKeyboardDockEdges, type KeyboardDockEdges } from "../../lib/keyboard-dock";
import { createFixtureChatSource } from "./chat-fixture-source";
import type {
  ChatFixtureRoom,
  ChatFixtureSeed,
  ChatSource,
  ChatTimers,
} from "./chat-source.contract";
import { createCoinWallet, type SyncedCoinWallet } from "./coin-wallet";
import type { ChatTier } from "./free-turns";
import { createTurnLedger, memoryTurnRecordStore, type TurnLedger } from "./turn-ledger";
import { MessengerChatScreen } from "./MessengerChatScreen";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { KeyboardHeightStore, KoreanKeyboardProbe } from "./keyboard-ports";
import { emptyKeyboardHeightStore, unknownKoreanKeyboardProbe } from "./keyboard-ports";

export const imageUrlOf = (path: string): string => `https://cdn/${path}`;

export const ideaSetA = [
  { ko: "네, 좋아요", roman: "ne, joayo", en: "Yes, sounds good" },
  { ko: "아니요", roman: "aniyo", en: "No" },
  { ko: "잘 모르겠어요", roman: "jal moreugesseoyo", en: "I'm not sure" },
] as const;

export const ideaSetB = [
  { ko: "다시 말해 주세요", roman: "dasi malhae juseyo", en: "Please say it again" },
  { ko: "천천히요", roman: "cheoncheonhiyo", en: "Slowly, please" },
  { ko: "고마워요", roman: "gomawoyo", en: "Thank you" },
] as const;

export const LAST_THEM = { ko: "오늘 뭐 해요?", en: "What are you doing today?" } as const;
export const CANNED = { ko: "좋아요!", en: "Sounds good!" } as const;

export function fixtureRoom(id: string, over: Partial<ChatFixtureRoom> = {}): ChatFixtureRoom {
  return {
    roomId: id,
    counterpart: { id, name: "미나", avatarPath: null },
    access: { kind: "open" },
    unread: 0,
    messages: [{ kind: "text", from: "them", text: LAST_THEM, minutesAgo: 5 }],
    storyPoints: [
      { id: "sp-1", episodeNumber: 1, title: "Buying water", relation: "just-met", unlocked: true },
      {
        id: "sp-2",
        episodeNumber: 2,
        title: "Getting lost",
        relation: "getting-to-know",
        unlocked: true,
      },
      { id: "sp-3", episodeNumber: 3, title: "A cafe", relation: "friends", unlocked: false },
    ],
    settings: { autoIdeas: true, storyPointId: "sp-1" },
    ideaSets: [ideaSetA, ideaSetB],
    cannedReplies: [CANNED],
    photoPath: "content/images/photo-a.webp",
    voiceLine: { durationMs: 4000, text: { ko: "안녕하세요", en: "Hello" } },
    ...over,
  };
}

// 생년은 이미 답한 것으로 둡니다 — 방을 열 때 뜨는 생년 시트(ADR-0125)가 다른 흐름을 가리지 않게요.
export const seedOf = (...rooms: ChatFixtureRoom[]): ChatFixtureSeed => ({
  rooms,
  birthYear: { kind: "set", year: 2000 },
});

export function makeSource(seed: ChatFixtureSeed = seedOf(fixtureRoom("mina"))): ChatSource {
  return createFixtureChatSource({ imageUrlOf, seed, now: () => Date.now() });
}

export type MountChatOptions = {
  readonly roomId?: string;
  readonly seed?: ChatFixtureSeed;
  readonly source?: ChatSource;
  readonly probe?: KoreanKeyboardProbe;
  readonly store?: KeyboardHeightStore;
  readonly edges?: KeyboardDockEdges;
  /** 지갑을 직접 만들지 않을 때 쓰는 번 엽전입니다(기본 0). */
  readonly coinBalance?: number;
  readonly learnerName?: string;
  /** 1.5: 지갑 · 원장 · 등급 · 시계 · 타이머. 등급 기본은 unlimited(1단계 테스트가 턴에 막히지 않게 — spec §15). */
  readonly wallet?: SyncedCoinWallet;
  readonly ledger?: TurnLedger;
  readonly tier?: ChatTier;
  readonly now?: () => number;
  readonly timers?: ChatTimers;
};

export function presenceProbe(presence: "present" | "absent" | "unknown"): KoreanKeyboardProbe {
  return { presence: () => presence };
}

export function mountChat(options: MountChatOptions = {}) {
  const source = options.source ?? makeSource(options.seed);
  const onExit = vi.fn<() => void>();
  const onOpenMemories = vi.fn<(characterId: string, name: string) => void>();
  const now = options.now ?? (() => Date.now());
  const wallet = options.wallet ?? createCoinWallet({ earned: options.coinBalance ?? 0 });
  const ledger = options.ledger ?? createTurnLedger({ store: memoryTurnRecordStore(), now });
  // 화면 props는 spec §7.2 모양(wallet · turns · tier · now)입니다. 스프레드로 넘겨 옛 coinBalance와 새 props가 한 객체에 함께 든다.
  const screenProps = {
    roomId: options.roomId ?? "mina",
    source,
    keyboardProbe: options.probe ?? unknownKoreanKeyboardProbe,
    keyboardHeightStore: options.store ?? emptyKeyboardHeightStore,
    edges: options.edges ?? zeroKeyboardDockEdges,
    learnerName: options.learnerName ?? "Hana",
    coinBalance: wallet.balance(),
    wallet,
    turns: ledger,
    tier: options.tier ?? "unlimited",
    now,
    timers: options.timers,
    onExit,
    onOpenMemories,
  };
  const view = render(<MessengerChatScreen {...screenProps} />);
  return { source, onExit, onOpenMemories, view, wallet, ledger };
}

/**
 * 방을 마운트한 뒤 입력 칸을 눌러 키보드를 엽니다. 방은 키보드가 닫힌 채 열리므로(사용자 결정 2026-11-09),
 * 키보드가 열려 있다고 보는 시험이 출발점으로 씁니다.
 */
export function mountChatOpen(options: MountChatOptions = {}) {
  const mounted = mountChat(options);
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.field), {});
  });
  return mounted;
}

// ---------------------------------------------------------------- 이벤트 도우미

/**
 * test-id 요소를 누릅니다. 그 안에 ui-lynx RoundButton · Button이 있으면(감싸개가 test-id를 갖는 결선) 안쪽 단추가
 * 탭을 받으므로 그것을 누르고, 아니면 요소 자신을 누릅니다.
 */
export const tapId = (testId: string): void => {
  const el = screen.getByTestId(testId);
  const inner = el.querySelector(
    '[data-testid="ui-lynx-round-button"], [data-testid="ui-lynx-button"]',
  );
  fireEvent.tap(inner ?? el, {});
};

/** ui-lynx 버튼은 감싸개가 test-id를 갖고 탭은 안쪽 `ui-lynx-button`이 받습니다. */
export const tapButtonIn = (wrapperTestId: string): void => {
  fireEvent.tap(within(screen.getByTestId(wrapperTestId)).getByTestId("ui-lynx-button"), {});
};

/** 요소 안 가장 가까운 ui-lynx 단추(없으면 요소 자신)를 누릅니다. 같은 test-id가 여러 줄에 있을 때 `within(줄)`과 함께 씁니다. */
export const tapWithin = (scope: HTMLElement, testId: string): void => {
  const el = within(scope).getByTestId(testId);
  const inner = el.querySelector(
    '[data-testid="ui-lynx-round-button"], [data-testid="ui-lynx-button"]',
  );
  fireEvent.tap(inner ?? el, {});
};

export const tapKeys = (...keys: string[]): void => {
  for (const key of keys) fireEvent.tap(screen.getByTestId(`messenger-key-${key}`), {});
};

/** 「안」 — ㅇ ㅏ ㄴ. */
export const KEYS_AN = ["ㅇ", "ㅏ", "ㄴ"] as const;
/** 「안녕하」. */
export const KEYS_ANNYEONGHA = ["ㅇ", "ㅏ", "ㄴ", "ㄴ", "ㅕ", "ㅇ", "ㅎ", "ㅏ"] as const;

export const textOf = (testId: string): string => screen.getByTestId(testId).textContent ?? "";

/** `<input>`의 네이티브 이벤트(input · focus · blur · confirm)를 흉내 냅니다. */
export function nativeInput(
  name: "input" | "focus" | "blur" | "confirm",
  value: string,
  testId: string = ids.input,
): void {
  const target = screen.getByTestId(testId);
  const EventConstructor = target.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select(`[data-testid="${testId}"]`);
  fireEvent(
    ref as unknown as Element,
    new EventConstructor(`bindEvent:${name}`, { detail: { value } }),
  );
}

/** scroll-view처럼 요소 객체로는 이벤트를 못 받는 노드에 selector 참조로 이벤트를 보냅니다. */
export function fireOnRef(
  testId: string,
  name: string,
  detail: Record<string, unknown> = {},
): void {
  const target = screen.getByTestId(testId);
  const EventConstructor = target.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select(`[data-testid="${testId}"]`);
  act(() => {
    fireEvent(ref as unknown as Element, new EventConstructor(`bindEvent:${name}`, { detail }));
  });
}

/** 대화 로그(scroll-view)를 한 번 누릅니다. */
export const tapLog = (): void => fireOnRef(ids.log, "tap");

export const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

/** 시스템 뒤로가기 한 번(가장 위 등록 하나)입니다. 처리했으면 true. */
export function systemBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

/** 테스트 사이에 남은 뒤로가기 등록을 비웁니다. */
export function clearBackHandlers(): void {
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
}

// ---------------------------------------------------------------- 창 높이

type SystemInfoShape = { pixelHeight: number; pixelRatio: number };

/** 창 높이(pt)를 바꿉니다. 돌려주는 함수를 afterEach에서 부릅니다. */
export function useWindowHeight(points: number): () => void {
  const scope = globalThis as unknown as { SystemInfo: SystemInfoShape };
  const previous = scope.SystemInfo;
  scope.SystemInfo = { ...previous, pixelHeight: points * 2, pixelRatio: 2 };
  return () => {
    scope.SystemInfo = previous;
  };
}

// ---------------------------------------------------------------- 방 안 관찰

export const incomingCount = (): number => screen.queryAllByTestId(ids.incoming).length;
export const outgoingCount = (): number => screen.queryAllByTestId(ids.outgoing).length;
export const slotContent = (): string | null =>
  screen.getByTestId(ids.slot).getAttribute("data-content");
export const slotHeight = (): string | null =>
  screen.getByTestId(ids.slot).getAttribute("data-height");
