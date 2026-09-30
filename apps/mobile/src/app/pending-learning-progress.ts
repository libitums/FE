// 서버에 확인받지 못한 진행만 사용자별로 보관합니다. 로그아웃 시 유지하고 계정 삭제 성공 시 지웁니다.
import { loadAuthSession } from "../lib/auth-session";
import { authUserIdFrom } from "../lib/auth-user-id";
import { getItem, removeItem, setItem } from "../lib/storage";
import { journeyProgressFrom, learningProgressSnapshotFrom } from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";

const keyFor = (userId: string) => `libitum.progress.pending.${userId}`;

export function progressUserId(): string | null {
  "background only";
  const session = loadAuthSession();
  return session === null ? null : authUserIdFrom(session.accessToken);
}

export function readPendingProgress(userId: string): JourneyProgressState | null {
  "background only";
  try {
    return journeyProgressFrom(JSON.parse(getItem(keyFor(userId)) ?? "null"));
  } catch {
    return null;
  }
}

export function writePendingProgress(userId: string, state: JourneyProgressState): void {
  "background only";
  setItem(keyFor(userId), JSON.stringify(learningProgressSnapshotFrom(state)));
}

export function clearPendingProgress(userId: string): void {
  "background only";
  removeItem(keyFor(userId));
}
