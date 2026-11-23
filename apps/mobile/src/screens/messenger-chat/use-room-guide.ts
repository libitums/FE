// 덕수쌤 방 첫 입장 코치마크의 상태입니다(2026-11-13). 첫 인사가 도착하고 입력 중이 아니며 방 위에 다른 겹침(생년 시트 ·
// 사이드바 · 대화상자)이 없을 때 한 번 뜹니다 — 로그가 비어 있으면 무엇을 가리키는지 모르고, 생년 시트가 먼저 뜨면 그 뒤에
// 묻혔습니다(기기 확인). 겹침이 다시 열리면 숨었다가 닫히면 같은 단계로 돌아옵니다. 끝내거나 Skip하면 기기에 남깁니다.
// 예시 스냅샷 단계(ADR-0146 추가): 서버가 제안할 때만 서고, 안내를 이미 본 사람에게는 그 단계만 따로 한 번 뜹니다. 사진 알약을
// 누르면 예시를 받고 끝납니다(`takeSample`).

import { useEffect, useRef, useState } from "@lynx-js/react";

import { useChatEvents } from "./chat-events";
import type { SampleSnapshotMethods } from "./chat-remote-sample";
import type { ChatThread } from "./chat-source.contract";
import { GUIDE_ROOM_ID, roomGuideSteps, type GuideStep, type GuideStore } from "./messenger-guide";

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
  readonly next: () => void;
  readonly skip: () => void;
  /** 예시 단계에서 사진 알약을 눌렀습니다 — 안내를 끝내고 예시를 받습니다. */
  readonly takeSample: () => void;
};

export function useRoomGuide(
  roomId: string,
  thread: ChatThread | null,
  store: GuideStore,
  /** 방 위에 다른 겹침이 열려 있음 — 그동안 코치마크를 숨깁니다. */
  covered: boolean,
  /** 예시 스냅샷(서버 모드에서만) — 없으면 예시 단계가 서지 않습니다. */
  sample?: SampleSnapshotMethods,
): RoomGuide {
  const { emit } = useChatEvents();
  const guideRoom = roomId === GUIDE_ROOM_ID;
  const [roomSeen] = useState(() => !(guideRoom && store.unseen("room")));
  const [snapshotSeen] = useState(() => !(guideRoom && store.unseen("snapshot")));
  const [offered, setOffered] = useState(false);
  const [ended, setEnded] = useState(false);
  const [index, setIndex] = useState(0);
  const greeted =
    thread !== null &&
    !thread.typing &&
    thread.messages.some((m) => m.kind === "text" && m.from === "them");
  const server = thread !== null && thread.server !== null;

  // 예시를 줄 수 있는지는 서버가 정합니다 — 첫 인사가 온 뒤 한 번 묻고, 답이 올 때까지 안내를 세우지 않습니다(도중에 단계 수가
  // 바뀌지 않게).
  const asks = guideRoom && !snapshotSeen && sample !== undefined && !declined.has(roomId);
  const [answered, setAnswered] = useState(false);
  const asked = useRef(false);
  const canAsk = asks && server && greeted;
  useEffect(() => {
    if (!canAsk || asked.current || sample === undefined) return;
    asked.current = true;
    void sample.offered(roomId).then((available) => {
      if (available) setOffered(true);
      else declined.add(roomId);
      setAnswered(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAsk]);

  const steps = guideRoom ? roomGuideSteps({ roomSeen, snapshotSeen, offered }) : [];
  const ready = !asks || answered;
  const shown = !ended && ready && steps.length > 0 && !covered && server && greeted;
  const step = shown ? (steps[index] ?? null) : null;
  const taking = useRef(false);
  /** `sampleSeen` — 예시 단계를 본 것으로 적는가(받기는 결과를 본 뒤에 적습니다). */
  const end = (outcome: "done" | "skipped", sampleSeen: boolean) => {
    emit({
      name: "messenger_guide_finished",
      surface: "chat",
      part: roomSeen ? "snapshot" : "room",
      outcome,
    });
    store.markSeen("room");
    // 푸시 · 새 친구 시트로 덕수쌤 방에 먼저 온 사용자가 목록에서 「Chat with 덕수쌤」을 또 보지 않게.
    store.markSeen("list");
    if (sampleSeen && steps.includes("sample")) store.markSeen("snapshot");
    setEnded(true);
  };
  return {
    steps,
    index,
    step,
    sampleOnly: roomSeen,
    next: () => {
      // 예시 단계는 알약을 누르거나 Skip해야 끝납니다.
      if (step === "sample") return;
      if (index >= steps.length - 1) end("done", false);
      else setIndex(index + 1);
    },
    // 넘겼으면(예시 단계까지 갔든 아니든) 다시 권하지 않습니다.
    skip: () => end("skipped", true),
    takeSample: () => {
      if (step !== "sample" || sample === undefined || taking.current) return;
      taking.current = true;
      end("done", false);
      // 받은 뒤에야 본 것으로 적습니다 — 받지 못하면 다음에 방에 올 때 다시 권합니다.
      void sample.claim(roomId).then((received) => {
        if (received) store.markSeen("snapshot");
      });
    },
  };
}
