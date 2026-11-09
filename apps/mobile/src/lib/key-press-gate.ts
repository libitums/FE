// 한 누름이 한 입력이 되게 하는 판정입니다(순수, ADR-0112). 키는 손가락이 닿는 순간(touchstart)
// 입력하고, 같은 누름 끝에 오는 tap은 버립니다. touchstart 없이 tap만 오면(스크린리더 활성화 ·
// 이벤트 유실) tap이 입력합니다.
//
// 기록은 키마다 따로 쌓고, 호출마다 낡은 기록을 먼저 버립니다 — 끝 이벤트가 사라져도 기록이 끝없이
// 쌓이거나 오래된 누름이 나중 tap을 막지 않습니다.

// openPressMs는 끝 이벤트가 빠진 기록을 버리는 상한일 뿐입니다(기록이 쌓이지 않게) — 오래 누른 키의 끝 · tap이
// 같은 누름으로 묶이도록 넉넉히 둡니다(review W1). 같은 키를 새로 누르면 앞 누름은 그 자리에서 닫힙니다.
export const KEY_PRESS_GATE = { tapAfterEndMs: 500, openPressMs: 30_000 } as const;

type PressRecord = { readonly startedAt: number; readonly endedAt: number | null };

export type KeyPressGate = {
  readonly presses: Readonly<Record<string, readonly PressRecord[]>>;
};

export const emptyKeyPressGate: KeyPressGate = { presses: {} };

// 시계가 뒤로 가면(기기 시각 조정) 경과를 0으로 봅니다 — 던지지 않고, 기록을 지금 것으로 취급합니다.
const elapsed = (now: number, since: number): number => Math.max(0, now - since);

function isLive(record: PressRecord, now: number): boolean {
  return record.endedAt === null
    ? elapsed(now, record.startedAt) <= KEY_PRESS_GATE.openPressMs
    : elapsed(now, record.endedAt) <= KEY_PRESS_GATE.tapAfterEndMs;
}

function pruned(gate: KeyPressGate, now: number): Record<string, readonly PressRecord[]> {
  const next: Record<string, readonly PressRecord[]> = {};
  for (const [key, records] of Object.entries(gate.presses)) {
    const live = records.filter((record) => isLive(record, now));
    if (live.length > 0) next[key] = live;
  }
  return next;
}

function withRecords(
  presses: Record<string, readonly PressRecord[]>,
  key: string,
  records: readonly PressRecord[],
): KeyPressGate {
  const next = { ...presses };
  if (records.length === 0) delete next[key];
  else next[key] = records;
  return { presses: next };
}

/** 손가락이 닿았다 — 항상 입력하고 그 키에 열린 누름을 하나 쌓습니다. */
export function gateTouchStart(
  gate: KeyPressGate,
  key: string,
  now: number,
): { readonly gate: KeyPressGate; readonly emit: true } {
  const presses = pruned(gate, now);
  // 같은 키의 새 누름은 앞 누름이 끝났다는 뜻입니다 — 끝 이벤트가 빠졌어도 열린 채 남기지 않습니다.
  const closed = (presses[key] ?? []).map((record) =>
    record.endedAt === null ? { ...record, endedAt: now } : record,
  );
  const records = [...closed, { startedAt: now, endedAt: null }];
  return { gate: withRecords(presses, key, records), emit: true };
}

/** 손을 뗐다 · 취소됐다 — 그 키의 가장 오래된 열린 누름에 끝 시각을 적습니다. */
export function gateTouchEnd(gate: KeyPressGate, key: string, now: number): KeyPressGate {
  // 끝 시각을 먼저 적고 그다음 낡은 기록을 버립니다 — 오래 누른 누름이 끝을 적기 전에 버려지지 않습니다(review W1).
  const records = gate.presses[key] ?? [];
  const index = records.findIndex((record) => record.endedAt === null);
  const marked =
    index < 0
      ? gate
      : withRecords(
          { ...gate.presses },
          key,
          records.map((record, at) => (at === index ? { ...record, endedAt: now } : record)),
        );
  return { presses: pruned(marked, now) };
}

/** tap이 왔다 — 같은 누름의 기록이 남아 있으면 그것을 쓰고 버리고, 없으면 입력합니다. */
export function gateTap(
  gate: KeyPressGate,
  key: string,
  now: number,
): { readonly gate: KeyPressGate; readonly emit: boolean } {
  const presses = pruned(gate, now);
  const records = presses[key] ?? [];
  if (records.length === 0) return { gate: withRecords(presses, key, records), emit: true };
  return { gate: withRecords(presses, key, records.slice(1)), emit: false };
}

/** 그 키에 아직 끝나지 않은(창 안의) 누름이 있는가 — 지우기 반복이 계속해도 되는지 봅니다. */
export function hasOpenPress(gate: KeyPressGate, key: string, now: number): boolean {
  return (gate.presses[key] ?? []).some((record) => record.endedAt === null && isLive(record, now));
}
