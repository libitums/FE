// 인도네시아어 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄).
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";

export const ticketsId: TicketsCopy = {
  ticketsLeft: (count) => `${String(count)} tiket tersisa`,
  unlimited: "Tiket tanpa batas",
  unlimitedValue: "∞",
  modal: {
    title: () => "tiket tersisa",
    nextTicketIn: "Tiket berikutnya dalam",
    slotsLabel: (available, total, nextClock) =>
      nextClock === null
        ? `${String(available)} dari ${String(total)} tiket siap`
        : `${String(available)} dari ${String(total)} tiket siap. Tiket berikutnya dalam ${nextClock}`,
    slotReady: "Siap",
    message:
      "Setiap pelajaran memakai satu tiket.\nTiket yang terpakai terisi kembali dalam 1 jam.",
  },
  getMore: "Dapatkan lebih banyak tiket",
  moreNotice: {
    granted: "Cara lain untuk mendapatkan tiket segera hadir. Ini tiket gratis untuk hari ini!",
    notGranted: "Cara lain untuk mendapatkan tiket segera hadir.",
  },
  outOfTickets: {
    title: "Tiket habis",
    untilNext: "hingga tiket berikutnya",
    clockLabel: (clock) => `${clock} hingga tiket berikutnya`,
    message:
      "Kamu butuh tiket untuk memulai pelajaran ini.\nSetiap tiket terisi kembali dalam 1 jam.",
    startLesson: "Mulai pelajaran",
    backToMap: "Kembali ke peta",
  },
  startCost: "Memakai 1 tiket",
};
