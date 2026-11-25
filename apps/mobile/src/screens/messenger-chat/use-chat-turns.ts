// 턴 계획 + 보내기 관문 + 다 쓴 판 훅입니다(messenger-chat-1-5 spec §6.2 · §12). 요금은 서버 규칙을 따릅니다(ADR-0155) —
// 인물을 가리지 않는 합산 체험 수(ADR-0164 D3), 다 쓰면 첫 통부터 메시지 요금. 서버 방은 앱 지갑에서 빼지 않고(서버가 내고 `done` 잔액이 칩으로 옵니다),
// 앱 안 방(가짜 출처)만 앱 지갑에서 뺍니다. 체험 · 지갑 호출은 이 훅만 합니다.

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";
import { restoreAccessibilityFocus } from "./chat-input-focus";
import { turnLineTextOf } from "./ChatTurns";

import type { CoinWallet } from "./coin-wallet";
import { emitCompanionEvent } from "../../lib/companion-events";
import { ChatEventsContext } from "./chat-events";
import { CHAT_COIN_PRICES } from "./chat-coins";
import { chatTurnsTestIds, type SendCost } from "./chat-turns.contract";
import { sendGateFor, turnPlanFor, type ChatTier, type TurnPlan } from "./free-turns";
import type { TrialStore } from "./trial-store";

export type UseChatTurnsInput = {
  readonly trial: TrialStore;
  readonly wallet: CoinWallet;
  readonly tier: ChatTier;
  /** 서버 방이면 서버가 엽전을 냅니다 — 앱 지갑에서 빼지 않습니다. */
  readonly charging: "server" | "local";
  /** 엽전이 모자라 상점을 열어야 할 때 부릅니다. */
  readonly onTopUp: () => void;
  /** 다 쓴 판이 열리는 순간(키보드 접기) 부릅니다. */
  readonly onOutPanelOpen: () => void;
  /** 겹침이 열려 있으면 턴 변화를 낭독하지 않습니다(접근성 M3). */
  readonly muted?: boolean;
};
export type UseChatTurns = {
  readonly plan: TurnPlan;
  readonly sendCost: SendCost;
  readonly panelOpen: boolean;
  /** `useChatRoom`의 `authorizeSend`로 넘깁니다. `fromSuggestion` — 답장 보기를 눌러 보냄(ADR-0194, 기본 false). */
  readonly authorizeSend: (fromSuggestion?: boolean) => boolean;
  readonly keepChatting: () => void;
};

/** 판이 닫힌 다음 프레임(16 ms)이 지나야 숨김이 풀려 초점을 받을 수 있습니다. */
const NEXT_FRAME_MS = 16;
const FREE: SendCost = { kind: "free" };
const PRICE = CHAT_COIN_PRICES.message;

/** 체험 수 변화를 구독해 다시 그립니다(값이 바뀔 때만). */
function useTrialRemaining(trial: TrialStore): number | null {
  const [, setVersion] = useState(0);
  useEffect(() => trial.subscribe(() => setVersion((version) => version + 1)), [trial]);
  return trial.remaining();
}

