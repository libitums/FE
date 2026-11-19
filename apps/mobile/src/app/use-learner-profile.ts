// 세션의 학습자 프로필 상태입니다 — 기록 · 치환용 프로필 · 동기화 상태 · 포트. 캐시 ↔ 서버는
// learner-profile-sync가, 치환용 프로필 만들기는 learner-profile-fill이 맡습니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { readGuestLearnerProfile, writeGuestLearnerProfile } from "../lib/learner-profile-cache";
import { learnerProfilePort } from "../lib/learner-profile-data";
import { noLearnerProfilePort, sameLearnerProfile } from "../lib/learner-profile";
import type {
  LearnerProfileCacheEntry,
  LearnerProfilePort,
  LearnerProfileRecord,
  LearnerProfileSyncState,
} from "../lib/learner-profile.contract";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { noLearnerProfile } from "./catalog-cover-wiring";
import { learnerFillOf } from "./learner-profile-fill";
import { createLearnerProfileSync } from "./learner-profile-sync";
import type { LearnerProfileSync } from "./learner-profile-sync";
import { progressUserId } from "./pending-learning-progress";

export type LearnerProfileValues = {
  readonly learnerFill: LearnerProfile;
  readonly learnerRecord: LearnerProfileRecord | null;
  readonly learnerSync: LearnerProfileSyncState;
  readonly learnerPort: LearnerProfilePort;
};

export type LearnerProfileControls = {
  /** 저장하고(로그인 전이면 손님 칸) **다음 렌더의 `learnerFill`과 같은 참조**를 돌려줍니다. */
  readonly saveLearnerProfile: (record: LearnerProfileRecord) => LearnerProfile;
  /** 로그인 뒤 부릅니다. 캐시를 곧바로 반영한 다음 서버와 맞춥니다. 던지지 않습니다. */
  readonly syncLearnerProfile: () => Promise<void>;
};

type ProfileState = {
  readonly entry: LearnerProfileCacheEntry | null;
  /** 동기화 객체가 선 뒤인가입니다 — 아니면 기기에만 있는 값(손님 칸)입니다. */
  readonly signedIn: boolean;
  readonly port: LearnerProfilePort;
};

const firstState: ProfileState = {
  entry: null,
  signedIn: false,
  port: noLearnerProfilePort,
};

// 같은 (값, 포트, 언어)에는 같은 치환 프로필 참조를 냅니다 - 저장이 돌려준 참조와 다음 렌더의 참조가 같아야 합니다.
let lastFill: {
  record: LearnerProfileRecord;
  port: LearnerProfilePort;
  language: string;
  fill: LearnerProfile;
} | null = null;

function fillFor(
  record: LearnerProfileRecord | null,
  port: LearnerProfilePort,
  language: string,
): LearnerProfile {
  if (record === null) return noLearnerProfile;
  if (
    lastFill !== null &&
    lastFill.port === port &&
    lastFill.language === language &&
    sameLearnerProfile(lastFill.record, record)
  ) {
    return lastFill.fill;
  }
  const fill = learnerFillOf(record, port, language);
  lastFill = { record, port, language, fill };
  return fill;
}

/** `language`는 번역 언어(= 화면 언어) — 레슨 번역 줄의 `{나라}`가 그 언어의 나라 이름으로 섭니다(2026-11-19). */
export function useLearnerProfile(language: string): LearnerProfileValues & LearnerProfileControls {
  const [state, setState] = useState<ProfileState>(firstState);
  const languageRef = useRef(language);
  languageRef.current = language;
  const sync = useRef<LearnerProfileSync | null>(null);
  // 포트는 마운트 효과가 백그라운드에서 닫습니다 - 저장이 같은 포트로 치환 프로필을 만들도록 ref에도 둡니다.
  const port = useRef<LearnerProfilePort>(noLearnerProfilePort);

  const applyEntry = (entry: LearnerProfileCacheEntry | null): void => {
    setState((previous) => {
      const same =
        previous.entry === entry ||
        (previous.entry !== null &&
          entry !== null &&
          previous.entry.sync === entry.sync &&
          sameLearnerProfile(previous.entry.record, entry.record));
      if (same && previous.signedIn) return previous;
      return {
        ...previous,
        entry: same ? previous.entry : entry,
        signedIn: true,
      };
    });
  };

  useEffect(() => {
    // 포트는 백그라운드에서만 닫습니다. 로그인 전이면 손님 칸의 값을 곧바로 반영합니다.
    const guest = readGuestLearnerProfile();
    port.current = learnerProfilePort;
    setState((previous) => {
      const entry =
        previous.entry === null && guest !== null
          ? { record: guest, sync: "pending" as const }
          : previous.entry;
      return {
        ...previous,
        entry,
        port: learnerProfilePort,
      };
    });
    return () => sync.current?.dispose();
    // 세션마다 한 번입니다 - 아래 값들은 상태 갱신 함수 안에서만 읽습니다.
  }, []);

  const saveLearnerProfile = (record: LearnerProfileRecord): LearnerProfile => {
    "background only";
    const fill = fillFor(record, port.current, languageRef.current);
    const current = sync.current;
    if (current !== null && progressUserId() === current.userId) {
      current.save(record);
      return fill;
    }
    writeGuestLearnerProfile(record);
    setState((previous) => ({
      ...previous,
      entry: { record, sync: "pending" },
    }));
    return fill;
  };

  const syncLearnerProfile = async (): Promise<void> => {
    "background only";
    const userId = progressUserId();
    if (userId === null) return;
    if (sync.current?.userId !== userId) {
      sync.current?.dispose();
      sync.current = createLearnerProfileSync(userId, applyEntry);
    }
    await sync.current.flush();
  };

  return {
    learnerFill: fillFor(state.entry?.record ?? null, state.port, language),
    learnerRecord: state.entry?.record ?? null,
    learnerSync: state.signedIn && state.entry !== null ? state.entry.sync : "none",
    learnerPort: state.port,
    saveLearnerProfile,
    syncLearnerProfile,
  };
}
