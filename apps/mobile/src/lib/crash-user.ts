// 오류 수집(Sentry)의 「누구인가」를 호스트에 넘깁니다(ADR-0207). 넘기는 값은 **내부 사용자 ID 하나**입니다 —
// PostHog의 distinct id와 같은 값(액세스 토큰의 `sub`)이고, 이메일 · 이름 · IP는 넘기지 않습니다.
//
// 호스트 모듈 `CrashReportingModule`(iOS · Android)이 받습니다. 모듈이 없거나(Lynx Explorer · 테스트) 던져도
// 아무 일도 일어나지 않습니다 — 수집이 로그인 · 로그아웃을 막지 않습니다. 비회원은 서버 ID가 없어 넘길 것이 없습니다.
// 백그라운드 전용 표시를 두지 않습니다 — 모듈은 부를 때만 읽고, 부르는 자리(로그인 · 로그아웃 결선)는 이벤트 처리 안입니다.

/** 호스트 모듈 이름입니다. */
export const crashReportingModuleName = "CrashReportingModule";

/** 호스트가 여는 두 메서드입니다. 응답 · 콜백은 없습니다. */
export type CrashReportingModule = {
  readonly setUser: (userId: string) => void;
  readonly clearUser: () => void;
};

const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 내부 사용자 ID(UUID 꼴)일 때만 소문자로 돌려줍니다. 그 밖(빈 값 · 이메일 · 임의 문자열)은 `null`입니다. */
export function crashUserIdFrom(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim().toLowerCase();
  return uuidShape.test(id) ? id : null;
}

function hostModule(): Partial<CrashReportingModule> | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  return (NativeModules as Record<string, unknown>)[crashReportingModuleName] as
    | Partial<CrashReportingModule>
    | undefined;
}

/**
 * 로그인(세션 저장)이면 ID를, 로그아웃 · 계정 삭제면 `null`을 넘깁니다. 호스트를 불렀으면 `true`입니다.
 * UUID 꼴이 아닌 ID는 넘기지 않고 지웁니다 — 앞 사용자의 ID가 남지 않게 합니다. 던지지 않습니다.
 */
export function setCrashUser(userId: string | null): boolean {
  const host = hostModule();
  const id = crashUserIdFrom(userId);
  try {
    if (id !== null && typeof host?.setUser === "function") {
      host.setUser(id);
      return true;
    }
    if (typeof host?.clearUser === "function") {
      host.clearUser();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
