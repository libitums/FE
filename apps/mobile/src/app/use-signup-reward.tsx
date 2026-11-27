// 가입 보상 결선(ADR-0174) — 손님에게는 지도 하단 권유 카드, 로그인한 계정에는 서버 지급(계정당 한 번) 뒤 보상 모달 → 엽전 날기.
//
// 순서: 로그인했으면 지도가 한가할 때 이 계정의 지급을 이 기기에서 한 번 묻고(기록이 있으면 묻지 않음), 그 첫 물음이 끝날 때까지 엽전
// 출시 지급(ADR-0140)을 미룹니다(`holdsLaunch`) — 둘 다 받는 새 계정은 가입 모달을 먼저 봅니다. 묻기가 실패하면(오프라인 · RPC 미적용)
// 이번 실행에서는 다시 묻지 않고 출시 흐름을 막지 않습니다. 「Got it」 뒤 날기 동안 칩은 그때 값에서 닿은 몫만큼 오르고, 다 닿으면 서버
// 잔액으로 맞춥니다.

import type { ReactNode } from "@lynx-js/react";
import { useEffect, useGlobalProps, useRef, useState } from "@lynx-js/react";

import { topBarCoinIconId } from "../components/TopBar";
import { emitCompanionEvent } from "../lib/companion-events";
import { tappableBottomInsetFrom } from "../lib/safe-area";
import { signupRewardClient, type SignupRewardClaim } from "../lib/signup-reward-api";
import type { UnlimitedPass } from "../lib/unlimited-pass";
import { welcomeGiftEndOf, type WelcomeGiftEnd } from "../lib/welcome-gift-time";
import { LAUNCH_FLYING_COINS } from "../screens/launch/LaunchCoinFlight";
import { SignupRewardCard } from "../screens/signup-reward/SignupRewardCard";
import { SignupRewardModal } from "../screens/signup-reward/SignupRewardModal";
import { signupCardBottom } from "../screens/signup-reward/signup-reward-layout";
import type { ScreenWiring } from "./screen-wiring";
import {
  deviceSignupRewardStore,
  flightCoinCount,
  signupRewardHoldsLaunch,
  signupRewardRecordAfter,
  signupRewardStep,
  type SignupRewardRecord,
  type SignupRewardStore,
} from "./signup-reward-record";

/** 카드가 약속하는 수 — 서버 기본값(`companion.settings.signup_reward`)과 같습니다. 모달은 서버가 준 수를 씁니다. */
export const SIGNUP_REWARD_AMOUNT = 100;

export type SignupRewardInput = {
  readonly wiring: ScreenWiring;
  /** 지도 루트이고 다른 겹침 · 안내가 없음. */
  readonly idle: boolean;
  /** 튜토리얼(u00)을 끝냈나 — 모달은 그 뒤에만(첫 유닛 안내와 겹치지 않게). */
  readonly tutorialDone: boolean;
  /** 지금 머리 칩의 값 — 「Got it」 때 날기의 출발 값이 됩니다. */
  readonly chip: () => number | null;
  /** 날기가 끝나면 지급 응답의 지갑 잔액을 칩의 서버 잔액으로. */
  readonly acceptBalance: (balance: number) => void;
  /**
   * 창이 `nowMs`에 선다면의 첫날 무제한 이용권(ADR-0186) — 회원 · 생성 48시간 안 · 구독 없음 · 구독 상태 앎이면 그때부터 24시간(개정 4,
   * `useWelcomePass().onShown`). 창이 처음 서는 순간에 있으면 선물 두 줄(개정 3), 없으면 엽전 한 줄 — 그 판정을 창이 닫힐 때까지 붙잡습니다.
   */
  readonly welcomePassOnShown?: (nowMs: number) => UnlimitedPass | undefined;
  /** 창이 처음 선 시각(무제한 줄을 판정한 그 시각) — 첫날 무제한의 시작으로 적습니다(개정 4). */
  readonly onWelcomeShown?: (atMs: number) => void;
  /** 테스트 주입 — 기본은 앱 서버 · 기기 저장소. */
  readonly claim?: () => Promise<SignupRewardClaim | null>;
  readonly store?: SignupRewardStore;
};

export type SignupReward = {
  /** 엽전 출시 지급 · 모달을 미뤄야 함. */
  readonly holdsLaunch: boolean;
  /** 보상 모달이 떠 있음(날기 포함). */
  readonly open: boolean;
  /** 날기 동안의 칩 값 — 아니면 받은 값 그대로. */
  readonly coinCount: (chip: number | null) => number | null;
  readonly layer: ReactNode;
};

type Flight = { readonly from: number; readonly landed: number };

