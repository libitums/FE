// 그림 문항의 로드 상태를 문항마다 들고 있는 훅입니다.
//
// 스캐폴드: 늘 `loading`이고 이벤트를 받지 않는 자리표시자입니다.

import type { PictureLoadState } from "../../lib/picture-load";

const noop = (): void => undefined;

export function useSpeakWordPicture(
  _questionIndex: number,
  _meaning: string | null,
): {
  readonly state: PictureLoadState;
  readonly onLoad: () => void;
  readonly onError: () => void;
} {
  return { state: "loading", onLoad: noop, onError: noop };
}
