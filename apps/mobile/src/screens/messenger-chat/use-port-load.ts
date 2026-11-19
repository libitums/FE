// 목록 화면이 마운트마다 한 번 읽는 포트 값(먼저 만나기 제안 ADR-0162 D5 · 보이는 친구 ADR-0163 D2)의 공통 훅입니다.
// 포트 객체가 렌더마다 바뀌어도 다시 부르지 않게, 마운트 때 한 번 그때의 함수를 씁니다(리뷰 #503). 손님 → 회원처럼 읽을 길이 새로
// 생길 때만 다시 읽습니다. 못 읽으면(거절) `fallback`으로 끝냅니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

export type PortLoad<T> = { readonly done: boolean; readonly value: T };

export function usePortLoad<T>(loader: (() => Promise<T>) | null, fallback: T): PortLoad<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const fallbackRef = useRef(fallback);
  const [state, setState] = useState<PortLoad<T>>({ done: false, value: fallback });
  const hasLoader = loader !== null;
  useEffect(() => {
    const load = loaderRef.current;
    if (load === null) return undefined;
    let live = true;
    void load()
      .then((value) => {
        if (live) setState({ done: true, value });
      })
      .catch(() => {
        if (live) setState({ done: true, value: fallbackRef.current });
      });
    return () => {
      live = false;
    };
  }, [hasLoader]);
  return state;
}
