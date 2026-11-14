// 엽전 출시 안내 결선(ADR-0140) — 로그인한 사용자가 튜토리얼을 끝냈고 지도가 한가하면 서버 지급(한 번)을 부르고,
// 처음 받은 보너스면 엽전 모달 → (메신저를 쓸 수 있으면) 채팅 모달. 머리 엽전 칩은 엽전 모달을 닫은 뒤 서버 잔액을 보입니다
// (닫을 때 칩이 오르게). 새로 깬 레슨은 진행이 바뀔 때 다시 불러 서버에 더합니다(사용자 · 유닛마다 한 번).
//
// 안정성(2026-11-14 리뷰): 지급은 한 번에 하나만 돌고(돌던 중 진행이 바뀌면 끝난 뒤 한 번 더), 늦게 온 옛 응답은 버립니다.
// 칩은 서버 잔액 + 그 뒤 기기에서 바뀐 몫(레슨 보상 · 메신저 차감)이라 지급 사이에도 멈추지 않습니다. 모달이 한 번 서면
// 지도가 잠깐 바빠져도 닫힐 때까지 그대로 둡니다.

import type { ReactNode } from "@lynx-js/react";
import { useEffect, useRef, useState } from "@lynx-js/react";

import { topBarCoinIconId } from "../components/TopBar";
import type { CatalogProgress } from "../lib/catalog-progress";
import { coinClient, type CoinClaim } from "../lib/coin-wallet-api";
import { emitCompanionEvent } from "../lib/companion-events";
import { LaunchCoinsModal } from "../screens/launch/LaunchModals";
import {
  deviceLaunchStore,
  launchStep,
  tutorialDone,
  type LaunchRecord,
  type LaunchStore,
} from "./launch-coins";
import { LaunchChatStep } from "./launch-chat-step";
import { messengerAccessFor } from "./render-messenger-chat";
import type { ScreenWiring } from "./screen-wiring";

export type LaunchCoinsInput = {
  readonly wiring: ScreenWiring;
  readonly catalogProgress: CatalogProgress;
  /** 기기에서 센 엽전(서버 잔액을 받기 전 · 엽전 모달을 닫기 전에 칩이 보이는 값). */
  readonly localCoins: number | null;
  /** 지도 루트이고 다른 겹침 · 안내가 없음. */
  readonly idle: boolean;
  readonly onStartChatting: () => void;
  /** 테스트 주입 — 기본은 앱 서버 · 기기 저장소. */
  readonly claim?: () => Promise<CoinClaim | null>;
  readonly store?: LaunchStore;
};

export type LaunchCoins = {
  readonly coinCount: number | null;
  /** 모달이 떠 있음 — 다른 지도 안내(업데이트 안내 등)를 미룹니다. */
  readonly open: boolean;
  readonly layer: ReactNode;
  /** 다른 지급(연속 학습 보상, ADR-0143)이 받은 지갑 잔액 — 칩의 서버 잔액을 그 값으로 바꿉니다. */
  readonly acceptServerBalance: (balance: number) => void;
};

const unitCount = (progress: CatalogProgress): number =>
  Object.values(progress).reduce((sum, keys) => sum + keys.length, 0);

/** 서버 잔액과 그때의 기기 값 — 칩은 잔액 + (지금 기기 값 − 그때 기기 값)입니다. */
type ServerBalance = { readonly balance: number; readonly localAt: number };

