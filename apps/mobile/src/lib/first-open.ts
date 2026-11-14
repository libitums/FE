// 기기 첫 실행일입니다(ADR-0029 「D3 목적 구분」) — 처음 부를 때 오늘(기기 시계의 날)을 저장소에 한 번 적고, 이후 그 값을 씁니다.
// 앱에 설치 · 첫 실행 기록이 따로 없어 이 키가 처음입니다. 저장소가 없으면(Explorer · 테스트) 이번 실행의 메모리 값으로 셉니다.
// 계정과 무관한 기기 범위 값입니다 — 로그아웃 · 계정 삭제에도 지우지 않습니다.

import { localDayFrom } from "./progress-api";
import { getItem, isStorageAvailable, setItem } from "./storage";

export const firstOpenDayStorageKey = "libitum.analytics.first-open-day";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

let memoryDay: string | null = null;

/** 두 기기 날(YYYY-MM-DD) 사이의 날 수 — 달력 날짜끼리 빼므로 서머타임에 흔들리지 않습니다. 음수면 0. */
export function daysBetween(fromDay: string, toDay: string): number {
  const utc = (day: string) => {
    const [y, m, d] = day.split("-").map(Number);
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  };
  return Math.max(0, Math.round((utc(toDay) - utc(fromDay)) / DAY_MS));
}

function readStoredDay(): string | null {
  try {
    if (!isStorageAvailable()) return null;
    const raw = getItem(firstOpenDayStorageKey);
    return raw !== null && DAY_PATTERN.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** 첫 실행일을 정합니다 — 이미 적힌 값이 있으면 그것, 없으면 오늘을 적습니다. 진입점이 실행마다 한 번 부릅니다. */
export function noteFirstOpen(now: Date = new Date()): string {
  const stored = readStoredDay();
  if (stored !== null) {
    memoryDay = stored;
    return stored;
  }
  memoryDay ??= localDayFrom(now);
  try {
    if (isStorageAvailable()) setItem(firstOpenDayStorageKey, memoryDay);
  } catch {
    // 적지 못해도 이번 실행은 메모리 값으로 셉니다.
  }
  return memoryDay;
}

/** 첫 실행일부터 지난 날 수입니다(10진 문자열, 첫날 "0"). */
export function daysSinceFirstOpen(now: Date = new Date()): string {
  const first = memoryDay ?? noteFirstOpen(now);
  return String(daysBetween(first, localDayFrom(now)));
}

/** 테스트만 부릅니다 — 메모리 값을 비웁니다. */
export function resetFirstOpenForTests(): void {
  memoryDay = null;
}
