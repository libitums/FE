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
    hoursLeft: (hours) => `${String(hours)} jam lagi`,
    hourProgress: (left, total) => `${String(left)} dari ${String(total)} jam`,
    activeMessage: "Mulai pelajaran apa pun tanpa tiket.",
    endingMessage: "Setelah itu, pelajaran memakai tiket lagi.\nSemua progresmu tetap tersimpan.",
    manage: "Kelola langganan",
    keep: "Tetap tanpa batas",
    date: (d) => `${String(d.day)} ${monthsId[d.month - 1] ?? ""} ${String(d.year)}`,
    shortDate: (d) => `${String(d.day)} ${monthsId[d.month - 1] ?? ""}`,
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
  getMore: "Dapatkan 1 tiket",
  getMoreLabel: (price) => `Dapatkan 1 tiket seharga ${String(price)} koin`,
  moreNotice: {
    bought: "1 tiket ditambahkan.",
    short: (more) => `Koin tidak cukup. Kamu butuh ${String(more)} lagi.`,
    full: "Tiketmu sudah penuh.",
    signIn: "Masuk untuk memakai koin.",
    failed: "Gagal mendapatkan tiket. Coba lagi.",
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