export function useChatTurns({
  trial,
  wallet,
  tier,
  charging,
  onTopUp,
  onOutPanelOpen,
  muted = false,
}: UseChatTurnsInput): UseChatTurns {
  const turnsCopy = useUiCopy().messengerChat.turns;
  const { sink, roomId } = useContext(ChatEventsContext);
  const remaining = useTrialRemaining(trial);
  // 같은 값이면 같은 계획 — 아래 낭독 이펙트가 렌더마다 돌지 않습니다.
  const plan = useMemo(
    () => turnPlanFor({ tier, trialRemaining: remaining, price: PRICE }),
    [tier, remaining],
  );

  // 다 쓴 판은 마지막 무료를 보낸 순간(last-free → coin) 한 번 열립니다 — 다 쓴 채 들어온 방은 판 없이 엽전 보내기입니다.
  const [panelState, setPanelState] = useState(false);
  const handlersRef = useRef({ onOutPanelOpen });
  handlersRef.current = { onOutPanelOpen };
  const lastKind = useRef(plan.kind);
  useEffect(() => {
    const ranOut = lastKind.current === "last-free" && plan.kind === "coin";
    lastKind.current = plan.kind;
    if (!ranOut) return;
    setPanelState(true);
    handlersRef.current.onOutPanelOpen();
  }, [plan.kind]);
  const coin = plan.kind === "coin";
  const panelOpen = panelState && coin;

  // Keep chatting으로 판이 닫히면 다음 프레임에 접근성 초점을 엽전 보내기 단추로 옮깁니다 — 사라진 단추에 있던 초점을
  // 플랫폼에 맡기지 않습니다(접근성 M2).
  const wasPanelOpen = useRef(false);
  useEffect(() => {
    const closed = wasPanelOpen.current && !panelOpen;
    wasPanelOpen.current = panelOpen;
    if (!closed || !coin) return undefined;
    const handle = setTimeout(
      () => restoreAccessibilityFocus(chatTurnsTestIds.coinSend),
      NEXT_FRAME_MS,
    );
    return () => clearTimeout(handle);
  }, [panelOpen, coin]);

  const sendCost: SendCost =
    plan.kind === "coin"
      ? { kind: "coin", price: plan.price, short: wallet.balance() < plan.price }
      : FREE;

  // 보내서 체험 수가 줄면 새 턴 줄을 한 번 낭독합니다 — 입력 줄에 초점이 있어 머리를 다시 훑기 전에는 변화를 모릅니다(접근성 M3).
  // 마지막 무료는 띠 문구를 이어 붙입니다. 다 쓴 판이 열리면 제목 초점이 대신하므로 생략합니다. 서버 값으로 바로잡힌 것은 늘어날 때뿐이라 낭독하지 않습니다.
  const lastRemaining = useRef(remaining);
  const latestAnnounce = useRef({ turnsCopy, muted });
  latestAnnounce.current = { turnsCopy, muted };
  useEffect(() => {
    const dropped =
      remaining !== null && lastRemaining.current !== null && remaining < lastRemaining.current;
    lastRemaining.current = remaining;
    if (!dropped || plan.kind === "coin" || plan.kind === "unlimited") return;
    const { turnsCopy: words, muted: quiet } = latestAnnounce.current;
    if (quiet) return;
    const line = turnLineTextOf(plan, words);
    announce(plan.kind === "last-free" ? `${line}, ${words.strip(plan.price)}` : line);
  }, [remaining, plan]);

  const authorizeSend = useCallback(
    (fromSuggestion = false): boolean => {
      "background only";
      // 한 통마다 최신 체험 수 · 잔액으로 다시 판정합니다(같은 커밋 안의 연속 보내기에도 어긋나지 않게).
      const latest = turnPlanFor({
        tier,
        trialRemaining: trial.remaining(),
        price: PRICE,
      });
      const gate = sendGateFor(latest, wallet.balance());
      const sent = (cost: number) =>
        emitCompanionEvent(sink, {
          name: "chat_message_sent",
          surface: "chat",
          characterId: roomId ?? "",
          paid: cost > 0,
          cost: String(cost),
          fromSuggestion,
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
          trial.consume();
          sent(0);
          return true;
        case "pay":
          // 서버 방은 서버가 냅니다 — 잔액은 턴의 `done`이 칩으로 알립니다.
          if (charging === "server" || wallet.spend(gate.price, "message").kind === "spent") {
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
    },
    [tier, charging, trial, wallet, onTopUp, sink, roomId],
  );

  const keepChatting = useCallback((): void => {
    "background only";
    setPanelState(false);
  }, []);

  return { plan, sendCost, panelOpen, authorizeSend, keepChatting };
}
