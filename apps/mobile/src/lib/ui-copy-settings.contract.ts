// 설정 화면의 문구 타입입니다 — `ui-copy-sections.contract.ts`가 300줄을 넘지 않게 떼어 두고 그 파일이 다시 내보냅니다.

import type { MobileDataPolicy } from "./download-policy";
import type { DownloadSheetRowStatus } from "../screens/download-sheet/download-sheet-rows";
import type { AccountAction } from "../screens/settings/account-actions.contract";
import type {
  SettingsNavTarget,
  SettingsSessionOptionKey,
} from "../screens/settings/settings.contract";
import type { SessionOptionKey } from "./session-options";

/** 설정 › 다운로드 화면의 문구입니다(ADR-0095 D8). */
export type DownloadSettingsCopy = {
  readonly title: string;
  readonly caption: string;
  readonly mobileDataHeading: string;
  readonly policy: Readonly<Record<MobileDataPolicy, string>>;
  readonly offlineHeading: string;
  readonly downloadAll: string;
  readonly downloadAllCaption: string;
  /** 「모두 받기」를 누른 뒤 — 뒤에서 받는 중이라는 안내입니다. */
  readonly downloadAllStarted: string;
  /** 다 받은 편의 그림 · 음성 크기 — `size`는 `12.3 MB` 꼴입니다. */
  readonly downloaded: (size: string) => string;
  /** 요금제 연결에서 「모두 받기」를 누르면 한 번 더 묻습니다. */
  readonly confirm: {
    readonly title: string;
    readonly description: string;
    readonly download: string;
    readonly cancel: string;
    readonly restDescription: (ordinal: number) => string;
  };
  readonly episodeRow: (ordinal: number, downloaded: number, total: number) => string;
  readonly episodeRowComplete: (ordinal: number) => string;
  readonly downloadRest: (ordinal: number) => string;
};

/** 에피소드를 열 때의 받기 시트(ADR-0095 D6 · D7)입니다. */
export type DownloadSheetCopy = {
  readonly askTitle: (ordinal: number) => string;
  readonly askUnitTitle: (unitLabel: string) => string;
  readonly askDescription: string;
  readonly askUnitDescription: string;
  /** 크기를 알 때 — `size`는 `12.3 MB` 꼴입니다. */
  readonly size: (size: string) => string;
  readonly downloadNow: string;
  readonly onWifi: string;
  /** 행 라벨 · 상태 낱말입니다. */
  readonly rows: {
    readonly common: string;
    readonly allLessons: string;
    readonly otherLessons: string;
    readonly status: Readonly<Record<DownloadSheetRowStatus, string>>;
  };
  readonly askHint: string;
  readonly wifiOnlyTitle: (ordinal: number) => string;
  readonly wifiOnlyUnitTitle: (unitLabel: string) => string;
  readonly wifiOnlyDescription: string;
  readonly mobileDataOnce: string;
  readonly openWithout: string;
  readonly changeSetting: string;
  readonly ok: string;
  readonly offlineTitle: string;
  readonly offlineDescription: (ordinal: number) => string;
  readonly offlineUnitDescription: (unitLabel: string) => string;
  readonly offlineHint: string;
  readonly openAnyway: string;
  readonly close: string;
  /** 모두 끝낸 뒤 새 편을 확인하게 하는 시트(ADR-0095 D9, 시안 5). */
  readonly allCleared: {
    readonly title: string;
    readonly description: string;
    readonly offline: string;
    readonly lastChecked: (daysAgo: number | null) => string;
    readonly checkNow: string;
    readonly later: string;
    readonly autoNote: string;
    readonly offlineHint: string;
  };
};

export type SettingsCopy = {
  readonly title: string;
  readonly group: Readonly<Record<"account" | "learning" | "accountActions", string>>;
  readonly nav: Readonly<Record<SettingsNavTarget, string>>;
  /** 설정 › 다운로드 화면(ADR-0095 D8)입니다. */
  readonly downloads: DownloadSettingsCopy;
  readonly sessionOption: Readonly<Record<SessionOptionKey, string>>;
  /** 설정에 서는 세션 옵션 줄의 설명 줄입니다. */
  readonly sessionOptionDescription: Readonly<Record<SettingsSessionOptionKey, string>>;
  /** 접미 낱말(소문자) — `Auto-play, on` */
  readonly optionState: Readonly<Record<"on" | "off", string>>;
  /** 「Account actions」 묶음의 행 제목 — 키는 `AccountAction` */
  readonly action: Readonly<Record<AccountAction, string>>;
  readonly signOutDialog: {
    readonly title: string;
    readonly confirm: string;
    readonly cancel: string;
  };
  readonly deleteDialog: {
    readonly title: string;
    readonly description: string;
    readonly confirm: string;
    readonly cancel: string;
  };
  /** 삭제 실패 문구 — `network`만 따로, 나머지 넷은 `other` */
  readonly deleteFailure: Readonly<Record<"network" | "other", string>>;
  /** 떠난 뒤 새 세션이 한 번 낭독하는 결과 — 키는 `AccountExit` */
  readonly exitAnnouncement: Readonly<Record<"signed-out" | "deleted", string>>;
  /** 목록 끝 한 줄 — `Version 1.0 (11)`(ADR-0086). */
  readonly version: (name: string, build: number) => string;
};
