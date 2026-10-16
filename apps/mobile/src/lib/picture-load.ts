// 그림 문항의 로드 상태와 순수 전이입니다. UI를 import하지 않습니다.
//
// 단어 선택의 그림 문항에서 올라왔습니다 — 그림을 보고 말하는 문항도 같은 전이 · 시한을 씁니다.

export type PictureLoadState = "loading" | "loaded" | "failed";

export type PictureLoadEvent = "load" | "error" | "timeout";

/** 그림이 이 시간 안에 끝 상태가 아니면 실패로 칩니다 — `binderror`가 오지 않는 실패를 끝냅니다. */
export const pictureLoadTimeoutMs = 6000;

export function pictureLoadStateAfter(
  state: PictureLoadState,
  event: PictureLoadEvent,
): PictureLoadState {
  if (state !== "loading") return state;
  return event === "load" ? "loaded" : "failed";
}