export function useSignupReward(input: SignupRewardInput): SignupReward {
  const { wiring, idle } = input;
  const store = input.store ?? deviceSignupRewardStore;
  const account = wiring.accountState;
  const signedIn = account === "signed-in";
  const sink = wiring.messengerChat.eventSink;
  const bottom = signupCardBottom(tappableBottomInsetFrom(useGlobalProps()));
  const [record, setRecord] = useState<SignupRewardRecord | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const inFlight = useRef(false);
  /** 계정이 바뀔 때마다 오릅니다 — 바뀌기 전에 나간 지급 응답은 새 계정에 적지 않습니다. */
  const session = useRef(0);
  const balance = useRef<number | null>(null);
  const latest = useRef(input);
  latest.current = input;
  // 이 세션에서 손님이었다가 계정이 됐나 — 모달 보조문이 갈립니다.
  const wasGuest = useRef(account === "guest");
  if (account === "guest") wasGuest.current = true;

  // 계정의 기록은 background에서 읽습니다(저장소 · 로그인 읽기). 계정이 바뀌면 다시 읽고 이번 실행의 물음도 새로 셉니다.
  // 제품 이벤트는 계정마다 한 번씩 — 로그아웃 뒤 손님 · 다른 계정이 되면 다시 셉니다.
  const cardShown = useRef(false);
  const modalShown = useRef(false);
  useEffect(() => {
    session.current += 1;
    setRecord(signedIn ? store.read() : null);
    setAttempted(false);
    setFlight(null);
    balance.current = null;
    inFlight.current = false;
    cardShown.current = false;
    modalShown.current = false;
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !idle || attempted || inFlight.current) return;
    // 이 기기에서 이미 물었으면(받았든 아니든) 다시 묻지 않습니다 — 서버가 정본이지만 요청을 아낍니다.
    if (store.read() !== null) return;
    inFlight.current = true;
    const asked = session.current;
    // 지도가 잠깐 바빠져도(한가 → 아님) 응답은 버리지 않습니다 — 버리면 서버는 이미 줬는데 모달을 못 봅니다. 계정이 바뀌었을 때만 버립니다.
    void (input.claim ?? (() => signupRewardClient().claim()))().then((result) => {
      if (asked !== session.current) return;
      inFlight.current = false;
      setAttempted(true);
      if (result === null) return;
      balance.current = result.balance;
      const next = signupRewardRecordAfter(result);
      store.write(next);
      setRecord(next);
    });
  }, [signedIn, idle, attempted]);

  const latched = useRef(false);
  const step = signupRewardStep({
    account,
    record,
    idle: idle || latched.current,
    tutorialDone: input.tutorialDone,
  });
  latched.current = step === "modal";
  // 무제한 줄은 창이 처음 서는 렌더에서 한 번 판정해 닫힐 때까지 둡니다 — 창이 떠 있는 동안 줄이 생기거나 사라지지 않습니다.
  // 그 시각이 첫날 무제한의 시작이 됩니다(개정 4) — 줄의 끝 시각과 기록이 어긋나지 않게 같은 값을 씁니다.
  const gift = useRef<WelcomeGiftEnd | null | undefined>(undefined);
  const shownAt = useRef(0);
  if (step !== "modal") gift.current = undefined;
  else if (gift.current === undefined) {
    shownAt.current = Date.now();
    gift.current = welcomeGiftEndOf(input.welcomePassOnShown?.(shownAt.current), shownAt.current);
  }

  // 제품 이벤트(ADR-0029 · D3 목적 구분) — 카드는 세션에 처음 보일 때 한 번 · 누를 때마다, 모달은 설 때 한 번.
  useEffect(() => {
    if (step === "card" && !cardShown.current) {
      cardShown.current = true;
      emitCompanionEvent(sink, { name: "signup_reward_card_shown", surface: "learning" });
    }
    if (step === "modal" && record !== null && !modalShown.current) {
      modalShown.current = true;
      latest.current.onWelcomeShown?.(shownAt.current);
      emitCompanionEvent(sink, {
        name: "signup_reward_shown",
        surface: "learning",
        amount: String(record.amount),
        unlimited: gift.current === null || gift.current === undefined ? "none" : "shown",
      });
    }
  }, [step]);

  const signUp = () => {
    emitCompanionEvent(sink, { name: "signup_reward_card_tapped", surface: "learning" });
    latest.current.wiring.onSignIn();
  };
  const finish = () => {
    if (record !== null) {
      const next = { ...record, shown: true };
      store.write(next);
      setRecord(next);
    }
    setFlight(null);
    if (balance.current !== null) latest.current.acceptBalance(balance.current);
  };

  const layer =
    step === "card" ? (
      <SignupRewardCard amount={SIGNUP_REWARD_AMOUNT} bottom={bottom} onSignUp={signUp} />
    ) : step === "modal" && record !== null ? (
      <SignupRewardModal
        amount={record.amount}
        fromGuest={wasGuest.current}
        unlimitedUntil={gift.current}
        coinTargetId={topBarCoinIconId}
        onFlightStart={() => setFlight({ from: latest.current.chip() ?? 0, landed: 0 })}
        onCoinLanded={(landed) => setFlight((now) => (now === null ? now : { ...now, landed }))}
        onDone={finish}
      />
    ) : null;

  return {
    holdsLaunch: signupRewardHoldsLaunch({ account, record, attempted, flying: flight !== null }),
    open: step === "modal",
    coinCount: (chip) =>
      flight === null || record === null
        ? chip
        : flightCoinCount(flight.from, record.amount, flight.landed, LAUNCH_FLYING_COINS),
    layer,
  };
}
