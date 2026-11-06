// 설정 › 다운로드 화면의 props · 문구 타입입니다(ADR-0095 D8). 구현 · JSX는 두지 않습니다.

import type { DownloadProgressSummary } from "../../app/download-progress";
import type { MobileDataPolicy } from "../../lib/download-policy";

export type { DownloadSettingsCopy } from "../../lib/ui-copy-settings.contract";

// 값 대신 함수를 받습니다 — 저장소 · 연결 종류는 백그라운드 스레드에서만 읽혀서, 화면이 효과(effect) · 탭 처리기 안에서
// 부릅니다(그리기 중에는 읽지 않음).
export type DownloadSettingsScreenProps = {
  /** 저장된 정책 — 화면이 열릴 때 한 번 읽습니다. */
  readonly loadPolicy: () => MobileDataPolicy;
  /** 고르는 즉시 저장합니다. */
  readonly savePolicy: (policy: MobileDataPolicy) => void;
  /** 지금 연결이 요금제 · 데이터 절약인가 — 참이면 「모두 받기」 전에 확인 창을 띄웁니다. 누를 때 읽습니다. */
  readonly isOnMobileData: () => boolean;
  /** 다 받은 편의 그림 · 음성 합(바이트). 목록에 크기가 없으면 `null`이고 줄을 그리지 않습니다. */
  readonly loadDownloadedBytes: () => number | null;
  /** 편별 레슨 집계 + 진행 중인 편 — 화면을 열 때 한 번(효과 안) 읽습니다. */
  readonly loadDownloadProgress: () => DownloadProgressSummary;
  readonly onDownloadAll: () => void;
  /** 「이 편 나머지 받기」 — 진행 중인 편 id. 모바일 데이터면 확인 창 뒤에. */
  readonly onDownloadRestOfCurrent: (episodeId: string) => void;
  readonly onBack: () => void;
};

export type DownloadSettingsTestId =
  | "download-settings-screen"
  | "download-settings-title"
  | "download-settings-episodes"
  | `download-settings-episode-${string}`
  | "download-settings-download-rest"
  | "download-settings-download-all"
  | "download-settings-download-all-started"
  | "download-settings-downloaded"
  | "download-settings-confirm";
