// 받기 시트(ADR-0095 D6 · D7, lesson-level-downloads)의 상태 · props 타입입니다. 구현 · JSX는 두지 않습니다.

import type { DownloadSheetUnit } from "../../app/download-gate-target";
import type { DownloadSheetRowId } from "./download-sheet-rows";

export type DownloadSheetTarget =
  /** 편 전체(표지 · 준비 중 카드). `sizeBytes`는 목록 `assets_bytes`, 없으면 null. */
  | { readonly kind: "episode"; readonly ordinal: number; readonly sizeBytes: number | null }
  /** 유닛 하나 — 제목은 맵 노드 이름. 유닛 바이트는 없다. */
  | { readonly kind: "unit"; readonly ordinal: number; readonly unit: DownloadSheetUnit };

export type DownloadSheetState =
  /** 모바일 데이터 · 정책 `ask`. `commonDone`은 공통 묶음을 이미 받았는가(첫 행의 색). */
  | { readonly kind: "ask"; readonly target: DownloadSheetTarget; readonly commonDone: boolean }
  /** 모바일 데이터 · 정책 `wifi-only` — 세 출구. */
  | {
      readonly kind: "wifi-only";
      readonly target: DownloadSheetTarget;
      readonly commonDone: boolean;
    }
  /** 오프라인. 열 수 있는 대상이면 「그냥 열기」가 첫 동작. */
  | {
      readonly kind: "offline";
      readonly target: DownloadSheetTarget;
      readonly canOpenAnyway: boolean;
    };

export type DownloadSheetProps = {
  readonly state: DownloadSheetState;
  /** ask 「지금 받기」 — 대상만 허락 · 받기 · 열기. 정책 저장값을 바꾸지 않는다. */
  readonly onDownloadNow: () => void;
  /** ask 「Wi-Fi에서 받기」 — 닫기만. */
  readonly onWifiLater: () => void;
  /** wifi-only 「이번만 모바일 데이터로」 — 대상만 허락 · 받기 · 열기, 정책 불변. */
  readonly onUseMobileDataOnce: () => void;
  /** wifi-only 「그림 · 소리 없이 열기」 · offline 「그냥 열기」. */
  readonly onOpenAnyway: () => void;
  /** wifi-only 「설정 바꾸기」 — 설정 › 다운로드로. */
  readonly onChangeSetting: () => void;
  readonly onClose: () => void;
};

export type DownloadSheetTestId =
  | "download-sheet"
  | "download-sheet-size"
  | "download-sheet-rows"
  | `download-sheet-row-${DownloadSheetRowId}`
  | "download-sheet-hint";
