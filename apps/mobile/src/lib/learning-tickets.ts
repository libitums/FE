// 학습 티켓의 원장입니다 — 새 레슨을 열 때 한 장을 쓰고, 쓴 티켓은 먼저 쓴 것부터 한 장씩 한 시간에 다시 찹니다.
// 순수 함수만 있습니다. 시각은 늘 `nowMs`로 받습니다.

export const ticketCapacity = 3;
export const ticketRefillMs = 3_600_000;

export type TicketLedger = {
  readonly refillAtMs: number;
  readonly grantedMs: number;
  readonly grantDay: string;
};

export const fullTicketLedger: TicketLedger = { refillAtMs: 0, grantedMs: 0, grantDay: "" };

export type TicketSlot =
  | { readonly kind: "ready" }
  | { readonly kind: "charging"; readonly progress: number; readonly readyInMs: number }
  | { readonly kind: "waiting"; readonly readyInMs: number };

export type TicketStatus = {
  readonly available: number;
  readonly nextInMs: number | null;
  readonly slots: readonly TicketSlot[];
};

// 원장은 단조 증가하는 세 값입니다 — 두 기기의 원장을 필드마다 큰 값으로 합쳐도 되게 하려는 모양입니다.
//   `refillAtMs` 쓰기로만 늘어나는 「가득 차는 시각」 · `grantedMs` 무료로 받은 시간의 합 · `grantDay` 마지막으로 받은 날.
// 실효 충전 완료 시각은 `refillAtMs − grantedMs`입니다. 쓰는 쪽이 늦추고 받는 쪽이 당깁니다. 합칠 때 쓰기는
// 큰 `refillAtMs`로, 받기는 큰 `grantedMs`로 남아 「남은 장수가 적은 쪽」이 되면서도 받은 1장을 잃지 않습니다.

function deficitAt(ledger: TicketLedger, nowMs: number): number {
  return Math.max(0, ledger.refillAtMs - ledger.grantedMs - nowMs);
}

export function ticketStatusAt(ledger: TicketLedger, nowMs: number): TicketStatus {
  const deficit = deficitAt(ledger, nowMs);
  const charging = Math.min(ticketCapacity, Math.ceil(deficit / ticketRefillMs));
  const available = ticketCapacity - charging;
  if (charging === 0) {
    return { available, nextInMs: null, slots: Array.from({ length: ticketCapacity }, readySlot) };
  }
  const nextInMs = deficit % ticketRefillMs || ticketRefillMs;
  // 왼쪽부터 지금 차는 칸 · 그 뒤에 찰 칸 · 찬 칸입니다(시안 E1).
  const slots: TicketSlot[] = [
    {
      kind: "charging",
      progress: (ticketRefillMs - nextInMs) / ticketRefillMs,
      readyInMs: nextInMs,
    },
  ];
  for (let k = 1; k < charging; k += 1) {
    slots.push({ kind: "waiting", readyInMs: nextInMs + k * ticketRefillMs });
  }
  for (let k = 0; k < available; k += 1) slots.push(readySlot());
  return { available, nextInMs, slots };
}

function readySlot(): TicketSlot {
  return { kind: "ready" };
}

/** 한 장을 씁니다. 남은 장이 없으면 `null`입니다. 다 찬 뒤 오래 지났으면 지금부터 한 시간을 셉니다. */
export function spendTicket(ledger: TicketLedger, nowMs: number): TicketLedger | null {
  if (ticketStatusAt(ledger, nowMs).available === 0) return null;
  const effective = Math.max(ledger.refillAtMs - ledger.grantedMs, nowMs);
  return { ...ledger, refillAtMs: effective + ticketRefillMs + ledger.grantedMs };
}

/** 하루(`day` = 기기 지역 날짜) 한 번 한 장을 바로 채웁니다. 가득이거나 그날 이미 받았으면 `null`입니다. */
export function grantFreeTicket(
  ledger: TicketLedger,
  nowMs: number,
  day: string,
): TicketLedger | null {
  if (ledger.grantDay === day) return null;
  if (ticketStatusAt(ledger, nowMs).available === ticketCapacity) return null;
  return { ...ledger, grantedMs: ledger.grantedMs + ticketRefillMs, grantDay: day };
}

export function mergeTicketLedgers(a: TicketLedger, b: TicketLedger): TicketLedger {
  return {
    refillAtMs: Math.max(a.refillAtMs, b.refillAtMs),
    grantedMs: Math.max(a.grantedMs, b.grantedMs),
    grantDay: a.grantDay >= b.grantDay ? a.grantDay : b.grantDay,
  };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

/** 저장본(검증 전) → 원장. 모양이 틀리면 가득으로 읽습니다 — 진행 스냅숏 전체를 버리지 않습니다. */
export function ticketLedgerFrom(raw: unknown): TicketLedger {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fullTicketLedger;
  const { refillAtMs, grantedMs, grantDay } = raw as Record<string, unknown>;
  if (!isCount(refillAtMs) || !isCount(grantedMs)) return fullTicketLedger;
  if (typeof grantDay !== "string" || (grantDay !== "" && !dayPattern.test(grantDay))) {
    return fullTicketLedger;
  }
  return { refillAtMs, grantedMs, grantDay };
}

/** server에 local을 합쳐도 늘어나는 것이 없으면 true입니다. */
export function ticketLedgerCovers(server: TicketLedger, local: TicketLedger): boolean {
  return (
    server.refillAtMs >= local.refillAtMs &&
    server.grantedMs >= local.grantedMs &&
    server.grantDay >= local.grantDay
  );
}

/** 한 번도 쓰거나 받지 않은 원장입니다 — 스냅숏에 싣지 않습니다. */
export function isFullTicketLedger(ledger: TicketLedger): boolean {
  return ledger.refillAtMs === 0 && ledger.grantedMs === 0 && ledger.grantDay === "";
}

function twoDigits(value: number): string {
  return value < 10 ? `0${String(value)}` : String(value);
}

/** 남은 시간을 올림해 `h:mm:ss`(seconds) · `h:mm`으로 씁니다 — 1초라도 남았으면 0이 아닙니다. */
export function ticketClock(ms: number, seconds: boolean): string {
  const unit = seconds ? 1_000 : 60_000;
  const total = Math.ceil(Math.max(0, ms) / unit);
  if (seconds) {
    const h = Math.floor(total / 3600);
    return `${String(h)}:${twoDigits(Math.floor(total / 60) % 60)}:${twoDigits(total % 60)}`;
  }
  return `${String(Math.floor(total / 60))}:${twoDigits(total % 60)}`;
}
