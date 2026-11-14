// 턴 계획 + 보내기 관문 + T3 판 + 분 단위 갱신 훅입니다(messenger-chat-1-5 spec §6.2 · §12). 원장 · 지갑 호출은 이 훅만 합니다.

import { useCallback, useContext, useEffect, useRef, useState } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";
import { restoreAccessibilityFocus } from "./chat-input-focus";
import { turnLineTextOf } from "./ChatTurns";

import type { CoinWallet } from "./coin-wallet";
import { emitCompanionEvent } from "../../lib/companion-events";
import { ChatEventsContext } from "./chat-events";
import { CHAT_COIN_PRICES } from "./chat-coins";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { chatTurnsTestIds, type SendCost } from "./chat-turns.contract";
import type { ChatTimers } from "./chat-source.contract";
import {
  msUntilNextDay,
  resetClockOf,
  sendGateFor,
  turnPlanFor,
  type ChatTier,
  type ResetClock,
  type TurnPlan,
} from "./free-turns";
import type { TurnLedger } from "./turn-ledger";

export type UseChatTurnsInput = {
  readonly ledger: TurnLedger;
  readonly wallet: CoinWallet;
  readonly tier: ChatTier;
  readonly now: () => number;
  readonly timers?: ChatTimers;
  /** 엽전이 모자라 상점을 열어야 할 때 부릅니다. */
  readonly onTopUp: () => void;
  /** T3 판이 열리는 순간(키보드 접기) 부릅니다. */
  readonly onOutPanelOpen: () => void;
  /** 겹침이 열려 있으면 턴 변화를 낭독하지 않습니다(접근성 M3). */
  readonly muted?: boolean;
};
export type UseChatTurns = {
  readonly plan: TurnPlan;
  readonly reset: ResetClock;
  readonly sendCost: SendCost;
  readonly panelOpen: boolean;
  /** `useChatRoom`의 `authorizeSend`로 넘깁니다. */
  readonly authorizeSend: () => boolean;
  readonly keepChatting: () => void;
};

/** 판이 닫힌 다음 프레임(16 ms)이 지나야 숨김이 풀려 초점을 받을 수 있습니다. */
const NEXT_FRAME_MS = 16;
const FREE: SendCost = { kind: "free" };
const PRICE = CHAT_COIN_PRICES.message;
const globalTimers: ChatTimers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as number),
};

/** 원장 변화를 구독해 다시 그립니다(use-chat-source와 같은 꼴 — 값이 바뀔 때만). */
function useLedgerVersion(ledger: TurnLedger): void {
  const [, setVersion] = useState(0);
  useEffect(() => {
    let seen = ledger.usage();
    const check = () => {
      const next = ledger.usage();
      if (next === seen) return;
      seen = next;
      setVersion((version) => version + 1);
    };
    check();
    return ledger.subscribe(check);
  }, [ledger]);
}

