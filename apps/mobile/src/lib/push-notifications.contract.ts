// 서버 푸시(ADR-0034)의 앱 쪽 어휘입니다. 호스트 모듈 접점(`push-notifications.ts`) · 기기 등록 요청
// (`push-device.ts`) · 결선(`app/push-wiring.ts`)이 같은 이름을 씁니다. 타입만 둡니다.

/** 알림 권한 상태입니다. `unavailable`은 호스트 모듈이 없는 환경(테스트 · 웹 미리보기)입니다. */
export type PushPermission = "not-determined" | "denied" | "authorized" | "provisional";

/** APNs 서명 환경 또는 Android FCM 전송입니다. 호스트가 답합니다. */
export type PushEnvironment = "sandbox" | "production" | "fcm";

export type PushDevice = { readonly token: string; readonly environment: PushEnvironment };

/** `register`의 결과입니다. 허용이 아니거나 토큰을 못 받으면 `device`가 `null`입니다. */
export type PushRegistration = {
  readonly permission: PushPermission;
  readonly device: PushDevice | null;
};

/** 호스트 모듈 `PushNotificationModule`입니다(iOS · Android). */
export interface PushNotificationModule {
  getStatus(callback: (payload: unknown) => void): void;
  register(callback: (payload: unknown) => void): void;
  takeOpened(callback: (payload: unknown) => void): void;
  openSettings(): void;
}

/** 호스트 응답 → 권한. 모르는 값 · 모양 오류는 `null`입니다. */
export type PushPermissionFrom = (payload: unknown) => PushPermission | null;

/** 호스트 응답 → 등록 결과. 권한을 못 읽으면 `null`, 토큰 · 환경이 틀리면 `device: null`. */
export type PushRegistrationFrom = (payload: unknown) => PushRegistration | null;

/** Supabase RPC 경로입니다. `POST`, `Authorization: Bearer <액세스 토큰>`. */
export type RegisterPushDevicePath = "/rest/v1/rpc/register_push_device";
export type UnregisterPushDevicePath = "/rest/v1/rpc/unregister_push_device";
