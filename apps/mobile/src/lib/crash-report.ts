/** 런타임 오류 통로(`lynx.reportError`)가 받는 값입니다. */
export type CrashReportable = Error | string;

export const NON_ERROR_THROWN_MESSAGE = "Non-error value thrown";

/**
 * 던져진 값을 오류 통로가 받는 모양으로 바꿉니다. 임의 객체는 문자열로 풀지 않습니다 —
 * 안에 무엇이 들었는지 모르기 때문입니다(docs/adr/0061).
 */
export function crashReportableFrom(thrown: unknown): CrashReportable {
  if (thrown instanceof Error) return thrown;
  if (typeof thrown === "string") return thrown;
  return new Error(NON_ERROR_THROWN_MESSAGE);
}

/** 에러 경계가 잡은 예외를 런타임 오류 통로로 한 번 넘깁니다. 수집이 앱을 죽이지 않도록 던지지 않습니다. */
export function reportCrash(thrown: unknown): void {
  try {
    if (typeof lynx === "undefined" || typeof lynx.reportError !== "function") return;
    lynx.reportError(crashReportableFrom(thrown));
  } catch {
    // 수집 실패는 삼킨다.
  }
}
