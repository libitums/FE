// 방 안내의 키보드 단계(ADR-0190)가 입력 줄 키보드를 화면에 맞춥니다. 휴대폰 키보드 화면이면 입력 칸에 초점을 줘 휴대폰 키보드를 열고
// (그때 입력 칸이 `keyboardheightchange`로 실제 높이를 재 기기에 남깁니다 — `usePhoneKeyboardHeight`), Hangul keys 화면이면 학습
// 키보드를 같은 자리 높이로 세웁니다. 키보드 단계를 떠나면(다음 단계 · 안내 끝 · 겹침에 가려짐) 키보드를 접습니다 — 키보드 값은
// Hangul keys(채팅 기본값)로 남습니다. 뒤로가기는 삼킵니다(ADR-0139 개정 2026-11-23) — 방의 「열린 키보드 접기」보다 위에 서도록
// 키보드 자리가 열린 같은 커밋에 방 훅(useChatRoom) 뒤 순서로 등록합니다.
// 입력 칸이 알린 휴대폰 키보드 높이는 방(`measure` — 잰 값을 기기에 남김, 0은 버림)과 안내(휴대폰 키보드 화면에서 키보드가 내려가면
// Hangul keys 화면으로, ADR-0190 개정 2026-11-24) 둘 다에 건넵니다 — 돌려주는 함수가 그 자리입니다.

import { useEffect, useRef } from "@lynx-js/react";

import { useLayerBack } from "../../lib/use-back-handler";
import type { ChatRoomAction, ChatRoomState } from "./chat-room-state";
import { keyboardOfStage } from "./messenger-guide";
import type { RoomGuide } from "./use-room-guide";

export function useGuideKeyboard(
  guide: Pick<RoomGuide, "step" | "keyboardStage" | "phoneKeyboardHeight">,
  state: ChatRoomState,
  dispatch: (action: ChatRoomAction) => void,
  measure: (height: number) => void,
): (height: number) => void {
  const { step, keyboardStage: stage } = guide;
  const want = step === "keyboard" ? keyboardOfStage(stage) : null;
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (want === null) return;
    const current = stateRef.current;
    if (current.keyboard !== want) dispatch({ type: "switch-keyboard", to: want });
    else if (current.slot.kind === "closed") dispatch({ type: "open-keyboard" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want]);

  useLayerBack(
    want !== null && state.slot.kind !== "closed"
      ? () => {
          "background only";
        }
      : null,
  );

  const shown = step === "keyboard";
  const wasShown = useRef(false);
  useEffect(() => {
    const left = wasShown.current && !shown;
    wasShown.current = shown;
    if (!left) return;
    if (stateRef.current.keyboard !== "learning")
      dispatch({ type: "switch-keyboard", to: "learning" });
    dispatch({ type: "close-keyboard" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  return (height) => {
    measure(height);
    guide.phoneKeyboardHeight(height);
  };
}
