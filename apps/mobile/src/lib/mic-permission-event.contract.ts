// 마이크 권한 안내 이벤트입니다(ADR-0206 D6) — PostHog만(Airbridge 매핑 없음). 타입만 둡니다.

import type { MicSheet, MicSurface } from "./mic-permission";

export type MicPermissionEvent =
  /** 사전 안내 · 거부 시트가 섰다. */
  | {
      readonly name: "mic_permission_sheet_shown";
      readonly surface: MicSurface;
      readonly sheet: MicSheet;
    }
  /**
   * 권한 답 — 사전 안내의 Allow 뒤 시스템 창(`prompt`) · 설정에서 돌아와 다시 확인(`settings`, 허용일 때만). 권한을 모르면 내지 않습니다.
   */
  | {
      readonly name: "mic_permission_answered";
      readonly surface: MicSurface;
      readonly result: "allowed" | "denied";
      readonly source: "prompt" | "settings";
    }
  /** 거부 시트의 Open Settings를 눌러 설정 화면을 열었다. */
  | { readonly name: "mic_permission_settings_opened"; readonly surface: MicSurface };

export type MicPermissionEventSink = (event: MicPermissionEvent) => void;

/** 화면이 받는 레슨 맥락 — 레슨 열쇠(말하기 건너뜀이 레슨 동안 이어짐)와 이벤트 받는 곳. 없으면 레슨 밖 · 이벤트 없음입니다. */
export type MicPermissionContext = {
  readonly lessonKey: string | null;
  readonly onEvent?: MicPermissionEventSink;
};
