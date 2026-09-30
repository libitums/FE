import { fetchLearningStreak, localDayFrom, recordLearningDays } from "../lib/progress-api";
import type { LocalDay } from "../lib/learning-progress.contract";
import { progressUserId } from "./pending-learning-progress";
import { readPendingLearningDays, writePendingLearningDays } from "./pending-learning-days";

const retryDelays = [1_000, 5_000, 15_000, 30_000, 60_000];

/** 학습한 원래 날짜를 계정별로 보관하고 서버 확인 후에만 지웁니다. */
export function createLearningDaySync(
  userId: string,
  apply: (streak: number, celebrate: boolean) => void,
) {
  "background only";
  let pending = readPendingLearningDays(userId);
  let disposed = false;
  let running: Promise<void> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryAttempt = 0;
  let celebrateDay: LocalDay | null = null;
  const isCurrent = () => !disposed && progressUserId() === userId;
  const persist = () => writePendingLearningDays(userId, pending);

  async function run(): Promise<boolean> {
    if (!isCurrent()) return false;
    let today = localDayFrom(new Date());
    let streak = pending.length === 0 ? await fetchLearningStreak(today) : null;
    while (pending.length > 0 && isCurrent()) {
      // 응답을 기다리는 동안 추가된 날짜는 이번에 보낸 날짜와 구분해 남깁니다.
      persist();
      const sent = pending.slice(0, 64);
      today = localDayFrom(new Date());
      streak = await recordLearningDays(sent, today);
      if (!isCurrent() || streak === null) return false;
      pending = pending.filter((day) => !sent.includes(day));
      persist();
    }
    if (!isCurrent() || streak === null || today !== localDayFrom(new Date())) return false;
    apply(streak, celebrateDay === today);
    celebrateDay = null;
    return true;
  }

  function flush(): Promise<void> {
    if (running !== null) return running;
    if (!isCurrent()) return Promise.resolve();
    clearTimeout(retryTimer);
    let succeeded = false;
    running = run()
      .then((ok) => {
        succeeded = ok;
      })
      .catch(() => undefined)
      .finally(() => {
        running = null;
        if (!isCurrent()) return;
        if (succeeded) {
          retryAttempt = 0;
          if (pending.length === 0) return;
        }
        retryTimer = setTimeout(
          () => {
            void flush();
          },
          retryDelays[Math.min(retryAttempt++, retryDelays.length - 1)],
        );
      });
    return running;
  }

  return {
    flush,
    record(day: LocalDay): Promise<void> {
      if (!isCurrent()) return Promise.resolve();
      if (!pending.includes(day)) pending = [...pending, day].sort();
      celebrateDay = day;
      try {
        persist();
      } catch {
        /* 다음 전송 전에 영속화를 다시 시도합니다. */
      }
      return flush();
    },
    dispose(): void {
      disposed = true;
      clearTimeout(retryTimer);
    },
  };
}
