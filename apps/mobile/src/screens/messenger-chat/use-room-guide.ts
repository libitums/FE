// 덕수쌤 방 첫 입장 코치마크의 상태입니다(2026-11-13). 첫 인사가 도착하고 입력 중이 아니며 방 위에 다른 겹침(생년 시트 ·
// 사이드바 · 대화상자)이 없을 때 한 번 뜹니다 — 로그가 비어 있으면 무엇을 가리키는지 모르고, 생년 시트가 먼저 뜨면 그 뒤에
// 묻혔습니다(기기 확인). 겹침이 다시 열리면 숨었다가 닫히면 같은 단계로 돌아옵니다. 끝까지 누르면 기기에 남깁니다 — 건너뛸 수 없습니다(사용자 결정 2026-11-23).
// 예시 스냅샷 단계(ADR-0146 추가): 서버가 제안할 때만 서고, 안내를 이미 본 사람에게는 그 단계만 따로 한 번 뜹니다. 사진 알약을
// 누르면 예시를 받고 끝납니다(`takeSample`).
// 키보드 두 갈래 단계(ADR-0190): 맨 앞. 휴대폰 키보드 화면 → Next → Hangul keys 화면 → Next. 안내 안의 토글을 직접 눌러도 화면이
// 따라갑니다. 입력 줄 키보드를 화면에 맞추는 일은 `useGuideKeyboard`가 합니다(이 훅은 방 상태를 모릅니다).

import { useEffect, useRef, useState } from "@lynx-js/react";

import type { ComposerKeyboard } from "./keyboard-plan";

import { useChatEvents } from "./chat-events";
import type { SampleOffer } from "./chat-media.contract";
import type { SampleSnapshotMethods } from "./chat-remote-sample";
import type { ChatThread } from "./chat-source.contract";
import { useGreetingLock } from "./use-greeting-lock";
import {
  finishedRoomPart,
  GUIDE_ROOM_ID,
  isSampleStep,
  keyboardGuideNext,
  keyboardGuidePhoneHidden,
  roomGuideSteps,
  type GuideStep,
  type GuideStore,
  type KeyboardGuideStage,
} from "./messenger-guide";

// 이번 실행에서 서버가 「예시 없음」이라 답한 방 — 방을 다시 열 때마다 묻지 않습니다(기기에 남기지는 않음: 운영이 예시를 나중에
// 켜면 다음 실행에서 다시 묻습니다).
const declined = new Set<string>();

/** 테스트 사이에 기억을 비웁니다. */
export function resetSampleOfferMemoryForTests(): void {
  declined.clear();
}

export type RoomGuide = {
  readonly steps: readonly GuideStep[];
  readonly index: number;
  /** 지금 가리키는 단계 — 안내가 없으면 null. */
  readonly step: GuideStep | null;
  /** 안내를 이미 본 사람에게 예시 단계만 뜬 것 — 「1 of 1」 대신 「New」. */
  readonly sampleOnly: boolean;
  /** 다음 단계로 — 마지막이면 끝. 예시 단계에서는 무동작(사진 알약을 눌러야 끝납니다). 건너뛰기는 없습니다. */
  readonly next: () => void;
  /** 예시 단계에서 그 알약(사진 · 음성)을 눌렀습니다 — 예시를 받고 다음 단계로, 마지막이면 안내를 끝냅니다. */
  readonly takeSample: () => void;
  /** 키보드 단계 안의 화면(ADR-0190) — 휴대폰 키보드 먼저. */
  readonly keyboardStage: KeyboardGuideStage;
  /** 키보드 단계에서 안내 안의 토글을 눌렀습니다 — 그 칸의 화면으로 바꿉니다. */
  readonly selectKeyboard: (mode: ComposerKeyboard) => void;
  /** 입력 칸이 알린 휴대폰 키보드 높이(pt/dp, 내려가면 0) — 휴대폰 키보드 화면에서 키보드가 내려가면 Hangul keys 화면으로 넘깁니다. */
  readonly phoneKeyboardHeight: (height: number) => void;
  /** 안내 전 첫 인사를 기다리는 중 — 입력 줄 보내기 · 답장 보기를 잠급니다(ADR-0139 개정 2026-11-27, 상한 시간 뒤 풂). */
  readonly waitingGreeting: boolean;
};

