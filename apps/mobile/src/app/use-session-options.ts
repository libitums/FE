// 세션 옵션 상태의 주인입니다(ADR-0007 D1). 첫 렌더에 기기 저장값을 읽어 `useState`에 담고,
// 바꾸면 상태와 저장을 함께 갱신합니다. 세션이 key로 다시 서면 초기화 함수가 저장값을 다시 읽습니다.

import { useCallback, useState } from "react";

import type { SessionOptionKey, SessionOptions } from "../lib/session-options";
import { loadSessionOptions, saveSessionOption } from "../lib/session-options-storage";

export type SessionOptionsWiring = {
  readonly sessionOptions: SessionOptions;
  /** 상태를 바꾸고 저장합니다. 이벤트는 싣지 않습니다(결선 몫). */
  readonly setSessionOption: (key: SessionOptionKey, value: boolean) => void;
};

export function useSessionOptions(): SessionOptionsWiring {
  const [sessionOptions, setSessionOptions] = useState<SessionOptions>(loadSessionOptions);
  const setSessionOption = useCallback((key: SessionOptionKey, value: boolean) => {
    setSessionOptions((current) => ({ ...current, [key]: value }));
    saveSessionOption(key, value);
  }, []);
  return { sessionOptions, setSessionOption };
}
