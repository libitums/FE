// 마이크 권한 안내의 결선입니다(ADR-0206) — 말하기 화면이 열릴 때 사전 안내(P1) · 거부(P2) 시트를 정하고, 시스템 창 · 설정 열기 ·
// 앱이 앞으로 돌아왔을 때의 다시 확인 · 「이 레슨의 말하기 건너뜀」을 잇습니다. 시트 그리기는 `MicPermissionSheet`가 합니다.
//
// 권한 조회 · 요청은 호스트를 거쳐 늦게 돌아옵니다 — 화면을 떠난 뒤 돌아온 답은 버립니다.

import { useEffect, useLynxGlobalEventListener, useRef, useState } from "@lynx-js/react";

import { lessonSpeakingSkipOf, skipLessonSpeaking } from "../../lib/lesson-speaking-skip";
import { micAnswerOf, micGateOf, micPrimerSeenKey, micSheetOnOpen } from "../../lib/mic-permission";
import type { MicSheet, MicSurface, SpeakingSkipReason } from "../../lib/mic-permission";
import type {
  MicPermissionContext,
  MicPermissionEvent,
} from "../../lib/mic-permission-event.contract";
import {
  getSpeechStatus,
  openSpeechSettings,
  requestSpeechPermissions,
} from "../../lib/speech-recognition";
import type { SpeechStatus } from "../../lib/speech-recognition";
import { getItem, setItem } from "../../lib/storage";

/** 호스트가 앱이 앞으로 돌아왔을 때(또는 연결이 돌아왔을 때) 보내는 전역 이벤트입니다(ADR-0071). */
const hostForegroundEventName = "contentSyncOpportunity";

export type MicPermissionOptions = {
  readonly surface: MicSurface;
  readonly context?: MicPermissionContext;
  /** 화면이 열릴 때 권한을 확인해 시트를 띄울지 — 레슨 활동은 참, 롤플레이는 시작 단추가 정합니다. */
  readonly checkOnOpen: boolean;
  /** 이 레슨의 말하기를 건너뜀(Not now · Continue without speaking · 이미 건너뛴 레슨) — 화면이 남은 말하기를 넘깁니다. */
  readonly onSkipSpeaking: (reason: SpeakingSkipReason) => void;
  /** 권한이 다시 열림(사전 안내 허용 · 설정에서 돌아옴) — 잠긴 활동을 풉니다. */
  readonly onReopen?: () => void;
  /** 있으면 사전 안내의 Allow 뒤 답을 시트가 정하지 않고 이 함수에 넘깁니다(롤플레이 미리보기 — 자기 안내가 있습니다). */
  readonly onAnswer?: (status: SpeechStatus) => void;
};

export type MicPermission = {
  readonly sheet: MicSheet | null;
  /** 사전 안내의 Allow 뒤 시스템 창의 답을 기다리는 중 — 단추를 잠급니다. */
  readonly waiting: boolean;
  readonly allow: () => void;
  readonly notNow: () => void;
  readonly openSettings: () => void;
  readonly continueWithout: () => void;
  /** 말하기 결선이 권한 거부를 만났다 — 거부 시트를 띄웁니다(이 화면에서 이미 건너뛰기로 했으면 띄우지 않음). */
  readonly onDenied: () => void;
  /** 사전 안내를 본 적 없으면 띄우고 참, 아니면 거짓입니다(롤플레이 시작 단추). */
  readonly openPrime: () => boolean;
};

const primerSeen = (): boolean => getItem(micPrimerSeenKey) === "1";

export function useMicPermission(options: MicPermissionOptions): MicPermission {
  const [sheet, setSheet] = useState<MicSheet | null>(null);
  const [waiting, setWaiting] = useState(false);
  const mounted = useRef(true);
  const shown = useRef<MicSheet | null>(null);
  const declined = useRef(false);
  const latest = useRef(options);
  latest.current = options;

  const emit = (event: MicPermissionEvent): void => latest.current.context?.onEvent?.(event);
  const surface = (): MicSurface => latest.current.surface;
  const lessonKey = (): string | null => latest.current.context?.lessonKey ?? null;
  const update = (next: MicSheet | null): void => {
    shown.current = next;
    setSheet(next);
  };
  const show = (next: MicSheet): void => {
    if (shown.current === next) return;
    if (next === "prime") setItem(micPrimerSeenKey, "1");
    update(next);
    emit({ name: "mic_permission_sheet_shown", surface: surface(), sheet: next });
  };
  const skip = (reason: SpeakingSkipReason): void => {
    update(null);
    const key = lessonKey();
    if (key !== null) skipLessonSpeaking(key, reason);
    latest.current.onSkipSpeaking(reason);
  };

  useEffect(() => {
    mounted.current = true;
    const key = lessonKey();
    const skipped = key === null ? null : lessonSpeakingSkipOf(key);
    if (skipped !== null) {
      latest.current.onSkipSpeaking(skipped);
    } else if (latest.current.checkOnOpen) {
      getSpeechStatus((status) => {
        if (!mounted.current) return;
        const next = micSheetOnOpen(micGateOf(status), primerSeen());
        if (next !== null) show(next);
      });
    }
    return () => {
      mounted.current = false;
    };
    // 화면이 열릴 때 한 번만 봅니다 — 바뀌는 값은 `latest`로 읽습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 설정에서 돌아오면 다시 확인합니다 — 허용이면 시트를 닫고 활동을 풉니다. iOS는 권한을 바꾸면 앱을 새로 띄우기도 합니다.
  useLynxGlobalEventListener(hostForegroundEventName, () => {
    "background only";
    if (shown.current !== "denied") return;
    getSpeechStatus((status) => {
      if (!mounted.current || shown.current !== "denied" || micAnswerOf(status) !== "allowed") {
        return;
      }
      update(null);
      emit({
        name: "mic_permission_answered",
        surface: surface(),
        result: "allowed",
        source: "settings",
      });
      latest.current.onReopen?.();
    });
  });

  const allow = (): void => {
    if (waiting) return;
    setWaiting(true);
    const requested = requestSpeechPermissions((status) => {
      if (!mounted.current) return;
      setWaiting(false);
      const answer = micAnswerOf(status);
      if (answer !== null) {
        emit({
          name: "mic_permission_answered",
          surface: surface(),
          result: answer,
          source: "prompt",
        });
      }
      const delegate = latest.current.onAnswer;
      if (delegate !== undefined) {
        update(null);
        delegate(status);
        return;
      }
      if (micGateOf(status) === "denied") {
        show("denied");
        return;
      }
      update(null);
      if (answer === "allowed") latest.current.onReopen?.();
    });
    if (requested === "unavailable") {
      setWaiting(false);
      update(null);
    }
  };

  return {
    sheet,
    waiting,
    allow,
    notNow: () => skip("mic:not-now"),
    openSettings: () => {
      emit({ name: "mic_permission_settings_opened", surface: surface() });
      openSpeechSettings();
    },
    continueWithout: () => {
      declined.current = true;
      skip("unavailable:blocked");
    },
    onDenied: () => {
      if (!declined.current) show("denied");
    },
    openPrime: () => {
      if (primerSeen()) return false;
      show("prime");
      return true;
    },
  };
}