export function useRoomGuide(
  roomId: string,
  thread: ChatThread | null,
  store: GuideStore,
  /** 방 위에 다른 겹침이 열려 있음 — 그동안 코치마크를 숨깁니다. */
  covered: boolean,
  /** 예시 스냅샷(서버 모드에서만) — 없으면 예시 단계가 서지 않습니다. */
  sample?: SampleSnapshotMethods,
  /** 입력 줄에 키보드 토글이 서는 방인가 — 아니면 키보드 단계가 빠집니다(ADR-0190). */
  toggle = true,
): RoomGuide {
  const { emit } = useChatEvents();
  const guideRoom = roomId === GUIDE_ROOM_ID;
  const [roomSeen] = useState(() => !(guideRoom && store.unseen("room")));
  const [snapshotSeen] = useState(() => !(guideRoom && store.unseen("snapshot")));
  const [voiceSeen] = useState(() => !(guideRoom && store.unseen("voice")));
  const [keyboardSeen] = useState(() => !(guideRoom && store.unseen("keyboard")));
  const [keyboardStage, setKeyboardStage] = useState<KeyboardGuideStage>("phone");
  const [offer, setOffer] = useState<SampleOffer>({ snapshot: false, voice: false });
  const [ended, setEnded] = useState(false);
  const [index, setIndex] = useState(0);
  const greeted =
    thread !== null &&
    !thread.typing &&
    thread.messages.some((m) => m.kind === "text" && m.from === "them");
  const server = thread !== null && thread.server !== null;
  const waitingGreeting = useGreetingLock(guideRoom, !roomSeen, thread);

  // 예시를 줄 수 있는지는 서버가 정합니다 — 첫 인사가 온 뒤 한 번 묻고, 답이 올 때까지 안내를 세우지 않습니다(도중에 단계 수가
  // 바뀌지 않게).
  const asks =
    guideRoom && !(snapshotSeen && voiceSeen) && sample !== undefined && !declined.has(roomId);
  const [answered, setAnswered] = useState(false);
  const asked = useRef(false);
  const canAsk = asks && server && greeted;
  useEffect(() => {
    if (!canAsk || asked.current || sample === undefined) return;
    asked.current = true;
    void sample.offered(roomId).then((answer) => {
      if (answer.snapshot || answer.voice) setOffer(answer);
      else declined.add(roomId);
      setAnswered(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAsk]);

  const steps = guideRoom
    ? roomGuideSteps({
        roomSeen,
        snapshotSeen,
        offered: offer.snapshot,
        voiceSeen,
        voiceOffered: offer.voice,
        keyboardSeen,
        toggle,
      })
    : [];
  const ready = !asks || answered;
  // 입력이 막히면(나이 · 일시 차단 · 이용 시간, ADR-0125) 숨깁니다 — 가리킬 알약이 사라지고, 안내가 뒤로가기를 삼켜 방에 갇혔습니다
  // (점검 1). 풀리면 같은 단계로 돌아옵니다.
  const blocked = thread !== null && thread.inputBlock !== null;
  const shown = !ended && ready && steps.length > 0 && !covered && !blocked && server && greeted;
  const step = shown ? (steps[index] ?? null) : null;
  const taken = useRef<GuideStep | null>(null);
  const keyboardEvent = (
    stage: KeyboardGuideStage,
    action: "shown" | "next" | "switched" | "hidden",
  ) => emit({ name: "messenger_guide_keyboard", surface: "chat", stage, action });
  // 키보드 단계의 화면이 설 때마다 한 번(겹침에 가려졌다 돌아온 것은 다시 세지 않습니다).
  const shownStages = useRef<Set<KeyboardGuideStage>>(new Set());
  const keyboardShown = step === "keyboard" ? keyboardStage : null;
  useEffect(() => {
    if (keyboardShown === null || shownStages.current.has(keyboardShown)) return;
    shownStages.current.add(keyboardShown);
    keyboardEvent(keyboardShown, "shown");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardShown]);
  // 이 화면 동안 휴대폰 키보드가 한 번 올라왔는가 — 오르기 전에 온 0으로 넘기지 않습니다. 화면이 바뀌면 다시 셉니다.
  const phoneRisen = useRef(false);
  useEffect(() => {
    phoneRisen.current = false;
  }, [keyboardShown]);
  const advance = () => {
    if (index >= steps.length - 1) end();
    else setIndex(index + 1);
  };
  /** 안내를 끝냅니다(건너뛰기가 없어 늘 끝까지 본 것). 예시 단계는 여기서 적지 않습니다 — 받은 뒤에 적습니다. */
  const end = () => {
    emit({
      name: "messenger_guide_finished",
      surface: "chat",
      part: finishedRoomPart({ roomSeen, steps }),
      outcome: "done",
    });
    if (steps.includes("keyboard")) store.markSeen("keyboard");
    store.markSeen("room");
    // 푸시 · 새 친구 시트로 덕수쌤 방에 먼저 온 사용자가 목록에서 「Chat with 덕수쌤」을 또 보지 않게.
    store.markSeen("list");
    setEnded(true);
  };
  return {
    steps,
    index,
    step,
    sampleOnly: roomSeen,
    waitingGreeting,
    keyboardStage,
    next: () => {
      // 예시 단계는 그 알약을 눌러야 끝납니다.
      if (step === null || isSampleStep(step)) return;
      if (step === "keyboard") {
        keyboardEvent(keyboardStage, "next");
        const after = keyboardGuideNext(keyboardStage);
        if (after !== "done") return setKeyboardStage(after);
      }
      advance();
    },
    selectKeyboard: (mode) => {
      const stage: KeyboardGuideStage = mode === "phone" ? "phone" : "hangul";
      if (step !== "keyboard" || stage === keyboardStage) return;
      keyboardEvent(stage, "switched");
      setKeyboardStage(stage);
    },
    phoneKeyboardHeight: (height) => {
      if (step !== "keyboard") return;
      const risen = phoneRisen.current;
      if (keyboardStage === "phone" && height > 0) phoneRisen.current = true;
      if (!keyboardGuidePhoneHidden({ stage: keyboardStage, height, risen })) return;
      // Next를 누른 것과 같은 결과 — Hangul keys 화면(토글 · 잰 높이 · 꼬리), 이벤트만 hidden으로 구분합니다.
      keyboardEvent(keyboardStage, "hidden");
      setKeyboardStage("hangul");
    },
    takeSample: () => {
      if (!isSampleStep(step) || sample === undefined || taken.current === step) return;
      taken.current = step;
      advance();
      // 받았거나 서버가 주지 않기로 했으면 본 것으로 적습니다 — 거절을 적지 않으면 방에 올 때마다 같은 단계 · 회색 줄이 다시 섰습니다
      // (점검 2). 못 물었으면(연결) 다음에 방에 올 때 다시 권합니다.
      const part = step === "sample" ? "snapshot" : "voice";
      void sample.claim(roomId, step === "sample" ? "photo" : "voice").then((outcome) => {
        if (outcome !== "failed") store.markSeen(part);
      });
    },
  };
}
