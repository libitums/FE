// 광고 보고 티켓 1장(ADR-0209)의 결선 — 「Out of tickets」가 떠 있는 동안 서버 상태 · 실험 플래그를 읽고, 누르면 서버 시작(요청 id) →
// 호스트 광고 불러오기(8초 넘으면 A5) → 보여 주기(SSV에 사용자 id · 요청 id) → 지급 확인(간격을 늘려 다시 읽음) → 원장에 1장.
// 상태 전이는 순수 함수 `adTicketStep`이 정하고 여기서는 실행만 합니다. 대화상자가 닫히면 세대를 올려 늦은 응답 · 타이머를 버립니다.
// 그리지 않는 조건(하나라도): 호스트 광고 모듈 없음(값 파일 없음) · 로그인 없음 · 서버 스위치 off · 대상 아님 · 대조군.

import { useEffect, useRef, useState } from "@lynx-js/react";

import {
  adTicketHidden,
  adTicketLoadTimeoutMs,
  adTicketPollDelayMs,
  adTicketStep,
  utcOffsetMinutes,
} from "../lib/ad-ticket";
import { adTicketClient } from "../lib/ad-ticket-api";
import type { AdTicketClient } from "../lib/ad-ticket-api";
import { adTicketFlag } from "../lib/ad-ticket-flag";
import type { AdTicketFlag } from "../lib/ad-ticket-flag";
import type {
  AdTicketInput,
  AdTicketState,
  AdTicketWiring,
  RewardedAdLoad,
  RewardedAdShow,
} from "../lib/ad-ticket.contract";
import { stopAudio } from "../lib/audio";
import { loadAuthSession } from "../lib/auth-session";
import { authUserIdFrom } from "../lib/auth-user-id";
import { loadRewardedAd, rewardedAdAvailable, showRewardedAd } from "../lib/rewarded-ad";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";

export type AdTicketDeps = {
  readonly client: () => AdTicketClient;
  readonly flag: () => AdTicketFlag;
  readonly available: () => boolean;
  readonly load: () => Promise<RewardedAdLoad>;
  readonly show: (userId: string, customData: string) => Promise<RewardedAdShow>;
  readonly userId: () => string | null;
  readonly offset: () => number;
  /** 광고가 소리를 내는 동안 앱 소리를 멈춥니다(레슨 오디오). */
  readonly quiet: () => void;
};

const appDeps: AdTicketDeps = {
  client: adTicketClient,
  flag: adTicketFlag,
  available: rewardedAdAvailable,
  load: loadRewardedAd,
  show: showRewardedAd,
  userId: () => {
    const session = loadAuthSession();
    return session === null ? null : authUserIdFrom(session.accessToken);
  },
  offset: () => utcOffsetMinutes(new Date()),
  quiet: stopAudio,
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 광고 불러오기와 제한 시간의 경주 — 넘으면 `timeout`. */
function loadWithin(load: () => Promise<RewardedAdLoad>): Promise<RewardedAdLoad | "timeout"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), adTicketLoadTimeoutMs);
    void load()
      .catch(() => "unavailable" as const)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      });
  });
}

export function useAdTicket(
  open: boolean,
  onGrant: () => void,
  sink: EpisodeIntroEventSink,
  overrides: Partial<AdTicketDeps> = {},
): AdTicketWiring | undefined {
  const deps = { ...appDeps, ...overrides };
  const [state, setState] = useState<AdTicketState>(adTicketHidden);
  const current = useRef<AdTicketState>(adTicketHidden);
  const generation = useRef(0);
  const latest = useRef({ deps, onGrant, sink });
  latest.current = { deps, onGrant, sink };

  /** 이 세대의 입력 하나를 적용합니다 — 지난 세대(닫힌 대화상자)의 늦은 결과는 버립니다. */
  const apply = (gen: number, input: AdTicketInput): AdTicketState | null => {
    "background only";
    if (gen !== generation.current) return null;
    const step = adTicketStep(current.current, input);
    current.current = step.state;
    setState(step.state);
    if (step.event !== null) latest.current.sink?.(step.event);
    if (step.grant) latest.current.onGrant();
    return step.state;
  };

  useEffect(() => {
    generation.current += 1;
    const gen = generation.current;
    current.current = adTicketHidden;
    setState(adTicketHidden);
    const { deps: d, sink: s } = latest.current;
    const userId = d.userId();
    if (!open || userId === null || !d.available()) return;
    void Promise.all([d.client().status(d.offset()), d.flag().arm(userId)]).then(
      ([status, arm]) => {
        if (gen !== generation.current || status === null || !status.enabled || !status.eligible) {
          return;
        }
        s?.({ name: "ad_ticket_offer_shown", arm, left: String(status.left) });
        if (arm === "test") apply(gen, { type: "status", status });
      },
    );
    return () => {
      generation.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A5 — 1분 뒤 버튼을 다시 세웁니다.
  useEffect(() => {
    if (state.kind !== "no-fill") return;
    const gen = generation.current;
    const timer = setTimeout(
      () => apply(gen, { type: "retry" }),
      Math.max(0, state.retryAtMs - Date.now()),
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const confirm = async (gen: number, requestId: string): Promise<void> => {
    const d = latest.current.deps;
    for (;;) {
      const now = current.current;
      if (now.kind !== "busy" || now.step !== "confirming") return;
      const delay = adTicketPollDelayMs(now.polls);
      if (delay === null) return;
      await wait(delay);
      if (gen !== generation.current) return;
      const status = await d.client().status(d.offset(), requestId);
      if (apply(gen, { type: "polled", status }) === null) return;
    }
  };

  const watch = async (): Promise<void> => {
    const gen = generation.current;
    const d = latest.current.deps;
    const userId = d.userId();
    if (current.current.kind !== "offer" || userId === null) return;
    apply(gen, { type: "tap" });
    const start = await d.client().start(d.offset());
    const afterStart = apply(gen, { type: "started", start });
    if (afterStart?.kind !== "busy" || start?.result !== "ok") return;
    const load = await loadWithin(d.load);
    if (apply(gen, { type: "loaded", load, nowMs: Date.now() })?.kind !== "busy") return;
    d.quiet();
    const show = await d.show(userId, start.requestId);
    if (apply(gen, { type: "shown", show })?.kind !== "busy") return;
    await confirm(gen, start.requestId);
  };

  if (state.kind === "hidden") return undefined;
  return {
    state,
    onWatch: () => {
      "background only";
      void watch().catch(() => undefined);
    },
  };
}
