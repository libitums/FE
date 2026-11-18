// 롤플레이 턴 로그를 서버로 보내는 접점의 계약입니다(ADR-0161). 타입만 둡니다.

import type { AppVersion } from "./app-version";
import type { RoleplayTurnLogEntry } from "../screens/roleplay-story/roleplay-story.contract";

export type LogRoleplayTurnsPath = "/rest/v1/rpc/log_roleplay_turns";

/** 한 판(끝까지 마쳤거나 중간에 나간 한 번)의 기록입니다. */
export type RoleplayTurnLogSubmission = {
  readonly episodeId: string;
  readonly log: readonly RoleplayTurnLogEntry[];
  /** 호스트가 알려 준 앱 버전입니다. `null`이면 보내지 않습니다(플랫폼을 알 수 없습니다). */
  readonly appVersion: AppVersion | null;
};

/** 서버 함수 `log_roleplay_turns(p_batch)`가 받는 한 줄입니다. 키는 서버 검증과 글자까지 같습니다. */
export type RoleplayTurnLogRow = {
  readonly turnIndex: number;
  readonly attempt: number;
  readonly outcome: "heard" | "unavailable" | "skipped";
  readonly reason: "blocked" | "dictation-off" | "failed" | null;
  readonly heard: string | null;
  readonly verdict: "correct" | "incorrect" | null;
  readonly hintShown: boolean;
};

/** 서버 함수가 받는 묶음입니다. 음성 · 이름 · 기기 식별자는 싣지 않습니다. */
export type RoleplayTurnLogBatch = {
  readonly episodeId: string;
  /** 대본형은 `scripted`입니다. 자유 미션(`free`)의 자리는 서버에만 열려 있습니다. */
  readonly mode: "scripted";
  readonly platform: AppVersion["platform"];
  readonly appVersion: string;
  readonly appBuild: number;
  readonly uiLanguage: string;
  /** Lynx가 알려 주는 운영체제 버전입니다. 읽지 못하면 `null`입니다. */
  readonly osVersion: string | null;
  readonly turns: readonly RoleplayTurnLogRow[];
};
