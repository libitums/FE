import { useEffect, useRef } from "@lynx-js/react";

/**
 * 화면 안 겹침 레이어의 열림을 바깥(App)에 알립니다. 탭 루트 화면이 레이어를 열면 전역
 * 머리가 그 동안 낭독에서 빠져야 하는데(ADR-0016 D9), 머리는 화면 밖(셸)에 있어 화면이
 * 스스로 가릴 수 없습니다.
 *
 * 화면이 내려갈 때(탭 전환 · 위에 화면이 쌓임) `false`를 한 번 더 알립니다 — 레이어가
 * 열린 채 화면이 사라지면 머리가 영영 가려진 채로 남기 때문입니다.
 */
export function useScreenLayer(open: boolean, onChange: ((open: boolean) => void) | undefined) {
  // 알림은 열림이 바뀔 때만 보내지만, 부르는 것은 늘 최신 콜백입니다 — 부모가 다시 그려져
  // 콜백이 바뀌어도 앞 렌더의 콜백을 부르지 않게 합니다(내려갈 때의 `false`도 같습니다).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current?.(open);
  }, [open]);

  useEffect(
    () => () => {
      onChangeRef.current?.(false);
    },
    [],
  );
}
