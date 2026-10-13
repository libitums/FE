/** 런타임 오류 통로(`lynx.reportError`)가 받는 값입니다. */
export type CrashReportable = Error | string;

export const NON_ERROR_THROWN_MESSAGE = "Non-error value thrown";

/** 껍데기: 동작은 구현 단계에서 채웁니다(docs/adr/0058). */
export function crashReportableFrom(_thrown: unknown): CrashReportable {
  return "";
}

/** 껍데기: 동작은 구현 단계에서 채웁니다(docs/adr/0058). */
export function reportCrash(_thrown: unknown): void {}