export function useChatTurns({
  ledger,
  wallet,
  tier,
  now,
  timers = globalTimers,
  onTopUp,
  onOutPanelOpen,
  muted = false,
}: UseChatTurnsInput): UseChatTurns {
  const turnsCopy = useUiCopy().messengerChat.turns;
  const { sink, roomId } = useContext(ChatEventsContext);
  useLedgerVersion(ledger);

  // 분 단위 갱신 — 남은 시간이 줄고, 날이 바뀌면 원장이 새 날 기록을 돌려줘 T1로 돌아갑니다(AC7). 주입 타이머로 돕니다.
  const [, setTick] = useState(0);
  useEffect(() => {
    let handle: unknown = null;
    const schedule = () => {
      handle = timers.setTimeout(() => {
        setTick((tick) => tick + 1);
        schedule();
      }, CHAT_PLACEHOLDERS.timing.turnTickMs);
    };
    schedule();
    return () => {
      if (handle !== null) timers.clearTimeout(handle);
    };
  }, [timers]);

  const usage = ledger.usage();
  const rawPlan = turnPlanFor({ tier, usage, price: PRICE });
  const due = rawPlan.kind === "coin" && rawPlan.outPanel === "due";

  // T3 판은 계획이 coin · due가 되는 순간(보낸 직후 · 방에 들어온 때) 하루 한 번 열립니다 — 열면서 「본 것」으로 기록해 다시 안 뜹니다.
  const [panelState, setPanelState] = useState(false);
  const handlersRef = useRef({ onOutPanelOpen });
  handlersRef.current = { onOutPanelOpen };
  useEffect(() => {
    if (!due) return;
    setPanelState(true);
    ledger.recordOutPanelShown();
    handlersRef.current.onOutPanelOpen();
  }, [due, ledger]);
  // 날이 바뀌어 무료가 돌아오면(coin이 아니게 되면) 열린 판은 닫힙니다.
  const coin = rawPlan.kind === "coin";
  useEffect(() => {
    if (!coin) setPanelState(false);
  }, [coin]);
  const panelOpen = panelState && coin;

  // Keep chatting으로 판이 닫히면 다음 프레임에 접근성 초점을 엽전 보내기 단추로 옮깁니다 — 사라진 단추에 있던 초점을
  // 플랫폼에 맡기지 않습니다(접근성 M2). 날이 바뀌어 닫힌 경우(coin 아님)에는 단추가 없으니 옮기지 않습니다.
  const wasPanelOpen = useRef(false);
  useEffect(() => {
    const closed = wasPanelOpen.current && !panelOpen;
    wasPanelOpen.current = panelOpen;
    if (!closed || !coin) return undefined;
    const handle = timers.setTimeout(
      () => restoreAccessibilityFocus(chatTurnsTestIds.coinSend),
      NEXT_FRAME_MS,
    );
    return () => timers.clearTimeout(handle);
  }, [panelOpen, coin, timers]);

  // 판이 열려 있는 동안 머리는 「Free messages used」(due 말씨)를 유지합니다 — 기록은 이미 shown이지만 판을 닫을 때까지 같은 글입니다.
  const plan: TurnPlan =
    panelOpen && rawPlan.kind === "coin" ? { ...rawPlan, outPanel: "due" } : rawPlan;
  const sendCost: SendCost =
    rawPlan.kind === "coin"
      ? { kind: "coin", price: rawPlan.price, short: wallet.balance() < rawPlan.price }
      : FREE;
  const reset = resetClockOf(msUntilNextDay(now()));

  // 보내서 쓴 무료 수가 늘면(분 단위 갱신 · 날 바뀜 · 마운트는 아님) 새 턴 줄을 한 번 낭독합니다 — 입력 줄에 초점이 있어 머리를 다시
  // 훑기 전에는 변화를 모릅니다(접근성 M3). 마지막 무료는 띠 문구를 이어 붙입니다. T3 판이 열리면 제목 초점이 대신하므로 생략합니다.
  const lastUsed = useRef(usage.used);
  const latestAnnounce = useRef({ turnsCopy, reset, muted });
  latestAnnounce.current = { turnsCopy, reset, muted };
  useEffect(() => {
    const grew = usage.used > lastUsed.current;
    lastUsed.current = usage.used;
    if (!grew || due) return;
    const { turnsCopy: words, reset: clock, muted: quiet } = latestAnnounce.current;
    if (quiet || rawPlan.kind === "unlimited") return;
    const line = turnLineTextOf(rawPlan, clock, words);
    announce(rawPlan.kind === "last-free" ? `${line}, ${words.strip(rawPlan.price)}` : line);
  }, [usage.used, due, rawPlan]);

  const authorizeSend = useCallback((): boolean => {
    "background only";
    // 한 통마다 최신 원장 · 잔액으로 다시 판정합니다(같은 커밋 안의 연속 보내기에도 어긋나지 않게).
    const latest = turnPlanFor({ tier, usage: ledger.usage(), price: PRICE });
    const gate = sendGateFor(latest, wallet.balance());
    const characterId = roomId ?? "";
    const sent = (cost: number) =>
      emitCompanionEvent(sink, {
        name: "chat_message_sent",
        surface: "chat",
        characterId,
        paid: cost > 0,
        cost: String(cost),
      });
    const short = () =>
      emitCompanionEvent(sink, {
        name: "chat_coins_short",
        surface: "chat",
        reason: "message",
        shortBy: String(Math.max(0, PRICE - wallet.balance())),
      });
    switch (gate.kind) {
      case "open":
        sent(0);
        return true;
      case "free":
        ledger.recordFreeSend();
        sent(0);
        return true;
      case "pay":
        if (wallet.spend(gate.price, "message").kind === "spent") {
          sent(gate.price);
          return true;
        }
        short();
        onTopUp();
        return false;
      case "top-up":
        short();
        onTopUp();
        return false;
      default: {
        const unreachable: never = gate;
        return unreachable;
      }
    }
  }, [tier, ledger, wallet, onTopUp, sink, roomId]);

  const keepChatting = useCallback((): void => {
    "background only";
    setPanelState(false);
  }, []);

  return {
    plan,
    reset,
    sendCost,
    panelOpen,
    authorizeSend,
    keepChatting,
  };
}
