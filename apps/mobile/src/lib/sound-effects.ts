/** iOS 호스트의 효과음 접점. 다른 호스트에서는 조용히 무동작한다. */
export type SoundEffectId =
  | "button"
  | "correct_answer"
  | "wrong_answer"
  | "lesson_complete"
  | "pass_lesson"
  | "failed_lesson"
  | "ring_bell"
  | "accept_call";

interface SoundEffectsModule {
  play(id: SoundEffectId): void;
  stopRing(): void;
}

function nativeModule(): SoundEffectsModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  const module = (NativeModules as Record<string, unknown>)["SoundEffectsModule"] as
    | SoundEffectsModule
    | null
    | undefined;
  return module ?? undefined;
}

export function playSound(id: SoundEffectId): void {
  try {
    nativeModule()?.play(id);
  } catch {
    // 효과음은 필수 기능이 아니다. 재생 실패가 채점·탐색을 막지 않는다.
  }
}

export function stopRing(): void {
  try {
    nativeModule()?.stopRing();
  } catch {
    // 화면 이탈은 벨 중지 실패와 무관하게 진행한다.
  }
}
