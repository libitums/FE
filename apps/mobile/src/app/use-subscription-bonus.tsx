// Chat Plus 첫 구독 보너스 결선(ADR-0196 D3 · D4) — 지급은 웹훅이 이미 했고, 앱은 권한에 대화 요금제(Chat Plus · Premium) 줄이 있으면 지도가 한가할 때
// 서버에 「알리지 않은 보너스」를 한 번 묻습니다. 알린 수가 있으면 가입 보상 창과 같은 틀의 모달 → Got it → 머리 엽전 칩으로 날기.
//
// - 묻는 때: 권한 줄의 모양(`subscriptionBonusAskKey`)이 바뀔 때마다 한 번 — 체험이 유료로 넘어가면 만료가 늘어 다음 다시 읽기에서 또 묻습니다.
// - 기기 기록이 있으면 묻지 않습니다(평생 한 번). 아직 없음(none) · 실패는 적지 않습니다.
// - 계정이 바뀌면(로그아웃 · 다른 계정) 기록을 다시 읽고 이번 실행의 물음을 새로 셉니다.

import type { ReactNode } from "@lynx-js/react";
import { useEffect, useRef, useState } from "@lynx-js/react";

import { topBarCoinIconId } from "../components/TopBar";
import { emitCompanionEvent } from "../lib/companion-events";
import type { PlanEntitlements } from "../lib/plans-api";
import {
  subscriptionBonusClient,
  type SubscriptionBonusClaim,
} from "../lib/subscription-bonus-api";
import { LAUNCH_FLYING_COINS } from "../screens/launch/LaunchCoinFlight";
import { SubscriptionBonusModal } from "../screens/signup-reward/SignupRewardModal";
import type { ScreenWiring } from "./screen-wiring";
import { flightCoinCount } from "./signup-reward-record";
import {
  deviceSubscriptionBonusStore,
  subscriptionBonusAskKey,
  subscriptionBonusHoldsLater,
  subscriptionBonusRecordAfter,
  subscriptionBonusStep,
  type SubscriptionBonusRecord,
  type SubscriptionBonusStore,
} from "./subscription-bonus-record";

export type SubscriptionBonusInput = {
  readonly wiring: ScreenWiring;
  /** 내 권한(서버 정본) — 요금제 결선이 없거나 아직 못 읽었으면 null. */
  readonly entitlements: PlanEntitlements | null;
  /** 지도 루트이고 다른 겹침 · 안내가 없음. */
  readonly idle: boolean;
  /** 첫 유닛 안내가 지도를 덮는 동안 — 모달을 미룹니다. */
  readonly guideOn: boolean;
  /** 지금 머리 칩의 값 — 「Got it」 때 날기의 출발 값. */
  readonly chip: () => number | null;
  /** 날기가 끝나면 응답의 지갑 잔액을 칩의 서버 잔액으로. */
  readonly acceptBalance: (balance: number) => void;
  /** 테스트 주입 — 기본은 앱 서버 · 기기 저장소. */
  readonly claim?: () => Promise<SubscriptionBonusClaim | null>;
  readonly store?: SubscriptionBonusStore;
};

export type SubscriptionBonus = {
  /** 엽전 출시 · 업데이트 · Letters 안내를 미룸 — 묻는 중 · 모달 대기 · 날기. */
  readonly holdsLater: boolean;
  /** 보너스 모달이 떠 있음(날기 포함). */
  readonly open: boolean;
  /** 날기 동안의 칩 값 — 아니면 받은 값 그대로. */
  readonly coinCount: (chip: number | null) => number | null;
  readonly layer: ReactNode;
};

type Flight = { readonly from: number; readonly landed: number };

export function useSubscriptionBonus(input: SubscriptionBonusInput): SubscriptionBonus {
  const store = input.store ?? deviceSubscriptionBonusStore;
  const signedIn = input.wiring.accountState === "signed-in";
  const sink = input.wiring.messengerChat.eventSink;
  const askKey = signedIn ? subscriptionBonusAskKey(input.entitlements) : null;
  const [record, setRecord] = useState<SubscriptionBonusRecord | null>(null);
  const [asking, setAsking] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  /** 계정이 바뀔 때마다 오릅니다 — 바뀌기 전에 나간 응답은 새 계정에 적지 않습니다. */
  const session = useRef(0);
  /** 이번 실행에서 이미 물은 권한 모양. */
  const askedKey = useRef<string | null>(null);
  const balance = useRef<number | null>(null);
  const shownEvent = useRef(false);
  const latest = useRef({ input, record, store });
  latest.current = { input, record, store };

  useEffect(() => {
    session.current += 1;
    setRecord(signedIn ? store.read() : null);
    setAsking(false);
    setFlight(null);
    askedKey.current = null;
    balance.current = null;
    shownEvent.current = false;
  }, [signedIn]);

  useEffect(() => {
    if (askKey === null || !input.idle || asking || askedKey.current === askKey) return;
    // 기록이 있으면(받음 · 다른 곳에서 알림) 다시 묻지 않습니다 — 평생 한 번이라.
    // 저장소 · 주입은 `latest`로 읽습니다 — 효과가 지난 그림의 값에 묶이지 않게(리뷰 #594).
    const { store: nowStore, input: nowInput } = latest.current;
    if (latest.current.record !== null || nowStore.read() !== null) return;
    askedKey.current = askKey;
    setAsking(true);
    const asked = session.current;
    // 지도가 잠깐 바빠져도 응답은 버리지 않습니다 — 서버는 이미 알린 것으로 찍었습니다. 계정이 바뀌었을 때만 버립니다.
    void (nowInput.claim ?? (() => subscriptionBonusClient().claim()))().then((result) => {
      if (asked !== session.current) return;
      setAsking(false);
      if (result === null) return;
      const next = subscriptionBonusRecordAfter(result);
      if (next === null) return;
      if (next.amount > 0) balance.current = result.balance;
      latest.current.store.write(next);
      setRecord(next);
    });
  }, [askKey, input.idle, asking]);

  const latched = useRef(false);
  const step = subscriptionBonusStep({
    signedIn,
    record,
    idle: input.idle || latched.current,
    guideOn: input.guideOn,
  });
  latched.current = step === "modal";

  useEffect(() => {
    if (step !== "modal" || record === null || shownEvent.current) return;
    shownEvent.current = true;
    emitCompanionEvent(sink, {
      name: "subscription_bonus_shown",
      surface: "learning",
      plan: "chat_plus",
      amount: String(record.amount),
    });
  }, [step, record, sink]);

  const finish = () => {
    const now = latest.current.record;
    if (now !== null) {
      const next = { ...now, shown: true };
      latest.current.store.write(next);
      setRecord(next);
    }
    setFlight(null);
    if (balance.current !== null) latest.current.input.acceptBalance(balance.current);
    balance.current = null;
  };

  return {
    holdsLater:
      signedIn && subscriptionBonusHoldsLater({ asking, record, flying: flight !== null }),
    open: step === "modal",
    coinCount: (chip) =>
      flight === null || record === null
        ? chip
        : flightCoinCount(flight.from, record.amount, flight.landed, LAUNCH_FLYING_COINS),
    layer:
      step === "modal" && record !== null ? (
        <SubscriptionBonusModal
          amount={record.amount}
          coinTargetId={topBarCoinIconId}
          onFlightStart={() => setFlight({ from: latest.current.input.chip() ?? 0, landed: 0 })}
          onCoinLanded={(landed) => setFlight((now) => (now === null ? now : { ...now, landed }))}
          onDone={finish}
        />
      ) : null,
  };
}
