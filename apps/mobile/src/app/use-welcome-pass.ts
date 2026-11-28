// 첫날 무제한 티켓 결선 — 회원만(ADR-0186 개정 1). 저장된 세션의 계정 생성 시각과 가입 보상 창 기록(개정 4)을 읽어 `ticketsUnlimited()`의
// 끝 시각을 맞추고, 머리 칩 · 무제한 모달이 그릴 이용권(timed)을 냅니다. 세션은 로그인 · 갱신 · 로그아웃으로 바뀌므로 렌더 뒤마다 다시 읽고
// 바뀌었을 때만 다시 그립니다(`use-tester-access`와 같은 꼴). 끝나는 순간 다시 그려 칩이 숫자로 돌아옵니다. 안내 모달은 없습니다.
// 활성 구독이 있으면(요금제 종류 무관) 칩 · 모달 · 판정 모두 없고, 구독 상태를 모르는 동안은 칩을 그리지 않습니다(개정 2).
// 시작은 가입 보상 창이 처음 선 시각이고(생성 48시간 안일 때), 창이 아직 앞에 있으면 시작하지 않습니다(개정 4).

import { useEffect, useState } from "@lynx-js/react";

import { MAX_TIMER_MS, type SubscriptionState } from "../lib/plan-access";
import { setWelcomeTicketPass } from "../lib/reward-ticket-pass";
import type { UnlimitedPass } from "../lib/unlimited-pass";
import {
  WELCOME_PASS_MS,
  welcomePassOf,
  welcomePassOnShown,
  welcomePassStartFrom,
  welcomeTicketUntilMs,
  type WelcomePassBasis,
} from "../lib/welcome-pass";
import { deviceWelcomePassStore, type WelcomePassStore } from "./welcome-pass-record";

export type WelcomePass = {
  /** 머리 칩 · 무제한 모달이 그릴 이용권 — 없거나 시작 전 · 끝났으면 undefined. */
  readonly pass: UnlimitedPass | undefined;
  /** 가입 보상 창이 `nowMs`에 선다면의 이용권 — 창의 무제한 줄이 렌더에서 읽습니다(저장하지 않음). */
  readonly onShown: (nowMs: number) => UnlimitedPass | undefined;
  /** 창이 처음 선 시각을 이 계정의 기기 기록에 적고 다시 읽습니다 — background(효과)에서 부릅니다. */
  readonly markShown: (atMs: number) => void;
};

const sameBasis = (a: WelcomePassBasis | null, b: WelcomePassBasis): boolean =>
  a !== null &&
  a.accountCreatedAt === b.accountCreatedAt &&
  a.shownAtMs === b.shownAtMs &&
  a.windowAhead === b.windowAhead;

export function useWelcomePass(
  subscription: SubscriptionState,
  tutorialDone: boolean,
  store: WelcomePassStore = deviceWelcomePassStore(),
): WelcomePass {
  const [basis, setBasis] = useState<WelcomePassBasis | null>(null);
  const [, setTick] = useState(0);

  // 저장소는 background에서만 읽습니다. 티켓 결선은 이 훅보다 먼저 렌더에서 읽으므로 모듈 값을 맞춘 뒤 다시 그립니다.
  // 구독 중이면 0(개정 2), 구독 상태를 모르는 동안은 끝 시각을 두어 티켓을 쓰지 않습니다(칩은 그리지 않음).
  useEffect(() => {
    const read = store.read(tutorialDone);
    setWelcomeTicketPass(welcomeTicketUntilMs(welcomePassStartFrom(read), subscription));
    if (!sameBasis(basis, read)) setBasis(read);
  });
  useEffect(() => () => setWelcomeTicketPass(0), []);

  const startedAtMs = basis === null ? null : welcomePassStartFrom(basis);
  const untilMs = startedAtMs === null ? 0 : startedAtMs + WELCOME_PASS_MS;
  useEffect(() => {
    const left = untilMs - Date.now();
    if (left <= 0) return undefined;
    const handle = setTimeout(() => setTick((n) => n + 1), Math.min(left + 1000, MAX_TIMER_MS));
    return () => clearTimeout(handle);
  }, [untilMs]);

  return {
    pass: welcomePassOf(startedAtMs, Date.now(), subscription),
    onShown: (nowMs) =>
      welcomePassOnShown(
        basis?.accountCreatedAt ?? null,
        basis?.shownAtMs ?? null,
        nowMs,
        subscription,
      ),
    markShown: (atMs) => {
      store.markShown(atMs);
      setTick((n) => n + 1);
    },
  };
}
