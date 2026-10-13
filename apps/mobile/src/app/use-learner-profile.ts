// 세션의 학습자 프로필 상태입니다 — 기록 · 치환용 프로필 · 동기화 상태 · 포트 · 물음 여부. 캐시 ↔ 서버는
// learner-profile-sync가, 치환용 프로필 만들기는 learner-profile-gate가 맡습니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import {
  clearGuestLearnerProfile,
  readGuestLearnerProfile,
  writeGuestLearnerProfile,
} from "../lib/learner-profile-cache";
import { learnerProfilePort } from "../lib/learner-profile-data";
import { noLearnerProfilePort, sameLearnerProfile } from "../lib/learner-profile";
import type {
  LearnerProfileCacheEntry,
  LearnerProfilePort,
  LearnerProfilePrompt,
  LearnerProfileRecord,
  LearnerProfileSyncState,
} from "../lib/learner-profile.contract";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { noLearnerProfile } from "./catalog-cover-wiring";
import { learnerFillOf } from "./learner-profile-gate";
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
  readonly learnerPrompt: LearnerProfilePrompt;
  /** 저장하고(로그인 전이면 손님 칸) **다음 렌더의 `learnerFill`과 같은 참조**를 돌려줍니다. */
  readonly saveLearnerProfile: (record: LearnerProfileRecord) => LearnerProfile;
  readonly markLearnerProfileAsked: () => void;
  /** 로그인 전 손님 칸과 거기서 온 담은 값을 지웁니다(온보딩에서 비우고 건너뛴 경우). 로그인 뒤에는 하지 않습니다. */
  readonly clearGuestLearnerProfile: () => void;
  /** 로그인 뒤 부릅니다. 캐시를 곧바로 반영한 다음 서버와 맞춥니다. 던지지 않습니다. */
  readonly syncLearnerProfile: () => Promise<void>;
};

type ProfileState = {
  readonly entry: LearnerProfileCacheEntry | null;
  /** 동기화 객체가 선 뒤인가입니다 — 아니면 기기에만 있는 값(손님 칸)입니다. */
  readonly signedIn: boolean;
  readonly port: LearnerProfilePort;
  readonly fill: LearnerProfile;
};

const firstState: ProfileState = {
  entry: null,
  signedIn: false,
  port: noLearnerProfilePort,
  fill: noLearnerProfile,
};

// 같은 (값, 포트)에는 같은 치환 프로필 참조를 냅니다 - 저장이 돌려준 참조와 다음 렌더의 참조가 같아야 합니다.
let lastFill: {
  record: LearnerProfileRecord;
  port: LearnerProfilePort;
  fill: LearnerProfile;
} | null = null;

function fillFor(record: LearnerProfileRecord | null, port: LearnerProfilePort): LearnerProfile {
  if (record === null) return noLearnerProfile;
  if (lastFill !== null && lastFill.port === port && sameLearnerProfile(lastFill.record, record)) {
    return lastFill.fill;
  }
  const fill = learnerFillOf(record, port);
  lastFill = { record, port, fill };
  return fill;
}

export function useLearnerProfile(): LearnerProfileValues & LearnerProfileControls {
  const [state, setState] = useState<ProfileState>(firstState);
  const [prompt, setPrompt] = useState<LearnerProfilePrompt>("open");
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
        fill: fillFor(entry?.record ?? null, previous.port),
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
        fill: fillFor(entry?.record ?? null, learnerProfilePort),
      };
    });
    return () => sync.current?.dispose();
    // 세션마다 한 번입니다 - 아래 값들은 상태 갱신 함수 안에서만 읽습니다.
  }, []);

  const saveLearnerProfile = (record: LearnerProfileRecord): LearnerProfile => {
    "background only";
    const fill = fillFor(record, port.current);
    const current = sync.current;
    if (current !== null && progressUserId() === current.userId) {
      current.save(record);
      return fill;
    }
    writeGuestLearnerProfile(record);
    setState((previous) => ({
      ...previous,
      entry: { record, sync: "pending" },
      fill: fillFor(record, previous.port),
    }));
    return fill;
  };

  const clearGuest = (): void => {
    "background only";
    if (sync.current !== null) return;
    clearGuestLearnerProfile();
    setState((previous) =>
      previous.signedIn || previous.entry === null
        ? previous
        : { ...previous, entry: null, fill: noLearnerProfile },
    );
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
    learnerFill: state.fill,
    learnerRecord: state.entry?.record ?? null,
    learnerSync: state.signedIn && state.entry !== null ? state.entry.sync : "none",
    learnerPort: state.port,
    learnerPrompt: prompt,
    saveLearnerProfile,
    markLearnerProfileAsked: () => setPrompt("asked"),
    clearGuestLearnerProfile: clearGuest,
    syncLearnerProfile,
  };
}
