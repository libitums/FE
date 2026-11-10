// 인도네시아어 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄).
// 번역 초안 — 원어민 검수 필요(ADR-0093).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";

const monthsId = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const ticketsId: TicketsCopy = {
  ticketsLeft: (count) => `${String(count)} tiket tersisa`,
  unlimited: "Tiket tanpa batas",
  unlimitedLine: "Tanpa tiket · Tanpa batas",
  noTicketNeeded: "Tidak perlu tiket",
  unlimitedModal: {
    guestPass: "PASS TAMU",
    guestMessage: "Semua pelajaran dan roleplay terbuka\ndi akun ini.",
    gotIt: "Mengerti",
    renewsOn: "Diperpanjang pada",
    endsOn: "Berakhir pada",
    memberSince: (date) => `Anggota sejak ${date}`,
    endsDate: (date) => `Berakhir ${date}`,
    daysLeft: (days) => `${String(days)} hari lagi`,
    dayProgress: (left, total) => `${String(left)} dari ${String(total)} hari`,
    activeMessage: "Mulai pelajaran apa pun tanpa tiket.",
    endingMessage: "Setelah itu, pelajaran memakai tiket lagi.\nSemua progresmu tetap tersimpan.",
    manage: "Kelola langganan",
    keep: "Tetap tanpa batas",
    date: (d) => `${String(d.day)} ${monthsId[d.month - 1] ?? ""} ${String(d.year)}`,
    shortDate: (d) => `${String(d.day)} ${monthsId[d.month - 1] ?? ""}`,
    intro: {
      title: "Beralih ke tanpa batas",
      benefitMessages: "Tanpa batas harian untuk pesan obrolan",
      benefitLessons: "Mulai pelajaran apa pun tanpa tiket",
      comingSoon: "Segera hadir",
      comingSoonNote:
        "Paket tanpa batas belum dijual. Kami akan memberi tahu kamu saat sudah tersedia.",
    },
  },
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
