// 푸시 캠페인 보상 결선(ADR-0175) — 보상 알림을 눌러 들어오면 claim을 묻고, 받았으면 지도가 한가할 때 보상 모달 → 엽전 날기 또는
// 무제한 티켓 칩을 보입니다.
//
// - 누름 신호(`push-reward-open`)는 `use-opened-push`가 여정 맵 목적지를 열 때 냅니다. 로그인 계정이면 그 캠페인 id(없으면 null —
//   서버가 기한 안의 가장 최근 보상을 고름)로 곧바로 묻습니다. 지급은 탭 즉시, 모달은 한가할 때 — 그 사이 기록은 계정별 기기 저장소.
// - 손님이면 묻지 않습니다(ADR-0175 P4) — 실패 이유 guest만 남깁니다.
// - 실패(기한 지남 · 이미 받음 · 대상 아님)는 화면에 아무것도 띄우지 않고 이벤트만(P5).
// - 무제한 티켓은 끝 시각까지 `ticketsUnlimited()`가 참이고(`reward-ticket-pass`), 머리 칩 · 무제한 모달은 `ticketPass`(timed)를 그립니다.

import type { ReactNode } from "@lynx-js/react";
import { useEffect, useRef, useState } from "@lynx-js/react";

import { topBarCoinIconId } from "../components/TopBar";
import { emitCompanionEvent } from "../lib/companion-events";
import { MAX_TIMER_MS } from "../lib/plan-access";
import { pushRewardClient, type PushRewardClaim } from "../lib/push-reward-api";
import { onPushRewardOpen, takePushRewardOpen } from "../lib/push-reward-open";
import { setRewardTicketPass } from "../lib/reward-ticket-pass";
import { useUiCopy } from "../lib/ui-copy";
import type { UnlimitedPass } from "../lib/unlimited-pass";
import { LAUNCH_FLYING_COINS } from "../screens/launch/LaunchCoinFlight";
import { RewardModal } from "../screens/signup-reward/SignupRewardModal";
import {
  devicePushRewardStore,
  emptyPushRewardRecord,
  pushRewardFailure,
  pushRewardHoldsLater,
  pushRewardPassOf,
  pushRewardRecordAfter,
  pushRewardStep,
  type PushRewardRecord,
  type PushRewardStore,
} from "./push-reward-record";
import type { ScreenWiring } from "./screen-wiring";
import { flightCoinCount } from "./signup-reward-record";

export type PushRewardInput = {
  readonly wiring: ScreenWiring;
  /** 지도 루트이고 다른 겹침 · 안내가 없음. */
  readonly idle: boolean;
  /** 첫 유닛 안내가 지도를 덮는 동안(활동 0) — 모달을 미룹니다. */
  readonly guideOn: boolean;
  /** 지금 머리 칩의 값 — 「Got it」 때 날기의 출발 값. */
  readonly chip: () => number | null;
  /** 날기가 끝나면 지급 응답의 지갑 잔액을 칩의 서버 잔액으로. */
  readonly acceptBalance: (balance: number) => void;
  /** 테스트 주입 — 기본은 앱 서버 · 기기 저장소. */
  readonly claim?: (campaignId: string | null) => Promise<PushRewardClaim | null>;
  readonly store?: PushRewardStore;
};

export type PushReward = {
  /** 엽전 출시 · 업데이트 · Letters 안내를 미룸 — 묻는 중 · 모달 대기 · 날기. */
  readonly holdsLater: boolean;
  /** 보상 모달이 떠 있음(날기 포함). */
  readonly open: boolean;
  /** 날기 동안의 칩 값 — 아니면 받은 값 그대로. */
  readonly coinCount: (chip: number | null) => number | null;
  /** 살아 있는 보상 무제한 티켓 — 머리 칩 · 무제한 모달. */
  readonly ticketPass: UnlimitedPass | undefined;
  readonly layer: ReactNode;
};

type Flight = { readonly from: number; readonly landed: number };