export function useLaunchCoins(input: LaunchCoinsInput): LaunchCoins {
  const { wiring, catalogProgress, localCoins, idle, onStartChatting } = input;
  const store = input.store ?? deviceLaunchStore;
  const claim = input.claim ?? (() => coinClient().claim());
  const signedIn = wiring.accountState === "signed-in";
  const access = messengerAccessFor(wiring);
  const [record, setRecord] = useState<LaunchRecord | null>(null);
  const [server, setServer] = useState<ServerBalance | null>(null);
  /** 엽전 모달에서 칩에 닿은 엽전의 몫(0 ~ 1) — 칩이 기기 값에서 서버 잔액으로 그만큼 오릅니다. */
  const [landedShare, setLandedShare] = useState(0);
  /** 마지막으로 지급을 마친 유닛 수 · 도는 중인 호출의 순번 · 돌던 중 다시 불러야 하는지. */
  const claimedFor = useRef<number | null>(null);
  const inFlight = useRef<number | null>(null);
  const [retry, setRetry] = useState(0);
  const latched = useRef(false);
  const eligible = signedIn && tutorialDone(catalogProgress, wiring.legacyTutorialPassed);
  const units = unitCount(catalogProgress);
  const local = localCoins ?? 0;
  const localRef = useRef(local);
  localRef.current = local;
  const unitsRef = useRef(units);
  unitsRef.current = units;

  // 계정의 기록은 background에서 읽습니다(저장소 · 로그인 읽기). 계정이 바뀌면 다시 읽고 서버 값도 버립니다.
  useEffect(() => {
    setRecord(signedIn ? store.read() : null);
    setServer(null);
    claimedFor.current = null;
  }, [signedIn]);

  useEffect(() => {
    if (!eligible || !idle || claimedFor.current === units || inFlight.current !== null) return;
    const seq = units;
    inFlight.current = seq;
    void claim().then((result) => {
      inFlight.current = null;
      if (result !== null) {
        claimedFor.current = seq;
        setServer({ balance: result.balance, localAt: localRef.current });
        if (result.bonus > 0 && store.read() === null) {
          const next = {
            learning: result.learning,
            bonus: result.bonus,
            coinsShown: false,
            chatShown: false,
          };
          store.write(next);
          setRecord(next);
        }
      }
      // 도는 동안 진행이 바뀌었으면 끝난 뒤 한 번 더 부릅니다. 실패는 곧바로 다시 부르지 않습니다 — 네트워크가 끊긴 동안
      // 요청이 연달아 나가지 않게, 지도가 다시 한가해지거나 진행이 바뀔 때 다시 부릅니다.
      if (result !== null && unitsRef.current !== seq) setRetry((n) => n + 1);
    });
  }, [eligible, idle, units, retry]);

  const save = (next: LaunchRecord) => {
    store.write(next);
    setRecord(next);
  };
  const step = launchStep({
    record,
    chatOpen: access === "open",
    idle: (idle || latched.current) && signedIn,
  });
  latched.current = step !== null;
  const coinsPending = record !== null && !record.coinsShown;
  const settled = server === null ? null : server.balance + (local - server.localAt);
  const target = settled ?? (record === null ? 0 : record.learning + record.bonus);

  // 제품 이벤트(ADR-0029 · D3 목적 구분) — 엽전 모달이 설 때 한 번, 닫을 때 한 번. 채팅 모달 이벤트는 그 결선이 냅니다.
  const sink = wiring.messengerChat.eventSink;
  const shownStep = useRef<string | null>(null);
  const coinsClosed = useRef(false);
  useEffect(() => {
    if (step === shownStep.current) return;
    shownStep.current = step;
    if (step === "coins" && record !== null)
      emitCompanionEvent(sink, {
        name: "launch_coins_shown",
        surface: "learning",
        learning: String(record.learning),
        bonus: String(record.bonus),
        balance: String(target),
      });
  }, [step]);
  const closeChat = (choice: "start" | "later" | "back") => {
    emitCompanionEvent(sink, { name: "launch_chat_closed", surface: "learning", choice });
    if (record !== null) save({ ...record, chatShown: true });
  };

  const layer =
    step === "coins" && record !== null ? (
      <LaunchCoinsModal
        learning={record.learning}
        bonus={record.bonus}
        balance={target}
        coinTargetId={topBarCoinIconId}
        onCoinLanded={(landed, of) => setLandedShare(landed / of)}
        onDone={() => {
          if (!coinsClosed.current)
            emitCompanionEvent(sink, { name: "launch_coins_closed", surface: "learning" });
          coinsClosed.current = true;
          save({ ...record, coinsShown: true });
        }}
      />
    ) : step === "chat" && record !== null ? (
      <LaunchChatStep
        wiring={wiring}
        onLater={() => closeChat("later")}
        onBack={() => closeChat("back")}
        onStart={() => {
          closeChat("start");
          onStartChatting();
        }}
      />
    ) : null;

  return {
    // 엽전 모달이 떠 있는 동안은 기기 값에서, 엽전이 닿는 만큼 서버 잔액 쪽으로 오릅니다.
    coinCount: coinsPending
      ? local + Math.round((target - local) * landedShare)
      : (settled ?? localCoins),
    open: step !== null,
    layer,
    acceptServerBalance: (balance) => setServer({ balance, localAt: localRef.current }),
  };
}
