import { loadLearningProgress, saveLearningProgress } from "../lib/progress-api";
import { readCachedProgress, writeCachedProgress } from "./cached-learning-progress";
import {
  emptyJourneyProgress,
  journeyProgressCovers,
  journeyProgressFrom,
  learningProgressSnapshotFrom,
  mergeJourneyProgress,
} from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";
import type { ProgressLoadOutcome, ProgressLocalSnapshot } from "./progress-load.contract";
import {
  clearPendingProgress,
  progressUserId,
  readPendingProgress,
  writePendingProgress,
} from "./pending-learning-progress";
import { localProgressFrom } from "./progress-load";

const jsonFrom = (state: JourneyProgressState) =>
  JSON.stringify(learningProgressSnapshotFrom(state));
const retryDelays = [1_000, 5_000, 15_000, 30_000, 60_000];
const empty: JourneyProgressState = emptyJourneyProgress;

/** 로그인한 한 사용자의 미전송 진행과 재시도를 소유합니다. 렌더 중에는 만들지 않습니다. */
export function createJourneyProgressSync(
  userId: string,
  readLatest: () => JourneyProgressState,
  apply: (next: JourneyProgressState) => void,
  onLoadSettled: (outcome: ProgressLoadOutcome) => void,
) {
  "background only";
  let disposed = false;
  let needsLoad = true;
  let running: Promise<void> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryAttempt = 0;
  let invalidServerSnapshot = false;
  // 기기 것(마지막 확인본 + 미전송)을 서버 응답 전에 먼저 보입니다. 저장본만 있으면 저장 루프는 돌지 않습니다.
  const cached = readCachedProgress(userId);
  let pending = readPendingProgress(userId);
  const local = localProgressFrom(cached, pending);
  if (local !== null) apply(mergeJourneyProgress(readLatest(), local));
  // 마지막으로 저장본에 쓴 내용입니다. 같은 내용은 다시 쓰지 않습니다.
  let cachedJson = cached === null ? null : jsonFrom(cached);
  let loadAttemptOpen = false;
  let observedJson = jsonFrom(readLatest());
  const isCurrent = () => !disposed && progressUserId() === userId;

  function cachedChanged(next: JourneyProgressState): boolean {
    const json = jsonFrom(next);
    if (json === cachedJson) return false;
    cachedJson = json;
    return true;
  }

  function remember(next: JourneyProgressState): void {
    pending = next;
    writePendingProgress(userId, next);
  }

  async function run(): Promise<void> {
    if (!isCurrent()) return;
    if (needsLoad) {
      loadAttemptOpen = true;
      const loaded = await loadLearningProgress();
      if (!isCurrent()) return;
      if (!loaded.ok) {
        loadAttemptOpen = false;
        onLoadSettled("failed");
        if (loaded.invalidResponse) invalidServerSnapshot = true;
        return;
      }
      const server = loaded.raw === null ? empty : journeyProgressFrom(loaded.raw);
      // 알 수 없는 버전·깨진 응답을 빈 진행으로 해석해 서버를 덮어쓰지 않습니다.
      // 같은 응답을 자동으로 되풀이하지 않고, 다음 명시적 동기화나 활동 때 다시 읽습니다.
      if (server === null) {
        invalidServerSnapshot = true;
        loadAttemptOpen = false;
        onLoadSettled("failed");
        return;
      }
      const merged = mergeJourneyProgress(readLatest(), server);
      observedJson = jsonFrom(merged);
      apply(merged);
      needsLoad = false;
      loadAttemptOpen = false;
      onLoadSettled("loaded");
      if (journeyProgressCovers(server, merged)) {
        // 조회만으로 동기화가 끝나면 복구입니다. 저장이 남았으면 성공할 때까지 backoff를 유지합니다.
        // 저장본을 먼저 쓰고 미전송을 지웁니다. 사이에 앱이 죽어도 둘 중 하나는 남습니다.
        retryAttempt = 0;
        pending = null;
        if (cachedChanged(merged)) writeCachedProgress(userId, merged);
        clearPendingProgress(userId);
      } else {
        remember(merged);
      }
    }
    // 요청 하나만 진행합니다. 기다리는 동안 capture가 바꾼 최신 진행은 다음 요청으로 보냅니다.
    while (pending !== null && isCurrent()) {
      const sent = pending;
      const saved = await saveLearningProgress(learningProgressSnapshotFrom(sent));
      if (!isCurrent()) return;
      if (!saved) {
        // 응답만 유실됐을 수도 있으므로 다음 시도에서 서버를 다시 읽고 합칩니다.
        needsLoad = true;
        return;
      }
      retryAttempt = 0;
      if (pending === sent) {
        pending = null;
        if (cachedChanged(sent)) writeCachedProgress(userId, sent);
        clearPendingProgress(userId);
      }
    }
  }

  function flush(): Promise<void> {
    if (running !== null) return running;
    if (!isCurrent()) return Promise.resolve();
    invalidServerSnapshot = false;
    clearTimeout(retryTimer);
    running = run()
      .catch(() => {
        needsLoad = true;
        if (loadAttemptOpen) {
          loadAttemptOpen = false;
          if (isCurrent()) onLoadSettled("failed");
        }
      })
      .finally(() => {
        running = null;
        if (!isCurrent() || invalidServerSnapshot || (!needsLoad && pending === null)) return;
        const delay = retryDelays[Math.min(retryAttempt++, retryDelays.length - 1)];
        retryTimer = setTimeout(() => {
          void flush();
        }, delay);
      });
    return running;
  }

  return {
    userId,
    restoredLocal: (local === null ? "none" : "restored") as ProgressLocalSnapshot,
    isCurrent,
    flush,
    capture(next: JourneyProgressState): void {
      if (!isCurrent()) return;
      const json = jsonFrom(next);
      if (json === observedJson) return;
      observedJson = json;
      // 네트워크 요청보다 먼저 영속화합니다. 실패·종료·로그아웃 때도 남습니다.
      remember(next);
      void flush();
    },
    dispose(): void {
      disposed = true;
      clearTimeout(retryTimer);
    },
  };
}