export function usePushReward(input: PushRewardInput): PushReward {
  const store = input.store ?? devicePushRewardStore;
  const signedIn = input.wiring.accountState === "signed-in";
  const copy = useUiCopy();
  const [record, setRecord] = useState<PushRewardRecord>(emptyPushRewardRecord);
  const [claiming, setClaiming] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [, setExpired] = useState(0);
  /** 계정이 바뀔 때마다 오릅니다 — 바뀌기 전에 나간 응답은 새 계정에 적지 않습니다. */
  const session = useRef(0);
  const balance = useRef<number | null>(null);
  const asking = useRef(false);
  const latest = useRef({ input, record, store });
  latest.current = { input, record, store };

  useEffect(() => {
    session.current += 1;
    const read = signedIn ? store.read() : emptyPushRewardRecord;
    // 티켓 결선(`withLearningTickets`)은 이 훅보다 먼저 렌더에서 읽습니다 — 다음 그림 전에 모듈 값을 맞춥니다.
    setRewardTicketPass(read.pass?.untilMs ?? 0);
    setRecord(read);
    setClaiming(false);
    setFlight(null);
    balance.current = null;
  }, [signedIn]);

  // 누름 신호 — 훅이 서기 전에 온 누름도 처음 구독 때 꺼냅니다.
  useEffect(() => {
    const ask = () => {
      // 묻는 중에 다시 누르면 다음 누름은 버립니다 — 같은 캠페인을 두 번 묻지 않게(응답이 오면 다시 받을 수 있음).
      if (asking.current) return void takePushRewardOpen();
      const opened = takePushRewardOpen();
      if (opened === null) return;
      const { wiring, claim } = latest.current.input;
      const sink = wiring.messengerChat.eventSink;
      if (wiring.accountState !== "signed-in") {
        emitCompanionEvent(sink, {
          name: "push_reward_failed",
          surface: "learning",
          reason: "guest",
        });
        return;
      }
      const asked = session.current;
      asking.current = true;
      setClaiming(true);
      void (claim ?? ((id) => pushRewardClient().claim(id)))(opened.campaignId).then((result) => {
        asking.current = false;
        if (asked !== session.current) return;
        setClaiming(false);
        const reason = pushRewardFailure(result, opened.campaignId);
        if (reason !== null)
          emitCompanionEvent(sink, { name: "push_reward_failed", surface: "learning", reason });
        if (result === null) return;
        const reward = result.reward;
        if (result.status === "granted" && reward !== null) {
          emitCompanionEvent(sink, {
            name: "push_reward_claimed",
            surface: "learning",
            kind: reward.kind,
            amount: String(reward.kind === "coins" ? reward.amount : reward.hours),
            via: opened.campaignId === null ? "fallback" : "id",
          });
          if (reward.kind === "coins") balance.current = result.balance;
        }
        const before = latest.current.record;
        const next = pushRewardRecordAfter(before, result, Date.now());
        if (next === before) return;
        latest.current.store.write(next);
        setRewardTicketPass(next.pass?.untilMs ?? 0);
        setRecord(next);
      });
    };
    ask();
    return onPushRewardOpen(ask);
  }, []);

  // 무제한 티켓이 끝나는 순간 다시 그립니다 — 칩이 숫자로, 레슨이 티켓을 쓰게.
  const untilMs = signedIn ? (record.pass?.untilMs ?? 0) : 0;
  useEffect(() => {
    const left = untilMs - Date.now();
    if (left <= 0) return undefined;
    const handle = setTimeout(() => setExpired((n) => n + 1), Math.min(left + 1000, MAX_TIMER_MS));
    return () => clearTimeout(handle);
  }, [untilMs]);
  setRewardTicketPass(untilMs);

  const latched = useRef(false);
  const step = pushRewardStep({
    signedIn,
    record,
    idle: input.idle || latched.current,
    guideOn: input.guideOn,
  });
  latched.current = step === "modal";
  const modal = record.modal;

  const finish = () => {
    const next = { ...latest.current.record, modal: null };
    latest.current.store.write(next);
    setRecord(next);
    setFlight(null);
    if (balance.current !== null) latest.current.input.acceptBalance(balance.current);
    balance.current = null;
  };

  return {
    holdsLater: signedIn && pushRewardHoldsLater({ claiming, record, flying: flight !== null }),
    open: step === "modal",
    coinCount: (chip) =>
      flight === null || modal === null || modal.kind !== "coins"
        ? chip
        : flightCoinCount(flight.from, modal.amount, flight.landed, LAUNCH_FLYING_COINS),
    ticketPass: signedIn ? pushRewardPassOf(record, Date.now()) : undefined,
    layer:
      step === "modal" && modal !== null ? (
        <RewardModal
          tag={copy.signupReward.pushTag}
          title={copy.signupReward.pushTitle}
          body={
            modal.kind === "coins"
              ? copy.signupReward.bodyNew
              : copy.tickets.unlimitedModal.activeMessage
          }
          reward={modal}
          coinTargetId={topBarCoinIconId}
          onFlightStart={() => setFlight({ from: latest.current.input.chip() ?? 0, landed: 0 })}
          onCoinLanded={(landed) => setFlight((now) => (now === null ? now : { ...now, landed }))}
          onDone={finish}
        />
      ) : null,
  };
}
